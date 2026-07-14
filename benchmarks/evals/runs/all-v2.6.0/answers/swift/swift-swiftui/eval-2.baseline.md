`@StateObject` and `@ObservedObject` both observe an `ObservableObject`, but differ in ownership:

- `@StateObject`: The view creates and owns the object. SwiftUI preserves it across view redraws and manages its lifetime. Use it for the object’s source of truth.

```swift
@StateObject private var model = MyModel()
```

- `@ObservedObject`: The view receives and observes an object owned elsewhere. SwiftUI does not manage its lifetime. Use it for dependencies passed into a view.

```swift
@ObservedObject var model: MyModel
```

Rule of thumb: use `@StateObject` when the view creates the model; use `@ObservedObject` when another view or system creates and owns it.
