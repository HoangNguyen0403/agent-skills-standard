Keep one source of truth at the highest appropriate level, then pass state down explicitly with values and `Binding`s. For data needed by many descendants, inject shared observable state through the environment.

With the classic Combine model:

```swift
struct RootView: View {
    @StateObject private var session = SessionModel()

    var body: some View {
        HomeView().environmentObject(session)
    }
}

struct HomeView: View {
    @EnvironmentObject var session: SessionModel
    var body: some View { Text(session.userName) }
}
```

Use `@Environment` for system or explicitly injected values, and pass a binding when a descendant needs to edit local state. On newer systems, an `@Observable` model can also be supplied through the environment. Avoid global singletons when scoped injection is sufficient.

