import SwiftUI
import CryptoKit
import BigInt

/// The full NFC payment flow:
///   1. User taps their NFC card — we read the nfc_half
///   2. We fetch the server_half from backend using walletId
///   3. User enters their wallet password
///   4. We XOR-combine + decrypt → reconstruct private key
///   5. User enters recipient + amount, sign & broadcast
///   6. Private key is zeroed from memory immediately
struct SendPaymentView: View {
    @State private var flowStep: PaymentStep = .idle
    @State private var nfcPayload: NFCCardPayload?
    @State private var serverBundle: ServerKeyHalfResponse?
    @State private var walletPassword: String = ""
    @State private var toAddress: String = ""
    @State private var amountText: String = ""
    @State private var selectedToken: PaymentToken = .eth
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var txResult: String?

    enum PaymentStep {
        case idle, scanNFC, fetchingServer, enterDetails, confirmPassword, signing, success, failed
    }

    enum PaymentToken: String, CaseIterable {
        case eth = "ETH"
        case sol = "SOL"
        case usdc = "USDC"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "0F0C29").ignoresSafeArea()

                VStack(spacing: 24) {
                    switch flowStep {
                    case .idle:         idleView
                    case .scanNFC:      scanningView
                    case .fetchingServer: fetchingView
                    case .enterDetails: detailsView
                    case .confirmPassword: passwordView
                    case .signing:      signingView
                    case .success:      successView
                    case .failed:       failedView
                    }
                }
                .padding()
            }
            .navigationTitle("Pay")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    // MARK: - Step Views

    var idleView: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "wave.3.right.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(.purple)

            Text("NFC Tap to Pay")
                .font(.title2.bold())
                .foregroundStyle(.white)

            Text("Tap your NFC wallet card to the phone to start a payment.")
                .font(.body)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)

            Button("Scan My NFC Card") {
                flowStep = .scanNFC
                startNFCScan()
            }
            .buttonStyle(PrimaryButtonStyle())

            Spacer()
        }
    }

    var scanningView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView()
                .scaleEffect(2)
                .tint(.purple)
            Text("Hold NFC card to phone…")
                .foregroundStyle(.white)
                .font(.headline)
            Spacer()
        }
    }

    var fetchingView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView().scaleEffect(2).tint(.purple)
            Text("Fetching server key half…")
                .foregroundStyle(.white).font(.headline)
            Spacer()
        }
    }

    var detailsView: some View {
        VStack(spacing: 20) {
            HStack {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                Text("NFC card read successfully").foregroundStyle(.white.opacity(0.8))
            }
            .font(.footnote)

            VStack(alignment: .leading, spacing: 8) {
                Text("Send To").font(.caption.bold()).foregroundStyle(.white.opacity(0.5))
                TextField("Recipient address", text: $toAddress)
                    .textFieldStyle(WalletTextFieldStyle())
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Amount").font(.caption.bold()).foregroundStyle(.white.opacity(0.5))
                HStack {
                    TextField("0.00", text: $amountText)
                        .textFieldStyle(WalletTextFieldStyle())
                        .keyboardType(.decimalPad)

                    Picker("Token", selection: $selectedToken) {
                        ForEach(PaymentToken.allCases, id: \.self) {
                            Text($0.rawValue).tag($0)
                        }
                    }
                    .pickerStyle(.menu)
                    .accentColor(.purple)
                    .padding(10)
                    .background(.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            if let error = errorMessage {
                Text(error).foregroundStyle(.red).font(.caption)
            }

            Button("Continue") {
                flowStep = .confirmPassword
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(toAddress.isEmpty || amountText.isEmpty)

            Button("Cancel") { resetFlow() }
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    var passwordView: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.fill").font(.system(size: 40)).foregroundStyle(.yellow)
            Text("Enter Wallet Password")
                .font(.title3.bold()).foregroundStyle(.white)
            Text("Confirm your wallet password to authorise this payment.")
                .font(.footnote).foregroundStyle(.white.opacity(0.7)).multilineTextAlignment(.center)

            SecureField("Wallet Password", text: $walletPassword)
                .textFieldStyle(WalletTextFieldStyle())

            if let error = errorMessage {
                Text(error).foregroundStyle(.red).font(.caption)
            }

            Button("Sign & Send") {
                signAndBroadcast()
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(walletPassword.isEmpty || isLoading)

            Button("Cancel") { resetFlow() }
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    var signingView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView().scaleEffect(2).tint(.purple)
            Text("Signing transaction…").foregroundStyle(.white).font(.headline)
            Spacer()
        }
    }

    var successView: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "checkmark.circle.fill").font(.system(size: 72)).foregroundStyle(.green)
            Text("Payment Sent!").font(.title.bold()).foregroundStyle(.white)
            if let hash = txResult {
                Text("Tx: \(hash.prefix(12))…\(hash.suffix(8))")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.6))
            }
            Button("Done") { resetFlow() }.buttonStyle(PrimaryButtonStyle())
            Spacer()
        }
    }

    var failedView: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "xmark.circle.fill").font(.system(size: 72)).foregroundStyle(.red)
            Text("Payment Failed").font(.title.bold()).foregroundStyle(.white)
            if let error = errorMessage {
                Text(error).foregroundStyle(.red).font(.caption).multilineTextAlignment(.center)
            }
            Button("Try Again") { resetFlow() }.buttonStyle(PrimaryButtonStyle())
            Spacer()
        }
    }

    // MARK: - Logic

    private func startNFCScan() {
        NFCService.shared.readKeyHalf { result in
            Task { @MainActor in
                switch result {
                case .success(let payload):
                    nfcPayload = payload
                    flowStep = .fetchingServer
                    await fetchServerHalf(walletId: payload.walletId)
                case .failure(let error):
                    errorMessage = error.localizedDescription
                    flowStep = .failed
                }
            }
        }
    }

    private func fetchServerHalf(walletId: String) async {
        do {
            let bundle = try await NetworkService.shared.fetchServerKeyHalf(walletId: walletId)
            serverBundle = bundle
            flowStep = .enterDetails
        } catch {
            errorMessage = error.localizedDescription
            flowStep = .failed
        }
    }

    private func signAndBroadcast() {
        guard let payload = nfcPayload, let server = serverBundle else { return }
        guard let nfcHalfData = Data(hexString: payload.nfcHalf),
              let serverHalfData = Data(hexString: server.serverKeyHalf) else {
            errorMessage = "Invalid key data"
            flowStep = .failed
            return
        }

        isLoading = true
        flowStep = .signing
        errorMessage = nil

        Task {
            do {
                // Reconstruct private key
                var privateKeyBytes = try WalletService.reconstructPrivateKey(
                    nfcHalf: nfcHalfData,
                    serverHalf: serverHalfData,
                    serverBundle: server,
                    password: walletPassword
                )

                defer {
                    // Zero the key from memory immediately after use
                    privateKeyBytes.resetBytes(in: 0..<privateKeyBytes.count)
                }

                let chain = Chain(rawValue: payload.chain) ?? .ETH
                let hash = try await broadcast(
                    chain: chain,
                    privateKeyBytes: privateKeyBytes,
                    to: toAddress,
                    amount: amountText,
                    token: selectedToken
                )

                await MainActor.run {
                    txResult = hash
                    isLoading = false
                    flowStep = .success
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                    flowStep = .failed
                }
            }
        }
    }

    private func broadcast(
        chain: Chain,
        privateKeyBytes: Data,
        to: String,
        amount: String,
        token: PaymentToken
    ) async throws -> String {
        guard let amountDecimal = Decimal(string: amount) else {
            throw PaymentError.invalidAmount
        }

        switch (chain, token) {
        case (.ETH, .eth):
            return try await TransactionService.sendETH(
                privateKeyBytes: privateKeyBytes,
                to: to,
                amountWei: ethToWei(amountDecimal)
            )

        case (.ETH, .usdc):
            return try await TransactionService.sendUSDC_ETH(
                privateKeyBytes: privateKeyBytes,
                to: to,
                amountMicroUSDC: usdcToMicro(amountDecimal)
            )

        case (.SOL, .sol):
            return try await TransactionService.sendSOL(
                privateKeyBytes: privateKeyBytes,
                to: to,
                lamports: solToLamports(amountDecimal)
            )

        case (.SOL, .usdc):
            let microUSDC = UInt64((amountDecimal * 1_000_000) as NSDecimalNumber)
            let result = try await TransactionService.sendUSDC_SOL(
                privateKeyBytes: privateKeyBytes,
                to: to,
                amountMicroUSDC: microUSDC
            )
            return result

        default:
            throw PaymentError.chainTokenMismatch
        }
    }

    // MARK: - Amount conversions

    private func ethToWei(_ eth: Decimal) -> BigUInt {
        let wei = eth * Decimal(string: "1000000000000000000")!
        return BigUInt(stringLiteral: "\(wei)")
    }

    private func solToLamports(_ sol: Decimal) -> UInt64 {
        let lamports = sol * 1_000_000_000
        return UInt64(truncating: (lamports as NSDecimalNumber))
    }

    private func usdcToMicro(_ usdc: Decimal) -> BigUInt {
        let micro = usdc * 1_000_000
        return BigUInt(stringLiteral: "\(micro)")
    }

    private func resetFlow() {
        flowStep = .idle
        nfcPayload = nil
        serverBundle = nil
        walletPassword = ""
        toAddress = ""
        amountText = ""
        errorMessage = nil
        txResult = nil
        isLoading = false
    }
}

enum PaymentError: LocalizedError {
    case invalidAmount
    case chainTokenMismatch

    var errorDescription: String? {
        switch self {
        case .invalidAmount:      return "Invalid amount"
        case .chainTokenMismatch: return "Token not supported on this chain"
        }
    }
}
