Mark a function `async` when it may suspend, and use `await` at each asynchronous call site. If it can throw, mark it `throws` and use `try` as well.

```swift
func loadUser() async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: userURL)
    return try JSONDecoder().decode(User.self, from: data)
}

func refresh() {
    Task {
        do {
            let user = try await loadUser()
            print(user)
        } catch {
            print("Load failed: \(error)")
        }
    }
}
```

An `async` function must be called from another asynchronous context or a task. `await` is a suspension point, not a thread-blocking operation. Keep task lifetimes scoped where possible and check or propagate cancellation for long-running work.

