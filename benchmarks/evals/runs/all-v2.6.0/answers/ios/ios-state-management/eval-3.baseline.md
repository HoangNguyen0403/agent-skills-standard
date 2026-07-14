In iOS, view state is usually represented as data owned by a view or view model, then rendered declaratively from that data.

Common approaches:

- SwiftUI:
  - `@State` for local mutable view state
  - `@Binding` for state passed from a parent
  - `@StateObject` / `@ObservedObject` for reference-type observable models
  - `@EnvironmentObject` for shared app state

- UIKit:
  - Store state in the view controller or a separate view model
  - Update views when state changes, often with delegation, callbacks, Combine, or notifications

Good view state is typically:

- minimal
- UI-focused
- serializable or easy to inspect
- separated from business logic when it grows complex

Example kinds of view state:

- loading / loaded / error
- form field values
- selection
- isExpanded / isPresented flags
- filtered or sorted display data

A common pattern is to model state explicitly, for example with an enum:

```swift
enum ProfileViewState {
    case loading
    case loaded(Profile)
    case error(String)
}
```

Then the UI switches on that state and renders the appropriate screen. This keeps rendering predictable and easier to test.

