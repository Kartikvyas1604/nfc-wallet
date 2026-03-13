import SwiftUI
import web3

@main
struct NFCWalletApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

// MARK: - AppState

@MainActor
final class AppState: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var hasWallet: Bool = false
    @Published var ethAddress: String = ""
    @Published var solAddress: String = ""
    @Published var balances: [TokenBalance] = []

    init() {
        // Restore session
        isLoggedIn = UserDefaults.standard.string(forKey: "authToken") != nil
        ethAddress = UserDefaults.standard.string(forKey: "ethAddress") ?? ""
        solAddress = UserDefaults.standard.string(forKey: "solAddress") ?? ""
        hasWallet = !ethAddress.isEmpty
    }

    func saveAddresses(eth: String, sol: String) {
        ethAddress = eth
        solAddress = sol
        hasWallet = true
        UserDefaults.standard.set(eth, forKey: "ethAddress")
        UserDefaults.standard.set(sol, forKey: "solAddress")
    }

    func logout() {
        isLoggedIn = false
        hasWallet = false
        ethAddress = ""
        solAddress = ""
        UserDefaults.standard.removeObject(forKey: "authToken")
        UserDefaults.standard.removeObject(forKey: "ethAddress")
        UserDefaults.standard.removeObject(forKey: "solAddress")
    }
}
