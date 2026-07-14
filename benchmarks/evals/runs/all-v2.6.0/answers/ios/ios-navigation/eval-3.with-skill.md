Here’s a quick-start SwiftUI navigation example using `NavigationStack`, plus a simple deep-link handler at the root:

```swift
import SwiftUI

enum Route: Hashable {
    case detail(id: Int)
    case settings
}

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

struct RootView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Button("Open Detail 42") {
                    path.append(Route.detail(id: 42))
                }

                Button("Open Settings") {
                    path.append(Route.settings)
                }
            }
            .navigationTitle("Home")
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .detail(let id):
                    DetailView(id: id)
                case .settings:
                    SettingsView()
                }
            }
        }
        .onOpenURL { url in
            guard url.scheme == "myapp" else { return }

            if url.host == "settings" {
                path.append(Route.settings)
                return
            }

            if url.host == "detail",
               let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
               let idValue = components.queryItems?.first(where: { $0.name == "id" })?.value,
               let id = Int(idValue) {
                path.append(Route.detail(id: id))
            }
        }
    }
}

struct DetailView: View {
    let id: Int

    var body: some View {
        Text("Detail for item \\(id)")
            .navigationTitle("Detail")
    }
}

struct SettingsView: View {
    var body: some View {
        Text("Settings")
            .navigationTitle("Settings")
    }
}
```

Example deep links:

- `myapp://settings`
- `myapp://detail?id=42`

Why this pattern:

- Uses `NavigationStack` with `NavigationPath` for programmatic navigation.
- Handles deep links at the root with `onOpenURL`.
- Avoids force-unwrapping by validating URL parts before pushing routes.

If you need Universal Links too, add the Associated Domains entitlement with your `applinks:` domain and route the incoming URL through the same root handler.

