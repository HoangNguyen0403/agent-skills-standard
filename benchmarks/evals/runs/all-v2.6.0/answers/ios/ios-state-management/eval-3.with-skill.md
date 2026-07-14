Represent view state as a single exhaustive type, usually a `ViewState` enum, so the UI can switch over every case explicitly.

```swift
enum ViewState {
    case loading
    case success([Item])
    case error(String)
}
```

Then expose that state from a ViewModel using the observation system that fits your app:

- Use `@Observable` for modern SwiftUI on iOS 17+.
- Use `ObservableObject` with `@Published` for older SwiftUI or Combine/UIKit setups.

A solid pattern is unidirectional data flow:

- `Input`: user/view events
- `Output` or state: current `ViewState`

Also keep UI state updates on the main thread with `@MainActor` or `.receive(on: DispatchQueue.main)`.

