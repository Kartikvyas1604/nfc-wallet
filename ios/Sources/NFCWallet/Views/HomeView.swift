import SwiftUI

struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            BalanceView()
                .tabItem {
                    Label("Wallet", systemImage: "creditcard.fill")
                }
                .tag(0)

            ReceiveView()
                .tabItem {
                    Label("Receive", systemImage: "arrow.down.circle.fill")
                }
                .tag(1)

            SendPaymentView()
                .tabItem {
                    Label("Pay", systemImage: "wave.3.right.circle.fill")
                }
                .tag(2)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(3)
        }
        .tint(.purple)
    }
}

// MARK: - BalanceView

struct BalanceView: View {
    @EnvironmentObject var appState: AppState
    @State private var ethBalance: String = "—"
    @State private var solBalance: String = "—"
    @State private var usdcBalance: String = "—"
    @State private var isRefreshing = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "0F0C29").ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // Total card
                        VStack(spacing: 8) {
                            Text("Total Balance").font(.caption).foregroundStyle(.white.opacity(0.6))
                            Text("$—").font(.system(size: 42, weight: .bold)).foregroundStyle(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(28)
                        .background(LinearGradient(colors: [Color(hex: "302B63"), Color(hex: "24243e")],
                                                   startPoint: .topLeading, endPoint: .bottomTrailing))
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .padding(.horizontal)

                        // Token rows
                        VStack(spacing: 12) {
                            TokenRow(symbol: "ETH",  name: "Ethereum",  balance: ethBalance,  color: .blue)
                            TokenRow(symbol: "SOL",  name: "Solana",    balance: solBalance,  color: .purple)
                            TokenRow(symbol: "USDC", name: "USD Coin",  balance: usdcBalance, color: .cyan)
                        }
                        .padding(.horizontal)

                        // Addresses
                        VStack(spacing: 10) {
                            Text("Your Addresses").font(.caption.bold()).foregroundStyle(.white.opacity(0.5))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal)
                            AddressRow(chain: "ETH", address: appState.ethAddress)
                                .padding(.horizontal)
                            AddressRow(chain: "SOL", address: appState.solAddress)
                                .padding(.horizontal)
                        }
                    }
                    .padding(.top, 20)
                }
                .refreshable { await refreshBalances() }
            }
            .navigationTitle("NFC Wallet")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func refreshBalances() async {
        // TODO: fetch balances from Infura/Solana RPC
        // ethBalance = formatted ETH balance
        // solBalance = formatted SOL balance
        // usdcBalance = sum of USDC on both chains
    }
}

struct TokenRow: View {
    let symbol: String
    let name: String
    let balance: String
    let color: Color

    var body: some View {
        HStack {
            Circle()
                .fill(color.opacity(0.2))
                .frame(width: 44, height: 44)
                .overlay(Text(String(symbol.prefix(1))).fontWeight(.bold).foregroundStyle(color))

            VStack(alignment: .leading, spacing: 2) {
                Text(symbol).fontWeight(.semibold).foregroundStyle(.white)
                Text(name).font(.caption).foregroundStyle(.white.opacity(0.5))
            }
            Spacer()
            Text(balance).foregroundStyle(.white).fontWeight(.medium)
        }
        .padding(16)
        .background(.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - SettingsView

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @State private var showLogoutConfirm = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "0F0C29").ignoresSafeArea()
                List {
                    Section {
                        HStack {
                            Text("Ethereum Address")
                            Spacer()
                            Text(appState.ethAddress.prefix(8) + "…")
                                .foregroundStyle(.secondary)
                                .font(.system(.caption, design: .monospaced))
                        }
                        HStack {
                            Text("Solana Address")
                            Spacer()
                            Text(appState.solAddress.prefix(8) + "…")
                                .foregroundStyle(.secondary)
                                .font(.system(.caption, design: .monospaced))
                        }
                    } header: { Text("Wallets") }

                    Section {
                        Button("Sign Out", role: .destructive) { showLogoutConfirm = true }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Settings")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .confirmationDialog("Sign out?", isPresented: $showLogoutConfirm) {
            Button("Sign Out", role: .destructive) { appState.logout() }
        }
    }
}
