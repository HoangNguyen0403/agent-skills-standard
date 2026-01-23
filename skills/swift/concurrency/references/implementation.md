# Swift Concurrency Implementation

## async/await Basics

```swift
// ✅ GOOD: Async function
func fetchUser(id: String) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}

// Usage
Task {
    do {
        let user = try await fetchUser(id: "123")
        print(user.name)
    } catch {
        print("Error: \(error)")
    }
}
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
