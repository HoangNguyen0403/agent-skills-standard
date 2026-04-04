---
name: ios-state-management
description: "Implement reactive state with Combine, Observation framework, and UDF patterns. Use when implementing state management with Combine, @Observable, or reactive patterns in iOS. (triggers: **/*.swift, Observable, @Published, PassthroughSubject, @Observable, @Namespace)"
---

# iOS State Management

## **Priority: P0**

## Implementation Workflow

1. **Choose observation approach** — Use `@Observable` (iOS 17+) for modern SwiftUI; `Combine` with `@Published` for UIKit or broader compatibility.
2. **Expose state clearly** — Use UDF pattern: ViewModel exposes `Input` enum (events) and `Output` struct (state).
3. **Manage subscriptions** — Store Combine subscriptions in `Set<AnyCancellable>` with `.store(in: &cancellables)`.
4. **Dispatch to main thread** — Use `@MainActor` or `.receive(on: DispatchQueue.main)` for UI updates.
5. **Use exhaustive ViewState** — Prefer a single `ViewState` enum (`.loading`, `.success(data)`, `.error(failure)`).

See [Combine and Observation framework examples](references/implementation.md)

## Anti-Patterns

- ❌ Uncleared subscriptions — always use `.store(in: &cancellables)`
- ❌ UI updates on background thread — use `.receive(on: .main)` or `@MainActor`
- ❌ Manual `objectWillChange.send()` — use `@Published` or `@Observable` instead

## References

- [Combine & Observation Setup](references/implementation.md)
