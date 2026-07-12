`@StateObject` is for an `ObservableObject` instance that the view creates and owns. SwiftUI keeps that instance alive across the view's body re-evaluations.

`@ObservedObject` is for an object owned elsewhere and injected into the view. The view observes it but does not control its lifetime.

```swift
struct OwnerView: View {
    @StateObject private var model = Model()
    var body: some View { DetailView(model: model) }
}

struct DetailView: View {
    @ObservedObject var model: Model
    var body: some View { Text(model.title) }
}
```

Using `@ObservedObject` to create the instance inside a view can recreate it unexpectedly. In newer deployment targets, the Observation framework's `@Observable` and `@State`/`@Bindable` APIs provide a newer alternative, but the ownership rule remains the same.

