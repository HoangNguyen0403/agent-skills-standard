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
    - Swift concurrency Task
    - Swift Task
    - MainActor
---
# Swift Concurrency

## **Priority: P0 (CRITICAL)**

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

## Sendable Values

- **Sendability**: Values crossing isolation boundaries must be **`Sendable`**. A `struct` qualifies when all stored properties are `Sendable` — mutable value-typed properties like `var value: Int` are fine because each copy owns them; a stored mutable class instance is shared by every copy and is not automatically `Sendable`. Use **`@unchecked Sendable`** only with internal locking proven in review.
- **Prefer actors** over manual locking for shared mutable state.

## Manage Task Lifecycle

- **`Task { }` is unstructured**: it inherits the enclosing actor isolation, priority and task-local values, but it is **not** a child task. Nothing awaits it, its errors do not propagate to the parent, and **cancelling the parent does not cancel it**.
- **Own the handle**: for work started with `Task { }`, store the `Task` and cancel it explicitly from a lifecycle hook such as `onDisappear` or an explicit teardown call, and cancel the previous handle before starting a replacement. Do not assume `deinit` runs on your actor.
- **Prefer structured work**: `async let` or `withTaskGroup`/`withThrowingTaskGroup` when the work belongs to the current call — those propagate cancellation by construction. Awaiting a `Task`'s `value` is not a substitute: the task's own lifetime and cancellation stay yours.
- **Cancellation**: Explicitly check **`Task.isCancelled`** in long loops. Use **`try Task.checkCancellation()`** for throwing functions. Cancellation is cooperative; cleanup still has to run.
- **Detached Tasks**: Avoid **`Task.detached`** unless you explicitly want to break context inheritance.

## Anti-Patterns

- **No synchronous work in @MainActor**: not block main thread.
- **No UI updates off @MainActor**: Always dispatch back to main via **`MainActor`**.
- **No ignored cancellation**: Always check and propagate cancellation.
- **No fire-and-forget Task**: a dropped handle cannot be cancelled and hides failures — keep it, or use structured concurrency.
- **No assumed Task hierarchy**: `Task { }` is not a child scope; do not rely on parent cancellation to stop it.

## References

- [async/await & Actors](references/implementation.md)