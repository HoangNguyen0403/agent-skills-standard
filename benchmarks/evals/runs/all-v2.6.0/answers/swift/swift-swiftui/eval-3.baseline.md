Use SwiftUI’s property wrappers based on data ownership:

- `@State`: View-owned local value.
- `@Binding`: Pass writable state to child views.
- `@StateObject`: Create and own a reference model.
- `@ObservedObject`: Observe a model owned elsewhere.
- `@EnvironmentObject`: Share an observable model throughout a view hierarchy without passing it manually.
- `@Environment`: Read system or custom environment values.

For shared app data, define an `ObservableObject`, inject it near the root, and read it in descendants:

```swift
final class AppModel: ObservableObject {
    @Published var username = ""
}

@main
struct MyApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        TextField("Username", text: $model.username)
    }
}
```

Use `@Binding` for explicit parent-to-child data flow; use `@EnvironmentObject` when many descendants need the same shared model.
