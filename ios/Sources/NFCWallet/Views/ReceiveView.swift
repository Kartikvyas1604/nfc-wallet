import SwiftUI
import CoreImage.CIFilterBuiltins

struct ReceiveView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedChain: Chain = .ETH
    @State private var copied = false

    var currentAddress: String {
        selectedChain == .ETH ? appState.ethAddress : appState.solAddress
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "0F0C29").ignoresSafeArea()

                VStack(spacing: 28) {
                    // Chain picker
                    Picker("Chain", selection: $selectedChain) {
                        ForEach(Chain.allCases, id: \.self) { chain in
                            Text(chain.displayName).tag(chain)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // QR Code
                    if let qrImage = generateQR(from: currentAddress) {
                        Image(uiImage: qrImage)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 220, height: 220)
                            .padding(16)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }

                    // Address
                    VStack(spacing: 10) {
                        Text(currentAddress)
                            .font(.system(.footnote, design: .monospaced))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        Button {
                            UIPasteboard.general.string = currentAddress
                            withAnimation { copied = true }
                            Task {
                                try? await Task.sleep(nanoseconds: 2_000_000_000)
                                await MainActor.run { copied = false }
                            }
                        } label: {
                            Label(copied ? "Copied!" : "Copy Address",
                                  systemImage: copied ? "checkmark" : "doc.on.doc")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(copied ? Color.green : Color.purple)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .padding(.horizontal)

                        // Note about USDC
                        if selectedChain == .ETH {
                            Text("Also accepts USDC (ERC-20) at this address")
                                .font(.caption).foregroundStyle(.white.opacity(0.5))
                        } else {
                            Text("Also accepts USDC (SPL) at this address")
                                .font(.caption).foregroundStyle(.white.opacity(0.5))
                        }
                    }

                    Spacer()
                }
                .padding(.top, 20)
            }
            .navigationTitle("Receive")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func generateQR(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let outputImage = filter.outputImage,
              let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
