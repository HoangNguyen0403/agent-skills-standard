# Swift Concurrency Implementation

## async/await Basics

```swift
// ✅ GOOD: Async function
func fetchUser(id: String) async throws -> User {
    guard let url = URL(string: "https://api.example.com/users/\(id)") else {
        throw URLError(.badURL)
    }
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}

// Usage — inside an async context (structured)
let user = try await fetchUser(id: "123")
print(user.name)

// From sync code you must own the Task handle (see "Unstructured Task Ownership")
```

```swift
// ❌ AVOID: Completion handlers (legacy)
func fetchUser(id: String, completion: @escaping (Result<User, Error>) -> Void) {
    // Old pattern
}
```

## Actors for Thread Safety

```swift
// ✅ GOOD: Actor protects state
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func getValue() -> Int {
        return value
    }
}

// Usage (automatically serialized)
let counter = Counter()
await counter.increment()
let value = await counter.getValue()
```

## MainActor for UI

```swift
// ✅ GOOD: MainActor annotation
@MainActor
class ViewModel: ObservableObject {
    @Published var users: [User] = []

    func loadUsers() async {
        do {
            let users = try await api.fetchUsers()
            self.users = users // Safe: already on main thread
        } catch {
            print("Error: \(error)")
        }
    }
}
```

## Task Groups

```swift
// ✅ GOOD: Parallel fetching
func loadAllData() async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self) { group in
        for id in userIDs {
            group.addTask {
                try await fetchUser(id: id)
            }
        }

        var users: [User] = []
        for try await user in group {
            users.append(user)
        }
        return users
    }
}
```

## Cancellation

```swift
// ✅ GOOD: Check cancellation
func processLargeDataset() async throws {
    for item in dataset {
        try Task.checkCancellation() // Throws if cancelled
        await process(item)
    }
}
```

## Parallel Fetch with async let

```swift
// Parallel fetch with async let
func loadDashboard() async throws -> Dashboard {
    async let profile = fetchProfile()
    async let orders = fetchRecentOrders()
    async let notifications = fetchNotifications()

    return try await Dashboard(
        profile: profile,
        orders: orders,
        notifications: notifications
    )
}
```

## Unstructured Task Ownership

`Task { }` inherits isolation, priority and task-locals but has no parent scope. Its cancellation is your responsibility.

```swift
// Snippet fragment from the host project: Item must itself be Sendable for [Item]
// to cross the isolation boundary, and the API is modelled as a Sendable value.
struct Item: Sendable, Identifiable {
    let id: String
}

protocol FeedAPI: Sendable {
    func fetchFeed() async -> [Item]
}

// ✅ GOOD: keep the handle, replace and cancel explicitly
@MainActor
final class FeedViewModel: ObservableObject {
    @Published private(set) var items: [Item] = []
    private let api: FeedAPI
    private var loadTask: Task<Void, Never>?

    init(api: FeedAPI) { self.api = api }

    func reload() {
        loadTask?.cancel()                    // stop the previous run
        loadTask = Task { [weak self] in      // inherits @MainActor isolation
            guard let self else { return }
            let items = await self.api.fetchFeed()   // api is Sendable
            guard !Task.isCancelled else { return }
            self.items = items
        }
    }

    func cancel() {
        loadTask?.cancel()                    // call from onDisappear / navigation teardown
    }
}
```

Do not rely on `deinit` for this cancellation: `deinit` runs outside the main-actor isolation used above, so cancel from the view's lifecycle (`onDisappear`) or an explicit teardown call. `ObservableObject` and the SwiftUI/Combine glue come from the host project.

```swift
// ❌ AVOID: fire-and-forget — no handle, no cancellation, errors disappear
func reload() {
    Task { items = await api.fetchFeed() }
}
```

```swift
// ✅ GOOD: structured — cancellation propagates by construction
func reload() async throws -> [Item] {
    async let items = api.fetchFeed()
    return try await items
}
```

## Actor for Shared State

```swift
actor ImageCache {
    private var cache: [URL: UIImage] = [:]

    func image(for url: URL) -> UIImage? { cache[url] }
    func store(_ image: UIImage, for url: URL) { cache[url] = image }

    nonisolated func cacheKey(for url: URL) -> String { url.absoluteString }
}
```
