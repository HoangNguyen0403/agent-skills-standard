# iOS Networking Implementation

## Native async/await URLSession

```swift
struct APIClient {
    private let session = URLSession.shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    func fetchItems<T: Codable>(path: String) async throws -> T {
        var components = URLComponents(string: "https://api.example.com")!
        components.path = path

        guard let url = components.url else { throw URLError(.badURL) }

        // POSITIVE: Native async task
        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        return try decoder.decode(T.self, from: data)
    }
}
```

## Alamofire Security & Interceptor

```swift
import Alamofire

class AuthInterceptor: RequestInterceptor {
    func adapt(_ urlRequest: URLRequest, for session: Session, completion: @escaping (Result<URLRequest, Error>) -> Void) {
        var urlRequest = urlRequest
        if let token = Keychain.get("access_token") {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        completion(.success(urlRequest))
    }

    func retry(_ request: Request, for session: Session, dueTo error: Error, completion: @escaping (RetryResult) -> Void) {
        if let response = request.task?.response as? HTTPURLResponse, response.statusCode == 401 {
            // Logic for token refresh...
            completion(.retry)
        } else {
            completion(.doNotRetry)
        }
    }
}
```
