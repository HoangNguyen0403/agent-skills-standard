Use an `ObservableObject` owned by the root view, then inject it into the view hierarchy with `.environmentObject()`:

```swift
final class AppModel: ObservableObject {
    @Published var username = ""
}

struct RootView: View {
    @StateObject private var model = AppModel() // View owns lifecycle

    var body: some View {
        VStack {
            ChildView()
        }
        .environmentObject(model) // Inject into the hierarchy
    }
}

struct ChildView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        TextField("Username", text: $model.username)
    }
}
```

Use the appropriate property wrapper depending on ownership:

- `@State` — data owned by a view, such as a toggle or text input.
- `@Binding` — two-way data passed down from a parent to a child.
- `@StateObject` — the view creates and owns an observable object.
- `@ObservedObject` — the view receives an observable object from an external source.
- `@EnvironmentObject` — shared observable data injected into and accessed throughout a view hierarchy.

For a large number of views in a scrolling container, use `LazyVStack` or `LazyHStack` so views load only as they appear.
