---
name: swift-concurrency
description: Implement async/await, Actors, and structured concurrency in Swift. Use when implementing Swift async/await, Actors, or structured concurrency in iOS/macOS.
metadata:
  triggers:
    files:
    - '**/*.swift'
    keywords:
    - async
    - await
    - actor
    - Task
    - MainActor
---
# Swift Concurrency

## **Priority: P0**

## Write Structured Async Code

- **Async Functions**: Mark with **`async`** and call with **`await`**.
- **`async let`**: Use **`async let`** for parallel execution when multiple tasks independent.
- **Task Groups**: Use **`withTaskGroup`** or `withThrowingTaskGroup` for spawning dynamic number of tasks.
- **Error Handling**: Combine with **`throws`**. Always handle `CancellationError`.

See [implementation examples](references/implementation.md) for parallel fetch with `async let` and Task Groups.

## Isolate State with Actors

- **Data Isolation**: Use **`actor`** for shared mutable state to avoid data races.
- **`@MainActor`**: Annotate UI classes (Views, ViewModels) with **`@MainActor`** for main thread execution. Use **`MainActor.run { ... }`** for inline UI updates in async blocks.
- **Global Actors**: Use **`@GlobalActor`** for specific thread-bound resources.
- **nonisolated**: Use **`nonisolated`** for methods that don't access actor state to avoid unnecessary hops.

See [implementation examples](references/implementation.md) for Actor-based state isolation and `nonisolated` methods.

## Manage Task Lifecycle

- **Task Hierarchy**: Inherit isolation by using **`Task { ... }`**.
- **Cancellation**: Explicitly check **`Task.isCancelled`** in long loops. Use **`try Task.checkCancellation()`** for throwing functions.
- **Detached Tasks**: Avoid **`Task.detached`** unless you explicitly want to break context inheritance.

## Anti-Patterns

- **No synchronous work in @MainActor**: not block main thread.
- **No UI updates off @MainActor**: Always dispatch back to main via **`MainActor`**.
- **No ignored cancellation**: Always check and propagate cancellation.

## References

- [async/await & Actors](references/implementation.md)