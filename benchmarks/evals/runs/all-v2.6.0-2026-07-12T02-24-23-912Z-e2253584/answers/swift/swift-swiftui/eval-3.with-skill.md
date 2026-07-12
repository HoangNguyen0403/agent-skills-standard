Use `@EnvironmentObject` for shared observable data supplied at an ancestor and consumed by many descendants:

```swift
@main
struct AppRoot: App {
    @StateObject private var session = Session()
    var body: some Scene {
        WindowGroup { HomeView().environmentObject(session) }
    }
}

struct HomeView: View {
    @EnvironmentObject private var session: Session
    var body: some View { Text(session.userName) }
}
```

The object must be injected with `.environmentObject()` above every consumer. For explicit parent-to-child two-way data, prefer `@Binding`; use `@StateObject` when a view owns the object.


