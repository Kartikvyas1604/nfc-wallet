import Foundation
import CryptoKit
import CommonCrypto
import BigInt
import secp256k1
import web3

// MARK: - WalletService

final class WalletService: ObservableObject {

    // MARK: - Wallet Generation

    static func generateWallets() throws -> (eth: GeneratedWallet, sol: GeneratedWallet, mnemonic: String) {
        let entropy = CryptoService.randomBytes(count: 16)
        let mnemonic = try BIP39.entropyToMnemonic(entropy)
        let seed = try BIP39.mnemonicToSeed(mnemonic)
        let ethWallet = try generateETHWallet(seed: seed, mnemonic: mnemonic)
        let solWallet = try generateSOLWallet(seed: seed, mnemonic: mnemonic)
        return (ethWallet, solWallet, mnemonic)
    }

    static func restoreWallets(mnemonic: String) throws -> (eth: GeneratedWallet, sol: GeneratedWallet) {
        let seed = try BIP39.mnemonicToSeed(mnemonic)
        return (try generateETHWallet(seed: seed, mnemonic: mnemonic),
                try generateSOLWallet(seed: seed, mnemonic: mnemonic))
    }

    // MARK: - Private generators

    private static func generateETHWallet(seed: Data, mnemonic: String) throws -> GeneratedWallet {
        let privateKey = try SLIP10.derivePrivateKey(seed: seed, path: "m/44'/60'/0'/0/0", curve: .secp256k1)
        let publicKey  = try KeyUtil.generatePublicKey(from: privateKey)
        let address    = KeyUtil.generateAddress(from: publicKey).asString()
        return GeneratedWallet(chain: .ETH, publicAddress: address, privateKeyBytes: privateKey, mnemonic: mnemonic)
    }

    private static func generateSOLWallet(seed: Data, mnemonic: String) throws -> GeneratedWallet {
        let privateKey = try SLIP10.derivePrivateKey(seed: seed, path: "m/44'/501'/0'/0'", curve: .ed25519)
        let solKey = try Curve25519.Signing.PrivateKey(rawRepresentation: privateKey)
        let address = Base58.encode(solKey.publicKey.rawRepresentation)
        return GeneratedWallet(chain: .SOL, publicAddress: address, privateKeyBytes: privateKey, mnemonic: mnemonic)
    }

    // MARK: - Key Splitting

    static func splitKey(wallet: GeneratedWallet, password: String) throws -> KeySplit {
        let bundle = try CryptoService.encrypt(plaintext: wallet.privateKeyBytes, password: password)
        let (nfcHalf, serverHalf) = CryptoService.xorSplit(data: bundle.ciphertext)
        return KeySplit(
            nfcHalf: nfcHalf,
            serverHalf: serverHalf,
            bundle: bundle,
            walletId: UUID().uuidString,
            publicAddress: wallet.publicAddress,
            chain: wallet.chain
        )
    }

    // MARK: - Key Reconstruction

    static func reconstructPrivateKey(
        nfcHalf: Data,
        serverHalf: Data,
        serverBundle: ServerKeyHalfResponse,
        password: String
    ) throws -> Data {
        let ciphertext = try CryptoService.xorCombine(half1: nfcHalf, half2: serverHalf)
        guard
            let iv   = Data(hexString: serverBundle.iv),
            let tag  = Data(hexString: serverBundle.tag),
            let salt = Data(hexString: serverBundle.salt)
        else { throw WalletError.invalidHexData }
        let bundle = EncryptedKeyBundle(ciphertext: ciphertext, iv: iv, tag: tag, salt: salt)
        return try CryptoService.decrypt(bundle: bundle, password: password)
    }
}

// MARK: - BIP39

enum BIP39 {

    static func entropyToMnemonic(_ entropy: Data) throws -> String {
        let words = try loadWordlist()

        // Checksum: first (entropyBits/32) bits of SHA256(entropy)
        let hashData = Data(SHA256.hash(data: entropy))
        let checksumByte: UInt8 = hashData[0]
        let checksumBits = entropy.count * 8 / 32   // 4 for 128-bit entropy

        // Build bit array from entropy
        var bits = [Int]()
        for byte in entropy {
            for i in (0..<8).reversed() { bits.append(Int((byte >> i) & 1)) }
        }
        // Append the top checksumBits from the first hash byte
        for i in stride(from: 7, through: 8 - checksumBits, by: -1) {
            bits.append(Int((checksumByte >> i) & 1))
        }

        var mnemonicWords = [String]()
        var i = 0
        while i + 11 <= bits.count {
            let index = bits[i..<i+11].reduce(0) { ($0 << 1) | $1 }
            mnemonicWords.append(words[index])
            i += 11
        }
        return mnemonicWords.joined(separator: " ")
    }

    static func mnemonicToSeed(_ mnemonic: String, passphrase: String = "") throws -> Data {
        guard let passwordData = mnemonic.data(using: .utf8),
              let saltData = ("mnemonic" + passphrase).data(using: .utf8) else {
            throw WalletError.invalidMnemonic
        }
        var derivedKey = [UInt8](repeating: 0, count: 64)
        let status = passwordData.withUnsafeBytes { pwPtr in
            saltData.withUnsafeBytes { saltPtr in
                CCKeyDerivationPBKDF(
                    CCPBKDFAlgorithm(kCCPBKDF2),
                    pwPtr.baseAddress, passwordData.count,
                    saltPtr.baseAddress, saltData.count,
                    CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA512),
                    2048,
                    &derivedKey, 64
                )
            }
        }
        guard status == kCCSuccess else { throw WalletError.seedDerivationFailed }
        return Data(derivedKey)
    }

    private static func loadWordlist() throws -> [String] {
        // Try Bundle.main first, then all loaded bundles (covers both Simulator and device)
        let url: URL? = Bundle.main.url(forResource: "bip39_english", withExtension: "txt")
            ?? Bundle.allBundles.compactMap { $0.url(forResource: "bip39_english", withExtension: "txt") }.first

        guard let url, let text = try? String(contentsOf: url, encoding: .utf8) else {
            throw WalletError.wordlistNotFound
        }
        let words = text.components(separatedBy: CharacterSet.newlines).filter { !$0.isEmpty }
        guard words.count == 2048 else { throw WalletError.invalidWordlist }
        return words
    }
}

// MARK: - SLIP-0010

enum SLIP10 {
    enum Curve {
        case secp256k1, ed25519
        var hmacKey: String { self == .ed25519 ? "ed25519 seed" : "Bitcoin seed" }
    }

    static func derivePrivateKey(seed: Data, path: String, curve: Curve) throws -> Data {
        var node = try masterKey(seed: seed, curve: curve)
        for component in path.components(separatedBy: "/").dropFirst() {
            let hardened = component.hasSuffix("'")
            let idx = UInt32(hardened ? String(component.dropLast()) : component) ?? { fatalError() }()
            let childIdx: UInt32 = hardened ? idx + 0x80000000 : idx
            node = try childKey(parent: node, index: childIdx, curve: curve)
        }
        return node.key
    }

    private static func masterKey(seed: Data, curve: Curve) throws -> (key: Data, chain: Data) {
        let hmacKey = SymmetricKey(data: curve.hmacKey.data(using: .utf8)!)
        let mac = Data(HMAC<SHA512>.authenticationCode(for: seed, using: hmacKey))
        return (mac.prefix(32), mac.suffix(32))
    }

    private static func childKey(parent: (key: Data, chain: Data), index: UInt32, curve: Curve) throws -> (key: Data, chain: Data) {
        var data = Data()
        if index >= 0x80000000 {
            // Hardened: 0x00 || parent_privkey || index
            data.append(0x00)
            data.append(contentsOf: parent.key)
        } else {
            // Non-hardened (secp256k1 only): compressed_pubkey || index
            guard curve == .secp256k1 else {
                throw WalletError.nonHardenedDerivationNotSupported
            }
            let compressedPub = try secp256k1CompressedPublicKey(from: parent.key)
            data.append(contentsOf: compressedPub)
        }
        data.append(contentsOf: withUnsafeBytes(of: index.bigEndian) { Data($0) })

        let hmacKey = SymmetricKey(data: parent.chain)
        let mac = Data(HMAC<SHA512>.authenticationCode(for: data, using: hmacKey))
        let il = mac.prefix(32)
        let ir = mac.suffix(32)

        // child_privkey = (IL + parent_privkey) mod secp256k1_n
        let n = BigUInt("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", radix: 16)!
        let childInt = (BigUInt(il) + BigUInt(parent.key)) % n
        var childBytes = childInt.serialize()
        // Left-pad to 32 bytes
        while childBytes.count < 32 { childBytes.insert(0, at: 0) }

        data.resetBytes(in: 0..<data.count)
        return (childBytes, ir)
    }

    /// Returns the 33-byte compressed secp256k1 public key for a 32-byte private key.
    private static func secp256k1CompressedPublicKey(from privateKey: Data) throws -> Data {
        guard let ctx = secp256k1_context_create(UInt32(SECP256K1_CONTEXT_SIGN)) else {
            throw WalletError.seedDerivationFailed
        }
        defer { secp256k1_context_destroy(ctx) }

        let privBytes = [UInt8](privateKey)
        let pubKeyPtr = UnsafeMutablePointer<secp256k1_pubkey>.allocate(capacity: 1)
        defer { pubKeyPtr.deallocate() }

        guard privBytes.withUnsafeBufferPointer({ secp256k1_ec_pubkey_create(ctx, pubKeyPtr, $0.baseAddress!) }) == 1 else {
            throw WalletError.seedDerivationFailed
        }

        var outputLen = 33
        var output = [UInt8](repeating: 0, count: 33)
        secp256k1_ec_pubkey_serialize(ctx, &output, &outputLen, pubKeyPtr, UInt32(SECP256K1_EC_COMPRESSED))
        return Data(output)
    }
}

// MARK: - Base58

enum Base58 {
    private static let alphabet = Array("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")

    static func encode(_ data: Data) -> String {
        let bytes = [UInt8](data)
        let leadingZeros = bytes.prefix(while: { $0 == 0 }).count
        var result = [Int]()
        for byte in bytes {
            var carry = Int(byte)
            for i in result.indices.reversed() {
                carry += 256 * result[i]
                result[i] = carry % 58
                carry /= 58
            }
            while carry > 0 { result.insert(carry % 58, at: 0); carry /= 58 }
        }
        return String(repeating: "1", count: leadingZeros) + result.map { alphabet[$0] }.reduce("") { $0 + String($1) }
    }

    static func decode(_ string: String) -> Data? {
        let alphaStr = String(alphabet)
        var result = [UInt8]()
        let zeros = string.prefix(while: { $0 == "1" }).count
        for char in string {
            guard let pos = alphaStr.firstIndex(of: char) else { return nil }
            var carry = alphaStr.distance(from: alphaStr.startIndex, to: pos)
            for i in result.indices.reversed() {
                carry += 58 * Int(result[i])
                result[i] = UInt8(carry & 0xff)
                carry >>= 8
            }
            while carry > 0 { result.insert(UInt8(carry & 0xff), at: 0); carry >>= 8 }
        }
        return Data(Array(repeating: 0, count: zeros) + result)
    }
}

// MARK: - Data hex helpers

extension Data {
    init?(hexString: String) {
        var hex = hexString.hasPrefix("0x") ? String(hexString.dropFirst(2)) : hexString
        guard hex.count % 2 == 0 else { return nil }
        var bytes = [UInt8]()
        var idx = hex.startIndex
        while idx < hex.endIndex {
            let next = hex.index(idx, offsetBy: 2)
            guard let byte = UInt8(hex[idx..<next], radix: 16) else { return nil }
            bytes.append(byte)
            idx = next
        }
        self = Data(bytes)
    }
    var hexString: String { map { String(format: "%02x", $0) }.joined() }
}

// MARK: - Errors

enum WalletError: LocalizedError {
    case wordlistNotFound, invalidWordlist, invalidMnemonic
    case seedDerivationFailed, invalidDerivationPath
    case nonHardenedDerivationNotSupported
    case invalidHexData

    var errorDescription: String? {
        switch self {
        case .wordlistNotFound:  return "BIP39 word list not found in app bundle"
        case .invalidWordlist:   return "BIP39 word list must contain 2048 words"
        case .invalidMnemonic:   return "Invalid mnemonic phrase"
        case .seedDerivationFailed: return "Seed derivation failed"
        case .invalidDerivationPath: return "Invalid HD derivation path"
        case .nonHardenedDerivationNotSupported: return "Only hardened derivation supported"
        case .invalidHexData:    return "Invalid hex-encoded key data"
        }
    }
}
