---
name: swift-concurrency
description: "Implement async/await, Actors, and structured concurrency in Swift. Use when implementing Swift async/await, Actors, or structured concurrency in iOS/macOS. (triggers: **/*.swift, async, await, actor, Task, MainActor)"
---

# Swift Concurrency

## **Priority: P0**

## Write Structured Async Code

- **Async Functions**: Mark with **`async`** and call with **`await`**.
- **`async let`**: Use **`async let`** for parallel execution when multiple tasks are independent.
- **Task Groups**: Use **`withTaskGroup`** or `withThrowingTaskGroup` for spawning a dynamic number of tasks.
- **Error Handling**: Combine with **`throws`**. Always handle `CancellationError`.

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

## Isolate State with Actors

- **Data Isolation**: Use **`actor`** for shared mutable state to avoid data races.
- **`@MainActor`**: Annotate UI classes (Views, ViewModels) with **`@MainActor`** for main thread execution. Use **`MainActor.run { ... }`** for inline UI updates in async blocks.
- **Global Actors**: Use **`@GlobalActor`** for specific thread-bound resources.
- **nonisolated**: Use **`nonisolated`** for methods that don't access actor state to avoid unnecessary hops.

```swift
actor ImageCache {
    private var cache: [URL: UIImage] = [:]

    func image(for url: URL) -> UIImage? { cache[url] }
    func store(_ image: UIImage, for url: URL) { cache[url] = image }

    nonisolated func cacheKey(for url: URL) -> String { url.absoluteString }
}
```

## Manage Task Lifecycle

- **Task Hierarchy**: Inherit isolation by using **`Task { ... }`**.
- **Cancellation**: Explicitly check **`Task.isCancelled`** in long loops. Use **`try Task.checkCancellation()`** for throwing functions.
- **Detached Tasks**: Avoid **`Task.detached`** unless you explicitly want to break context inheritance.

## Anti-Patterns

- **No synchronous work in @MainActor**: Do not block the main thread.
- **No UI updates off @MainActor**: Always dispatch back to main via **`MainActor`**.
- **No ignored cancellation**: Always check and propagate cancellation.

## References

- [async/await & Actors](references/implementation.md)
