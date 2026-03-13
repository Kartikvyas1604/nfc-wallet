import Foundation

// MARK: - NetworkService

/// Communicates with the NFC Wallet backend.
actor NetworkService {

    static let shared = NetworkService()
    private init() {}

    // Change to your actual server URL
    private let baseURL = URL(string: "http://localhost:3001")!

    private var authToken: String? {
        get { UserDefaults.standard.string(forKey: "authToken") }
        set { UserDefaults.standard.set(newValue, forKey: "authToken") }
    }

    // MARK: - Auth

    struct AuthResponse: Codable {
        let token: String
        let user: UserInfo
        struct UserInfo: Codable { let id: String; let email: String }
    }

    func register(email: String, password: String) async throws -> AuthResponse {
        let body = ["email": email, "password": password]
        let response: AuthResponse = try await post(path: "/auth/register", body: body, requiresAuth: false)
        authToken = response.token
        return response
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = ["email": email, "password": password]
        let response: AuthResponse = try await post(path: "/auth/login", body: body, requiresAuth: false)
        authToken = response.token
        return response
    }

    func logout() {
        authToken = nil
    }

    var isLoggedIn: Bool { authToken != nil }

    // MARK: - Wallet

    struct StoreKeyHalfRequest: Encodable {
        let chain: String
        let walletId: String
        let serverKeyHalf: String   // hex
        let salt: String            // hex
        let iv: String              // hex
        let tag: String             // hex
        let publicAddress: String
    }

    struct StoreKeyHalfResponse: Decodable {
        let success: Bool
    }

    /// Sends the server key half to the backend.
    func storeKeyHalf(split: KeySplit) async throws {
        let body = StoreKeyHalfRequest(
            chain: split.chain.rawValue,
            walletId: split.walletId,
            serverKeyHalf: split.serverHalf.hexString,
            salt: split.bundle.salt.hexString,
            iv: split.bundle.iv.hexString,
            tag: split.bundle.tag.hexString,
            publicAddress: split.publicAddress
        )
        let _: StoreKeyHalfResponse = try await post(path: "/wallet/store-key-half", body: body)
    }

    /// Fetches the server key half for a given walletId (from the NFC card scan).
    func fetchServerKeyHalf(walletId: String) async throws -> ServerKeyHalfResponse {
        try await get(path: "/wallet/key-half/\(walletId)")
    }

    struct MyWalletsResponse: Decodable {
        let wallets: [WalletRecord]
        struct WalletRecord: Decodable {
            let chain: String
            let walletId: String
            let publicAddress: String
        }
    }

    func fetchMyWallets() async throws -> MyWalletsResponse {
        try await get(path: "/wallet/my-wallets")
    }

    // MARK: - Generic HTTP

    private func post<Body: Encodable, Response: Decodable>(
        path: String,
        body: Body,
        requiresAuth: Bool = true
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if requiresAuth, let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(body)
        return try await perform(request)
    }

    private func get<Response: Decodable>(path: String) async throws -> Response {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await perform(request)
    }

    private func perform<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw NetworkError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "HTTP \(http.statusCode)"
            throw NetworkError.serverError(http.statusCode, msg)
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}

// MARK: - NetworkError

enum NetworkError: LocalizedError {
    case invalidResponse
    case serverError(Int, String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:         return "Invalid server response"
        case .serverError(let c, let m): return "Server error \(c): \(m)"
        }
    }
}
