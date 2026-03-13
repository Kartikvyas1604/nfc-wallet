import Foundation
import CryptoKit
import CommonCrypto

// MARK: - CryptoService

enum CryptoService {

    private static let pbkdf2Iterations: Int = 310_000
    private static let keyLength: Int = 32

    // MARK: - Key Derivation (PBKDF2-HMAC-SHA256)

    static func deriveKey(password: String, salt: Data) throws -> SymmetricKey {
        guard let passwordData = password.data(using: .utf8) else {
            throw CryptoError.invalidPassword
        }
        var derivedBytes = [UInt8](repeating: 0, count: keyLength)
        let status: Int32 = passwordData.withUnsafeBytes { pwPtr in
            salt.withUnsafeBytes { saltPtr in
                CCKeyDerivationPBKDF(
                    CCPBKDFAlgorithm(kCCPBKDF2),
                    pwPtr.baseAddress, passwordData.count,
                    saltPtr.baseAddress, salt.count,
                    CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                    UInt32(pbkdf2Iterations),
                    &derivedBytes, keyLength
                )
            }
        }
        guard status == kCCSuccess else { throw CryptoError.keyDerivationFailed(status) }
        return SymmetricKey(data: Data(derivedBytes))
    }

    // MARK: - AES-256-GCM Encryption

    static func encrypt(plaintext: Data, password: String) throws -> EncryptedKeyBundle {
        let salt = randomBytes(count: 16)
        let iv   = randomBytes(count: 12)
        let key  = try deriveKey(password: password, salt: salt)
        let nonce = try AES.GCM.Nonce(data: iv)
        let sealed = try AES.GCM.seal(plaintext, using: key, nonce: nonce)
        return EncryptedKeyBundle(ciphertext: sealed.ciphertext, iv: iv, tag: sealed.tag, salt: salt)
    }

    // MARK: - AES-256-GCM Decryption

    static func decrypt(bundle: EncryptedKeyBundle, password: String) throws -> Data {
        let key   = try deriveKey(password: password, salt: bundle.salt)
        let nonce = try AES.GCM.Nonce(data: bundle.iv)
        let box   = try AES.GCM.SealedBox(nonce: nonce, ciphertext: bundle.ciphertext, tag: bundle.tag)
        return try AES.GCM.open(box, using: key)
    }

    // MARK: - XOR Split / Combine

    static func xorSplit(data: Data) -> (nfcHalf: Data, serverHalf: Data) {
        let nfcHalf    = randomBytes(count: data.count)
        let serverHalf = xor(data, nfcHalf)
        return (nfcHalf, serverHalf)
    }

    static func xorCombine(half1: Data, half2: Data) throws -> Data {
        guard half1.count == half2.count else { throw CryptoError.halfLengthMismatch }
        return xor(half1, half2)
    }

    // MARK: - Helpers

    static func randomBytes(count: Int) -> Data {
        var bytes = [UInt8](repeating: 0, count: count)
        _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        return Data(bytes)
    }

    private static func xor(_ a: Data, _ b: Data) -> Data {
        Data(zip(a, b).map { $0 ^ $1 })
    }
}

// MARK: - Errors

enum CryptoError: LocalizedError {
    case invalidPassword
    case keyDerivationFailed(Int32)
    case halfLengthMismatch

    var errorDescription: String? {
        switch self {
        case .invalidPassword:            return "Invalid password encoding"
        case .keyDerivationFailed(let s): return "Key derivation failed (status \(s))"
        case .halfLengthMismatch:         return "Key halves have different lengths"
        }
    }
}
