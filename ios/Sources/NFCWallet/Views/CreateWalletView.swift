import SwiftUI

/// Multi-step flow:
///   Step 1 — Generate wallets + show mnemonic
///   Step 2 — Set wallet password (used for key encryption)
///   Step 3 — Write NFC card
struct CreateWalletView: View {
    @EnvironmentObject var appState: AppState
    @State private var step: SetupStep = .generating
    @State private var mnemonic: String = ""
    @State private var ethAddress: String = ""
    @State private var solAddress: String = ""
    @State private var ethSplit: KeySplit?
    @State private var solSplit: KeySplit?
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    @State private var mnemonicConfirmed = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var nfcWriteChain: Chain = .ETH   // write ETH card first, then SOL

    enum SetupStep: Int, CaseIterable {
        case generating, showMnemonic, setPassword, writeNFC, done
    }

    var body: some View {
        ZStack {
            Color(hex: "0F0C29").ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress bar
                HStack(spacing: 6) {
                    ForEach(0..<4) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(i < step.rawValue ? Color.purple : Color.white.opacity(0.2))
                            .frame(height: 4)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)

                Spacer()

                switch step {
                case .generating:
                    generatingView
                case .showMnemonic:
                    mnemonicView
                case .setPassword:
                    passwordView
                case .writeNFC:
                    nfcWriteView
                case .done:
                    doneView
                }

                Spacer()
            }
        }
        .task {
            if step == .generating { await generateWallets() }
        }
    }

    // MARK: - Step: Generating

    var generatingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.white)
            Text("Generating your wallets…")
                .foregroundStyle(.white)
                .font(.headline)
            if let error = errorMessage {
                Text(error)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                Button("Retry") {
                    errorMessage = nil
                    Task { await generateWallets() }
                }
                .foregroundStyle(.white.opacity(0.7))
            }
        }
    }

    // MARK: - Step: Show Mnemonic

    var mnemonicView: some View {
        VStack(spacing: 24) {
            Image(systemName: "key.fill")
                .font(.system(size: 40))
                .foregroundStyle(.yellow)

            Text("Your Recovery Phrase")
                .font(.title2.bold())
                .foregroundStyle(.white)

            Text("Write these 12 words down in order. This is the ONLY way to recover your wallet. Never share them.")
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            // 3×4 word grid
            let words = mnemonic.components(separatedBy: " ")
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 10) {
                ForEach(Array(words.enumerated()), id: \.offset) { i, word in
                    HStack {
                        Text("\(i+1).")
                            .foregroundStyle(.white.opacity(0.5))
                            .font(.caption.monospacedDigit())
                        Text(word)
                            .foregroundStyle(.white)
                            .font(.system(.body, design: .monospaced))
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal)

            Toggle("I've written down my recovery phrase", isOn: $mnemonicConfirmed)
                .toggleStyle(CheckboxToggleStyle())
                .padding(.horizontal)

            Button("Continue") { step = .setPassword }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(!mnemonicConfirmed)
                .padding(.horizontal)
        }
    }

    // MARK: - Step: Set Password

    var passwordView: some View {
        VStack(spacing: 24) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 40))
                .foregroundStyle(.purple)

            Text("Set Wallet Password")
                .font(.title2.bold())
                .foregroundStyle(.white)

            Text("This password encrypts your private keys. It is required to approve every payment. Choose a strong password — it cannot be recovered.")
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            VStack(spacing: 12) {
                SecureField("Wallet Password (min 10 chars)", text: $password)
                    .textFieldStyle(WalletTextFieldStyle())
                SecureField("Confirm Password", text: $confirmPassword)
                    .textFieldStyle(WalletTextFieldStyle())
            }
            .padding(.horizontal)

            if let error = errorMessage {
                Text(error).foregroundStyle(.red).font(.caption)
            }

            let canEncrypt = !isLoading && password.count >= 8 && !confirmPassword.isEmpty
            Button("Encrypt & Prepare Keys") {
                encryptKeys()
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(!canEncrypt)
            .opacity(canEncrypt ? 1 : 0.4)
            .padding(.horizontal)

            if !confirmPassword.isEmpty && password.count < 8 {
                Text("Password must be at least 8 characters (\(password.count)/8)")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.6))
            }

            if isLoading { ProgressView().tint(.white) }
        }
    }

    // MARK: - Step: Write NFC

    var nfcWriteView: some View {
        VStack(spacing: 24) {
            Image(systemName: "wave.3.right")
                .font(.system(size: 50))
                .foregroundStyle(.cyan)

            Text("Program NFC Card")
                .font(.title2.bold())
                .foregroundStyle(.white)

            Text("Now writing the **\(nfcWriteChain.displayName)** key half to your NFC card.\nHold your NFC card against the top of your iPhone.")
                .font(.body)
                .foregroundStyle(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            if let error = errorMessage {
                Text(error).foregroundStyle(.red).font(.caption)
            }

            Button("Tap to Write NFC Card") {
                writeNFCCard()
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(isLoading)
            .padding(.horizontal)

            if isLoading { ProgressView().tint(.white) }
        }
    }

    // MARK: - Step: Done

    var doneView: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(.green)

            Text("Wallet Ready!")
                .font(.title.bold())
                .foregroundStyle(.white)

            VStack(alignment: .leading, spacing: 10) {
                AddressRow(chain: "ETH", address: ethAddress)
                AddressRow(chain: "SOL", address: solAddress)
            }
            .padding(.horizontal)

            Button("Open Wallet") {
                appState.saveAddresses(eth: ethAddress, sol: solAddress)
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.horizontal)
        }
    }

    // MARK: - Logic

    private func generateWallets() async {
        do {
            // Run off main actor — PBKDF2 + secp256k1 key derivation is CPU-heavy
            let (eth, sol, mnemonicPhrase) = try await Task.detached(priority: .userInitiated) {
                try WalletService.generateWallets()
            }.value
            mnemonic = mnemonicPhrase
            ethAddress = eth.publicAddress
            solAddress = sol.publicAddress
            step = .showMnemonic
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func encryptKeys() {
        guard password == confirmPassword else {
            errorMessage = "Passwords do not match"
            return
        }
        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            return
        }
        isLoading = true
        errorMessage = nil
        let capturedMnemonic = mnemonic
        let capturedPassword = password
        let capturedEthAddress = ethAddress
        let capturedSolAddress = solAddress
        Task {
            do {
                // Run CPU-heavy work off main thread
                let (ethSplitResult, solSplitResult) = try await Task.detached(priority: .userInitiated) {
                    let seed = try BIP39.mnemonicToSeed(capturedMnemonic)
                    let ethPrivKey = try SLIP10.derivePrivateKey(seed: seed, path: "m/44'/60'/0'/0/0", curve: .secp256k1)
                    let solPrivKey = try SLIP10.derivePrivateKey(seed: seed, path: "m/44'/501'/0'/0'", curve: .ed25519)

                    let ethWallet = GeneratedWallet(chain: .ETH, publicAddress: capturedEthAddress, privateKeyBytes: ethPrivKey, mnemonic: capturedMnemonic)
                    let solWallet = GeneratedWallet(chain: .SOL, publicAddress: capturedSolAddress, privateKeyBytes: solPrivKey, mnemonic: capturedMnemonic)

                    let eth = try WalletService.splitKey(wallet: ethWallet, password: capturedPassword)
                    let sol = try WalletService.splitKey(wallet: solWallet, password: capturedPassword)
                    return (eth, sol)
                }.value

                // Network upload (async, fine on any executor)
                try await NetworkService.shared.storeKeyHalf(split: ethSplitResult)
                try await NetworkService.shared.storeKeyHalf(split: solSplitResult)

                self.ethSplit = ethSplitResult
                self.solSplit = solSplitResult
                self.nfcWriteChain = .ETH
                self.isLoading = false
                self.step = .writeNFC
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func writeNFCCard() {
        guard let split = nfcWriteChain == .ETH ? ethSplit : solSplit else { return }
        isLoading = true
        errorMessage = nil

        let payload = NFCCardPayload(
            walletId: split.walletId,
            chain: split.chain.rawValue,
            nfcHalf: split.nfcHalf.hexString,
            publicAddress: split.publicAddress
        )

        NFCService.shared.writeKeyHalf(payload) { result in
            Task { @MainActor in
                switch result {
                case .success:
                    isLoading = false
                    if nfcWriteChain == .ETH {
                        // Write SOL card next
                        nfcWriteChain = .SOL
                    } else {
                        step = .done
                    }
                case .failure(let error):
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Sub-components

struct AddressRow: View {
    let chain: String
    let address: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(chain).font(.caption.bold()).foregroundStyle(.white.opacity(0.6))
            Text(address)
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.white)
                .lineLimit(1)
                .truncationMode(.middle)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct CheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button(action: { configuration.isOn.toggle() }) {
            HStack {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .foregroundStyle(configuration.isOn ? .purple : .white.opacity(0.5))
                configuration.label.foregroundStyle(.white.opacity(0.8)).font(.footnote)
            }
        }
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .padding()
            .background(configuration.isPressed ? Color.purple.opacity(0.7) : Color.purple)
            .foregroundStyle(.white)
            .fontWeight(.semibold)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .opacity(configuration.isPressed ? 0.9 : 1)
    }
}
