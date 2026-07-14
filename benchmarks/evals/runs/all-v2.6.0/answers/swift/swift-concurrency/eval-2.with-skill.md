Use an `actor` to isolate shared mutable state. Actor-isolated methods and properties are accessed asynchronously with `await`, preventing data races.

```swift
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func currentValue() -> Int {
        value
    }

    nonisolated func description() -> String {
        "Thread-safe counter"
    }
}

let counter = Counter()

Task {
    await counter.increment()
    let value = await counter.currentValue()
    print(value)
}
```

Key practices:

- Mark asynchronous functions `async` and call them with `await`.
- Use `nonisolated` only for methods that do not access actor state.
- Use `@MainActor` for UI classes and view models:

```swift
@MainActor
final class ViewModel {
    var title = ""
}
```

Use `MainActor.run { ... }` for inline UI updates from asynchronous work:

```swift
let result = await fetchData()

await MainActor.run {
    viewModel.title = result
}
```

Manage task lifetime with structured concurrency:

- Use `Task { ... }` to inherit isolation and cancellation context.
- Use `async let` for independent parallel work.
- Use `withTaskGroup` or `withThrowingTaskGroup` for dynamic task counts.
- Check cancellation in long loops with `Task.isCancelled` or propagate it with `try Task.checkCancellation()`.
- Avoid `Task.detached` unless you intentionally need to break context inheritance.
- Keep synchronous work out of `@MainActor` so the main thread is not blocked.
