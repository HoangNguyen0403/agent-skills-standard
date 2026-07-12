For iOS, I’d choose the state approach based on platform support:

- Use `@Observable` for modern SwiftUI on iOS 17+.
- Use Combine with `@Published` when you need UIKit support or broader OS compatibility.

A solid pattern is unidirectional data flow:

- Define an `Input` enum for user/system events.
- Expose an `Output` struct or a single `ViewState` enum for UI state.

For example, prefer a single state model like:

- `.loading`
- `.success(data)`
- `.error(error)`

Important practices:

- Keep UI state updates on the main thread with `@MainActor` or `.receive(on: DispatchQueue.main)`.
- Store Combine subscriptions in `Set<AnyCancellable>` and always call `.store(in: &cancellables)`.
- Avoid manual `objectWillChange.send()` when `@Published` or `@Observable` already handles change propagation.

In short: use `@Observable` for new SwiftUI-first apps, Combine for compatibility-heavy apps, and structure state around clear inputs and exhaustive view states.

