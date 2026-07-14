Use `async let` when multiple independent async operations can run concurrently:

```swift
struct Dashboard {
    let profile: Profile
    let notifications: [Notification]
}

func loadDashboard() async throws -> Dashboard {
    async let profile = fetchProfile()
    async let notifications = fetchNotifications()

    // Await results when they are needed.
    return try await Dashboard(
        profile: profile,
        notifications: notifications
    )
}
```

The two fetches start in parallel. `async let` values are automatically awaited before the enclosing scope exits.

Handle cancellation in long-running work:

```swift
func fetchData() async throws -> Data {
    try Task.checkCancellation()
    return try await networkRequest()
}
```

Use `withTaskGroup` or `withThrowingTaskGroup` when the number of tasks is dynamic:

```swift
func fetchAll(_ ids: [Int]) async throws -> [Data] {
    try await withThrowingTaskGroup(of: Data.self) { group in
        for id in ids {
            group.addTask {
                try await fetch(id: id)
            }
        }

        var results: [Data] = []
        for try await result in group {
            results.append(result)
        }
        return results
    }
}
```

Use `async let` for a fixed, small set of independent tasks; use task groups for dynamically created tasks. Avoid `Task.detached` unless you intentionally need to break task context inheritance.
