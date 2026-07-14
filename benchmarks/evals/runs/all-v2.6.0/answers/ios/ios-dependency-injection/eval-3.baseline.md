A simple quick-start pattern for iOS dependency injection is constructor injection.

Example:

```swift
protocol APIClient {
    func fetchUser() async throws -> User
}

final class LiveAPIClient: APIClient {
    func fetchUser() async throws -> User {
        User(name: "Taylor")
    }
}

final class UserViewModel: ObservableObject {
    private let apiClient: APIClient

    @Published var user: User?

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    @MainActor
    func load() async {
        user = try? await apiClient.fetchUser()
    }
}
```

Usage:

```swift
let viewModel = UserViewModel(apiClient: LiveAPIClient())
```

Why this is useful:

- Keeps `UserViewModel` independent from concrete networking code
- Makes testing easier by injecting a mock `APIClient`
- Keeps object creation explicit and easy to follow

In tests, you can swap in a fake:

```swift
final class MockAPIClient: APIClient {
    func fetchUser() async throws -> User {
        User(name: "Test User")
    }
}
```

