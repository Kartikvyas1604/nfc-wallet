// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "NFCWallet",
    platforms: [.iOS(.v16)],
    dependencies: [
        .package(url: "https://github.com/argentlabs/web3.swift", from: "1.6.0"),
        // Pin secp256k1.swift to a version that still exports the "secp256k1" product
        // (web3.swift's Package.swift looks for that name; 0.15+ renamed it to libsecp256k1)
        .package(url: "https://github.com/GigaBitcoin/secp256k1.swift.git", exact: "0.14.0"),
    ],
    targets: [
        .executableTarget(
            name: "NFCWallet",
            dependencies: [
                .product(name: "web3.swift", package: "web3.swift"),
            ],
            path: "Sources/NFCWallet",
            resources: [
                .process("Resources/bip39_english.txt"),
            ]
        ),
    ]
)
