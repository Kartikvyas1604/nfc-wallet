import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if !appState.isLoggedIn {
                OnboardingView()
            } else if !appState.hasWallet {
                CreateWalletView()
            } else {
                HomeView()
            }
        }
        .animation(.easeInOut, value: appState.isLoggedIn)
        .animation(.easeInOut, value: appState.hasWallet)
    }
}
