import Foundation
import CoreNFC

// MARK: - NFCService

/// Handles reading from and writing to NFC NDEF tags (e.g. NTAG215/216).
///
/// Write flow (wallet setup):
///   1. Call writeKeyHalf(_:completion:) — user taps card
///   2. Payload is JSON-encoded NFCCardPayload written as a URI record
///
/// Read flow (payment):
///   1. Call readKeyHalf(completion:) — user taps card
///   2. Returns decoded NFCCardPayload
@MainActor
final class NFCService: NSObject, ObservableObject {

    @Published var statusMessage: String = ""
    @Published var isScanning: Bool = false

    private var writeSession: NFCNDEFReaderSession?
    private var readSession: NFCNDEFReaderSession?

    private var pendingPayload: NFCCardPayload?
    private var writeCompletion: ((Result<Void, NFCError>) -> Void)?
    private var readCompletion: ((Result<NFCCardPayload, NFCError>) -> Void)?

    static let shared = NFCService()
    private override init() { super.init() }

    // MARK: - Write

    /// Writes the NFC half of the key split to an NDEF tag.
    func writeKeyHalf(_ payload: NFCCardPayload, completion: @escaping (Result<Void, NFCError>) -> Void) {
        guard NFCNDEFReaderSession.readingAvailable else {
            completion(.failure(.notAvailable))
            return
        }
        pendingPayload = payload
        writeCompletion = completion
        isScanning = true
        statusMessage = "Hold your NFC card near the top of the phone…"
        writeSession = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: false)
        writeSession?.alertMessage = "Hold your NFC wallet card near the top of the phone to program it."
        writeSession?.begin()
    }

    // MARK: - Read

    /// Reads the NFC half of the key split from an NDEF tag.
    func readKeyHalf(completion: @escaping (Result<NFCCardPayload, NFCError>) -> Void) {
        guard NFCNDEFReaderSession.readingAvailable else {
            completion(.failure(.notAvailable))
            return
        }
        readCompletion = completion
        isScanning = true
        statusMessage = "Tap NFC card to the phone to pay…"
        readSession = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: true)
        readSession?.alertMessage = "Hold your NFC wallet card near the top of the phone to pay."
        readSession?.begin()
    }

    // MARK: - Helpers

    private func makeNDEFMessage(from payload: NFCCardPayload) throws -> NFCNDEFMessage {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        let jsonData = try encoder.encode(payload)

        // Store as a custom external type record: "nfcwallet.app:keydata"
        let typeData = "nfcwallet.app:keydata".data(using: .utf8)!
        let record = NFCNDEFPayload(
            format: .nfcExternal,
            type: typeData,
            identifier: Data(),
            payload: jsonData
        )
        return NFCNDEFMessage(records: [record])
    }

    private func parseNDEFMessage(_ message: NFCNDEFMessage) throws -> NFCCardPayload {
        guard let record = message.records.first else { throw NFCError.emptyTag }
        let decoder = JSONDecoder()
        return try decoder.decode(NFCCardPayload.self, from: record.payload)
    }
}

// MARK: - NFCNDEFReaderSessionDelegate

extension NFCService: NFCNDEFReaderSessionDelegate {

    nonisolated func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        // Used during read-only sessions
        Task { @MainActor in
            guard let message = messages.first else { return }
            do {
                let payload = try parseNDEFMessage(message)
                isScanning = false
                readCompletion?(.success(payload))
                readCompletion = nil
            } catch {
                session.invalidate(errorMessage: "Could not read NFC card data.")
                isScanning = false
                readCompletion?(.failure(.parseError(error)))
                readCompletion = nil
            }
        }
    }

    nonisolated func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [NFCNDEFTag]) {
        guard let tag = tags.first else { return }
        session.connect(to: tag) { [weak self] error in
            guard let self else { return }
            if let error {
                session.invalidate(errorMessage: "Connection failed: \(error.localizedDescription)")
                Task { @MainActor in
                    self.isScanning = false
                    self.writeCompletion?(.failure(.connectionFailed(error)))
                    self.writeCompletion = nil
                }
                return
            }

            tag.queryNDEFStatus { status, capacity, error in
                if let error {
                    session.invalidate(errorMessage: "Tag status error: \(error.localizedDescription)")
                    Task { @MainActor in
                        self.isScanning = false
                        self.writeCompletion?(.failure(.connectionFailed(error)))
                        self.writeCompletion = nil
                    }
                    return
                }

                switch status {
                case .notSupported:
                    session.invalidate(errorMessage: "This NFC tag is not supported.")
                    Task { @MainActor in
                        self.isScanning = false
                        self.writeCompletion?(.failure(.tagNotSupported))
                        self.writeCompletion = nil
                    }

                case .readOnly:
                    session.invalidate(errorMessage: "This NFC tag is read-only.")
                    Task { @MainActor in
                        self.isScanning = false
                        self.writeCompletion?(.failure(.tagReadOnly))
                        self.writeCompletion = nil
                    }

                case .readWrite:
                    Task { @MainActor in
                        guard let payload = self.pendingPayload else { return }
                        do {
                            let message = try self.makeNDEFMessage(from: payload)
                            tag.writeNDEF(message) { writeError in
                                if let writeError {
                                    session.invalidate(errorMessage: "Write failed: \(writeError.localizedDescription)")
                                    Task { @MainActor in
                                        self.isScanning = false
                                        self.writeCompletion?(.failure(.writeFailed(writeError)))
                                        self.writeCompletion = nil
                                    }
                                } else {
                                    session.alertMessage = "NFC card programmed successfully!"
                                    session.invalidate()
                                    Task { @MainActor in
                                        self.isScanning = false
                                        self.pendingPayload = nil
                                        self.writeCompletion?(.success(()))
                                        self.writeCompletion = nil
                                    }
                                }
                            }
                        } catch {
                            session.invalidate(errorMessage: "Encoding error.")
                            self.isScanning = false
                            self.writeCompletion?(.failure(.encodingFailed(error)))
                            self.writeCompletion = nil
                        }
                    }

                @unknown default:
                    session.invalidate(errorMessage: "Unknown tag status.")
                }
            }
        }
    }

    nonisolated func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        let nfcError = error as? NFCReaderError
        // User cancelled — not a real error
        if nfcError?.code == .readerSessionInvalidationErrorUserCanceled { return }
        Task { @MainActor in
            isScanning = false
            let wrapped = NFCError.sessionInvalidated(error)
            writeCompletion?(.failure(wrapped))
            writeCompletion = nil
            readCompletion?(.failure(wrapped))
            readCompletion = nil
        }
    }
}

// MARK: - NFCError

enum NFCError: LocalizedError {
    case notAvailable
    case emptyTag
    case tagNotSupported
    case tagReadOnly
    case connectionFailed(Error)
    case writeFailed(Error)
    case encodingFailed(Error)
    case parseError(Error)
    case sessionInvalidated(Error)

    var errorDescription: String? {
        switch self {
        case .notAvailable:          return "NFC is not available on this device"
        case .emptyTag:              return "NFC tag is empty"
        case .tagNotSupported:       return "NFC tag type not supported"
        case .tagReadOnly:           return "NFC tag is read-only"
        case .connectionFailed(let e): return "NFC connection failed: \(e.localizedDescription)"
        case .writeFailed(let e):    return "NFC write failed: \(e.localizedDescription)"
        case .encodingFailed(let e): return "NFC encoding failed: \(e.localizedDescription)"
        case .parseError(let e):     return "NFC data parse error: \(e.localizedDescription)"
        case .sessionInvalidated(let e): return "NFC session ended: \(e.localizedDescription)"
        }
    }
}
