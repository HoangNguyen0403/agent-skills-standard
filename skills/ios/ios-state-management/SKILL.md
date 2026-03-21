---
name: ios-state-management
description: 'Standards for Combine, Observation, and Reactive Programming. Use when managing state with Combine, @Observable, or reactive patterns in iOS. (triggers: **/*.swift, Observable, @Published, PassthroughSubject, @Observable, @Namespace)'
---

# iOS State Management Standards

## **Priority: P0**

## Implementation Guidelines

### Combine (Reactive States)

- **Publishers**: Use **`@Published`** for standard state in ViewModels. Use **`PassthroughSubject`** for one-time navigation or alert events.
- **Memory Management**: Store subscriptions in a **`Set<AnyCancellable>`**. Use **`.store(in: &cancellables)`** to prevent memory leaks and ensure they are cleared on deinit.
- **Operators**: Use specific operators like **`.debounce`**, **`.filter`**, **`.map`**, and **`.flatMap`** to handle complex input streams.
- **Schedulers**: Always ensure UI property updates occur on the main thread using **`@MainActor`** or **`.receive(on: DispatchQueue.main)`**.

### Observation Framework (iOS 17+)

- **`@Observable`**: Use the **`@Observable`** macro for modern, high-performance observation in **SwiftUI**.
- **State Properties**: In SwiftUI views, use **`@Bindable`** for two-way bindings with `@Observable` objects.
- **Namespaces**: Use **`@Namespace`** for match-geometry animations and coordinate space tracking.

### Unidirectional Data Flow (UDF)

- **Input/Output**: ViewModels should expose an **`Input`** enum (events) and **`Output`** struct (state) to enforce a clear data direction.
- **ViewState**: Prefer a single, exhaustive **`ViewState`** enum (e.g., `.loading`, `.success(data)`, `.error(failure)`).

## Anti-Patterns

- **No uncleared subscriptions**: Always use .store(in: &cancellables).
- **No UI updates on background**: Use .receive(on: .main).
- **No manual objectWillChange**: Use @Published or @Observable.

## References

- [Combine & Observation Setup](references/implementation.md)
