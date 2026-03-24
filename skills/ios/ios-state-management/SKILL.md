---
name: ios-state-management
description: "Manage reactive state with Combine, Observation framework, and UDF patterns. Use when implementing state management with Combine, @Observable, or reactive patterns in iOS. (triggers: **/*.swift, Observable, @Published, PassthroughSubject, @Observable, @Namespace)"
---

# iOS State Management

## **Priority: P0**

## Implementation Workflow

1. **Choose observation approach** — Use `@Observable` (iOS 17+) for modern SwiftUI; `Combine` with `@Published` for UIKit or broader compatibility.
2. **Expose state clearly** — Use UDF pattern: ViewModel exposes `Input` enum (events) and `Output` struct (state).
3. **Manage subscriptions** — Store Combine subscriptions in `Set<AnyCancellable>` with `.store(in: &cancellables)`.
4. **Dispatch to main thread** — Use `@MainActor` or `.receive(on: DispatchQueue.main)` for UI updates.
5. **Use exhaustive ViewState** — Prefer a single `ViewState` enum (`.loading`, `.success(data)`, `.error(failure)`).

### Combine ViewModel Example

```swift
@MainActor
class OrderViewModel: ObservableObject {
    @Published private(set) var state: ViewState<[Order]> = .loading
    private var cancellables = Set<AnyCancellable>()

    func loadOrders() {
        orderService.fetchOrders()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.state = .error(error)
                    }
                },
                receiveValue: { [weak self] orders in
                    self?.state = .success(orders)
                }
            )
            .store(in: &cancellables)
    }
}
```

### Observation Framework (iOS 17+)

```swift
@Observable
class OrderViewModel {
    var orders: [Order] = []
    var isLoading = false

    func loadOrders() async {
        isLoading = true
        orders = try await orderService.fetchOrders()
        isLoading = false
    }
}
```

## Anti-Patterns

- ❌ Uncleared subscriptions — always use `.store(in: &cancellables)`
- ❌ UI updates on background thread — use `.receive(on: .main)` or `@MainActor`
- ❌ Manual `objectWillChange.send()` — use `@Published` or `@Observable` instead

## References

- [Combine & Observation Setup](references/implementation.md)
