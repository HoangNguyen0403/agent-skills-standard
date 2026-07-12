Use `@StateObject` when the view creates and owns an observable object, so SwiftUI preserves its lifecycle across view redraws. Use `@ObservedObject` when the object is created elsewhere and injected:

```swift
struct Parent: View {
    @StateObject private var model = ViewModel()
    var body: some View { Child(model: model) }
}

struct Child: View {
    @ObservedObject var model: ViewModel
    var body: some View { Text(model.title) }
}
```

Using `@ObservedObject` for an owned instance can recreate it unexpectedly; use `@StateObject` for ownership.


