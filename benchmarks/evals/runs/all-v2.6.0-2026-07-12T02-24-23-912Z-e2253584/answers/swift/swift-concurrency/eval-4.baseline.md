Use `async let` for a fixed, small set of independent asynchronous operations that should run in parallel. The bindings are child tasks, and their values are awaited before the surrounding scope exits.

```swift
func loadScreen() async throws -> ScreenData {
    async let user = loadUser()
    async let messages = loadMessages()
    return try await ScreenData(user: user, messages: messages)
}
```

The expressions start concurrently, while `try await` waits for each result. Errors and cancellation are propagated through structured concurrency, and unfinished child tasks are awaited or cancelled when the scope ends. Use a task group when the number of child tasks is dynamic.

