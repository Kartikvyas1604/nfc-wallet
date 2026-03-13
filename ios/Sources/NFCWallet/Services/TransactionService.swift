import Foundation
import CryptoKit
import BigInt
import web3

// MARK: - EphemeralKeyStorage
// A minimal in-memory EthereumSingleKeyStorageProtocol that holds raw key bytes.
// The key is used once to build an EthereumAccount, then this object is discarded.

private final class EphemeralKeyStorage: EthereumSingleKeyStorageProtocol {
    private var keyData: Data

    init(privateKeyBytes: Data) {
        keyData = privateKeyBytes
    }

    func storePrivateKey(key: Data) throws { keyData = key }
    func loadPrivateKey() throws -> Data { keyData }

    deinit {
        keyData.resetBytes(in: 0..<keyData.count)
    }
}

// MARK: - TransactionService

enum TransactionService {

    static let usdcEthAddress = EthereumAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    static let usdcSolMint    = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    static let solRPCURL      = URL(string: "https://api.mainnet-beta.solana.com")!

    // Replace with your Infura project ID
    static let infuraURL = URL(string: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY")!

    // MARK: - ETH (native)

    static func sendETH(
        privateKeyBytes: Data,
        to: String,
        amountWei: BigUInt
    ) async throws -> String {
        let client  = EthereumHttpClient(url: infuraURL, network: .mainnet)
        let storage = EphemeralKeyStorage(privateKeyBytes: privateKeyBytes)
        let account = try EthereumAccount(keyStorage: storage)
        let toAddr  = EthereumAddress(to)

        let nonce    = try await client.eth_getTransactionCount(address: account.address, block: .Latest)
        let gasPrice = try await client.eth_gasPrice()

        let tx = EthereumTransaction(
            from: account.address,
            to: toAddr,
            value: amountWei,
            data: Data(),
            gasPrice: gasPrice,
            gasLimit: BigUInt(21_000)
        )
        return try await client.eth_sendRawTransaction(tx, withAccount: account)
    }

    // MARK: - USDC on ETH (ERC-20 transfer)

    static func sendUSDC_ETH(
        privateKeyBytes: Data,
        to: String,
        amountMicroUSDC: BigUInt       // 6 decimals: 1 USDC = 1_000_000
    ) async throws -> String {
        let client  = EthereumHttpClient(url: infuraURL, network: .mainnet)
        let storage = EphemeralKeyStorage(privateKeyBytes: privateKeyBytes)
        let account = try EthereumAccount(keyStorage: storage)
        let toAddr  = EthereumAddress(to)

        // ABI-encode: transfer(address _to, uint256 _value)
        let function = ERC20Functions.transfer(
            contract: usdcEthAddress,
            from: account.address,
            to: toAddr,
            value: amountMicroUSDC
        )
        let txData = try function.transaction()

        let nonce    = try await client.eth_getTransactionCount(address: account.address, block: .Latest)
        let gasPrice = try await client.eth_gasPrice()

        let tx = EthereumTransaction(
            from: account.address,
            to: usdcEthAddress,
            value: 0,
            data: txData.data ?? Data(),
            gasPrice: gasPrice,
            gasLimit: BigUInt(65_000)
        )
        return try await client.eth_sendRawTransaction(tx, withAccount: account)
    }

    // MARK: - SOL (native)

    static func sendSOL(
        privateKeyBytes: Data,
        to: String,
        lamports: UInt64
    ) async throws -> String {
        let keypair   = try Curve25519.Signing.PrivateKey(rawRepresentation: privateKeyBytes)
        let blockhash = try await SolanaRPC.getRecentBlockhash(rpcURL: solRPCURL)
        let from      = Base58.encode(keypair.publicKey.rawRepresentation)

        var instrData = Data()
        instrData.append(contentsOf: [2, 0, 0, 0])  // SystemProgram.transfer index
        instrData.append(contentsOf: withUnsafeBytes(of: lamports.littleEndian) { Data($0) })

        let txData = try SolanaRPC.buildTransaction(
            from: from, to: to,
            programId: "11111111111111111111111111111111",
            instructionData: instrData,
            recentBlockhash: blockhash,
            signer: keypair
        )
        return try await SolanaRPC.sendTransaction(txData: txData, rpcURL: solRPCURL)
    }

    // MARK: - USDC on SOL (SPL)

    static func sendUSDC_SOL(
        privateKeyBytes _: Data,
        to _: String,
        amountMicroUSDC _: UInt64
    ) async throws -> String {
        // Full SPL token transfer requires deriving associated token accounts.
        // Integrate solana-swift SDK for production — this is a known TODO.
        throw TransactionError.splNotImplemented
    }

    // MARK: - ETH Address from private key (used in WalletService)

    static func ethereumAddress(fromPrivateKey privateKeyBytes: Data) throws -> String {
        let storage = EphemeralKeyStorage(privateKeyBytes: privateKeyBytes)
        let account = try EthereumAccount(keyStorage: storage)
        return account.address.asString()
    }
}

// MARK: - Solana RPC

enum SolanaRPC {

    static func getRecentBlockhash(rpcURL: URL) async throws -> String {
        let body: [String: Any] = [
            "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash",
            "params": [["commitment": "confirmed"]]
        ]
        let resp = try await rpc(url: rpcURL, body: body)
        guard let result = resp["result"] as? [String: Any],
              let value  = result["value"]  as? [String: Any],
              let hash   = value["blockhash"] as? String else {
            throw TransactionError.rpcError("Cannot parse blockhash")
        }
        return hash
    }

    static func sendTransaction(txData: Data, rpcURL: URL) async throws -> String {
        let body: [String: Any] = [
            "jsonrpc": "2.0", "id": 1, "method": "sendTransaction",
            "params": [txData.base64EncodedString(), ["encoding": "base64"]]
        ]
        let resp = try await rpc(url: rpcURL, body: body)
        guard let sig = resp["result"] as? String else {
            if let err = resp["error"] as? [String: Any], let msg = err["message"] as? String {
                throw TransactionError.rpcError(msg)
            }
            throw TransactionError.rpcError("Cannot parse tx signature")
        }
        return sig
    }

    static func buildTransaction(
        from: String, to: String,
        programId: String,
        instructionData: Data,
        recentBlockhash: String,
        signer: Curve25519.Signing.PrivateKey
    ) throws -> Data {
        guard let fromBytes = Base58.decode(from),
              let toBytes   = Base58.decode(to),
              let progBytes = Base58.decode(programId),
              let hashBytes = Base58.decode(recentBlockhash) else {
            throw TransactionError.invalidAddress
        }

        // Minimal Solana legacy transaction message
        var msg = Data()
        msg.append(contentsOf: [0x01, 0x00, 0x01])  // header
        msg.append(0x03)                             // 3 accounts
        msg.append(contentsOf: fromBytes)
        msg.append(contentsOf: toBytes)
        msg.append(contentsOf: progBytes)
        msg.append(contentsOf: hashBytes)            // recent blockhash
        msg.append(0x01)                             // 1 instruction
        msg.append(0x02)                             // program index
        msg.append(0x02)                             // account count
        msg.append(contentsOf: [0x00, 0x01])         // from=0, to=1
        msg.append(UInt8(instructionData.count))
        msg.append(contentsOf: instructionData)

        let sig = try signer.signature(for: msg)
        var tx = Data([0x01])
        tx.append(contentsOf: sig)
        tx.append(contentsOf: msg)
        return tx
    }

    private static func rpc(url: URL, body: [String: Any]) async throws -> [String: Any] {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await URLSession.shared.data(for: req)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw TransactionError.rpcError("Invalid JSON response")
        }
        return json
    }
}

// MARK: - Error

enum TransactionError: LocalizedError {
    case rpcError(String), invalidAddress, splNotImplemented

    var errorDescription: String? {
        switch self {
        case .rpcError(let m):   return "RPC error: \(m)"
        case .invalidAddress:    return "Invalid blockchain address"
        case .splNotImplemented: return "SOL USDC: integrate solana-swift SDK"
        }
    }
}
