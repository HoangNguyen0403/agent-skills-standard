Assuming Swift 5.5+:

```swift
func fetchUser() async throws -> User {
    let url = URL(string: "https://example.com/user")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

Call an async function from a `Task`:

```swift
Task {
    do {
        let user = try await fetchUser()
        print(user)
    } catch {
        print("Request failed:", error)
    }
}
```

Key rules:

- Mark functions that perform asynchronous work with `async`.
- Use `await` when calling an `async` function.
- Use `throws` and `try` for errors.
- An `async` function cannot be called directly from ordinary synchronous code; start from an existing async context or create a `Task`.
- Run UI updates on the main actor:

```swift
@MainActor
func updateUI() async {
    let user = try? await fetchUser()
    // Update UI safely here
}
```
