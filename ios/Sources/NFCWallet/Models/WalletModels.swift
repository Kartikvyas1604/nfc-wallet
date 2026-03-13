import Foundation

// MARK: - Chain

enum Chain: String, CaseIterable, Codable {
    case ETH
    case SOL

    var displayName: String {
        switch self {
        case .ETH: return "Ethereum"
        case .SOL: return "Solana"
        }
    }

    var symbol: String { rawValue }
    var decimals: Int { self == .ETH ? 18 : 9 }
}

// MARK: - GeneratedWallet

/// Full wallet data produced during wallet creation.
/// The private key MUST be zeroed after key splitting — it must not persist in memory.
struct GeneratedWallet {
    let chain: Chain
    let publicAddress: String
    let privateKeyBytes: Data     // raw private key bytes — zero after use
    let mnemonic: String          // BIP39 mnemonic — shown to user once, never stored
}

// MARK: - EncryptedKeyBundle

/// Result of encrypting the private key with the user's password.
struct EncryptedKeyBundle {
    let ciphertext: Data   // AES-GCM ciphertext (= encrypted private key)
    let iv: Data           // 12-byte nonce
    let tag: Data          // 16-byte authentication tag
    let salt: Data         // 16-byte PBKDF2 salt
}

// MARK: - KeySplit

/// The two halves produced by XOR-splitting the ciphertext.
/// nfcHalf XOR serverHalf == bundle.ciphertext
struct KeySplit {
    let nfcHalf: Data     // written to NFC card
    let serverHalf: Data  // sent to server
    let bundle: EncryptedKeyBundle
    let walletId: String  // UUID stored on NFC card + server for lookup
    let publicAddress: String
    let chain: Chain
}

// MARK: - NFCCardPayload

/// The NDEF payload written to the NFC card (JSON-encoded).
struct NFCCardPayload: Codable {
    let walletId: String    // references the server record
    let chain: String       // "ETH" | "SOL"
    let nfcHalf: String     // hex-encoded nfc half of the encrypted key
    let publicAddress: String
}

// MARK: - ServerKeyHalfResponse

struct ServerKeyHalfResponse: Codable {
    let chain: String
    let serverKeyHalf: String   // hex
    let salt: String            // hex
    let iv: String              // hex
    let tag: String             // hex
    let publicAddress: String
}

// MARK: - TokenBalance

struct TokenBalance: Identifiable {
    let id = UUID()
    let chain: Chain
    let symbol: String          // ETH, SOL, USDC
    let balance: Decimal
    let usdValue: Decimal?
}

// MARK: - PendingTransaction

struct PendingTransaction {
    let chain: Chain
    let toAddress: String
    let amountWei: String       // for ETH (or lamports for SOL)
    let tokenContractAddress: String?   // nil for native, set for USDC ERC-20
}
