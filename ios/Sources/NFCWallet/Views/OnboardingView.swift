import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var appState: AppState
    @State private var showLogin = false
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color(hex: "0F0C29"), Color(hex: "302B63"), Color(hex: "24243e")],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 32) {
                    Spacer()

                    // Logo
                    VStack(spacing: 12) {
                        Image(systemName: "wave.3.right.circle.fill")
                            .resizable()
                            .frame(width: 80, height: 80)
                            .foregroundStyle(.white)
                        Text("NFC Wallet")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        Text("Your keys. Split in two.")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
                    }

                    Spacer()

                    // Form
                    VStack(spacing: 16) {
                        TextField("Email", text: $email)
                            .textFieldStyle(WalletTextFieldStyle())
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)

                        SecureField("Password", text: $password)
                            .textFieldStyle(WalletTextFieldStyle())

                        if let error = errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        Button(action: showLogin ? loginAction : registerAction) {
                            Group {
                                if isLoading {
                                    ProgressView().tint(.black)
                                } else {
                                    Text(showLogin ? "Sign In" : "Create Account")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.white)
                            .foregroundStyle(.black)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty)

                        Button(showLogin ? "Don't have an account? Register" : "Already have an account? Sign In") {
                            withAnimation { showLogin.toggle() }
                            errorMessage = nil
                        }
                        .font(.footnote)
                        .foregroundStyle(.white.opacity(0.7))
                    }
                    .padding(.horizontal, 32)

                    Spacer().frame(height: 40)
                }
            }
        }
    }

    private func registerAction() {
        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            return
        }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                _ = try await NetworkService.shared.register(email: email, password: password)
                await MainActor.run { appState.isLoggedIn = true }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }

    private func loginAction() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                _ = try await NetworkService.shared.login(email: email, password: password)
                await MainActor.run { appState.isLoggedIn = true }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Style helpers

struct WalletTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(.white.opacity(0.12))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(.white.opacity(0.2)))
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
