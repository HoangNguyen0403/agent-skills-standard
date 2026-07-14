`@StateObject` is for an `ObservableObject` created and owned by the view. SwiftUI preserves its instance across view updates and manages its lifecycle.

```swift
struct ParentView: View {
    @StateObject private var model = MyModel()
}
```

`@ObservedObject` is for an `ObservableObject` received from an external source, such as a parent. The view observes it but does not own its lifecycle.

```swift
struct ChildView: View {
    @ObservedObject var model: MyModel
}
```

Use `@StateObject` for owned data and `@ObservedObject` when receiving an instance. For simple data passed down, use `@Binding`; for shared data injected into the view hierarchy, use `@EnvironmentObject`.
