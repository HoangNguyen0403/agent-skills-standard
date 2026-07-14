Swift’s concurrency model uses `async` to mark asynchronous functions and `await` when calling them.

```swift
func fetchUsername() async throws -> String {
    let (data, _) = try await URLSession.shared.data(
        from: URL(string: "https://example.com/user")!
    )

    return String(decoding: data, as: UTF8.self)
}

func loadUser() {
    Task {
        do {
            let username = try await fetchUsername()
            print(username)
        } catch is CancellationError {
            print("Operation cancelled")
        } catch {
            print("Request failed:", error)
        }
    }
}
```

An `async` function can suspend without blocking its thread. `await` may only be used inside another `async` context, such as an async function or `Task`.

For independent operations, use `async let` to run them in parallel:

```swift
func loadDashboard() async throws -> (Profile, [Message]) {
    async let profile = fetchProfile()
    async let messages = fetchMessages()

    return try await (profile, messages)
}
```

For a dynamic number of tasks, use `withTaskGroup` or `withThrowingTaskGroup`:

```swift
func fetchAll(ids: [Int]) async throws -> [Profile] {
    try await withThrowingTaskGroup(of: Profile.self) { group in
        for id in ids {
            group.addTask {
                try await fetchProfile(id: id)
            }
        }

        var profiles: [Profile] = []
        for try await profile in group {
            profiles.append(profile)
        }

        return profiles
    }
}
```

Handle cancellation explicitly:

```swift
func processItems(_ items: [Item]) async throws {
    for item in items {
        try Task.checkCancellation()
        await process(item)
    }
}
```

You can also check `Task.isCancelled` in long-running loops. Propagate `CancellationError` unless cancellation is intentionally handled.

Use an `actor` to protect shared mutable state:

```swift
actor ImageCache {
    private var images: [URL: Data] = [:]

    func data(for url: URL) -> Data? {
        images[url]
    }

    func store(_ data: Data, for url: URL) {
        images[url] = data
    }

    nonisolated func cacheDescription() -> String {
        "Image cache"
    }
}
```

Actor-isolated methods are called with `await` from outside the actor:

```swift
let cache = ImageCache()

if let data = await cache.data(for: imageURL) {
    print(data.count)
}
```

Annotate UI views and view models with `@MainActor`:

```swift
@MainActor
final class UserViewModel {
    var username = ""

    func load() async {
        do {
            username = try await fetchUsername()
        } catch is CancellationError {
            return
        } catch {
            print(error)
        }
    }
}
```

For an inline UI update from another context, use:

```swift
await MainActor.run {
    label.text = "Loaded"
}
```

Use `@GlobalActor` when a resource needs a custom global isolation domain:

```swift
@globalActor
actor DatabaseActor {
    static let shared = DatabaseActor()
}
```

Create child work with `Task { ... }`; it inherits the surrounding task’s isolation and priority. Avoid `Task.detached` unless you explicitly need to break context inheritance. Keep synchronous work off `@MainActor`, and perform all UI updates on `@MainActor`.
