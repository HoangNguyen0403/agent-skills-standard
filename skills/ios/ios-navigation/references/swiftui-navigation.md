# iOS Navigation Patterns (SwiftUI)

## 1. NavigationStack (iOS 16+)

Path-based navigation setup:

```swift
struct ContentView: View {
    @State private var navigationPath = NavigationPath()

    var body: some View {
        NavigationStack(path: $navigationPath) {
            HomeView()
                .navigationDestination(for: Product.self) { product in
                    ProductDetailView(product: product)
                }
        }
    }
}
```

## 2. Tab Navigation

Multiple stacks preserved in `TabView`:

```swift
TabView(selection: $selectedTab) {
    NavigationStack { HomeView() }
        .tabItem { Label("Home", systemImage: "house") }
        .tag(0)

    NavigationStack { SearchView() }
        .tabItem { Label("Search", systemImage: "magnifyingglass") }
        .tag(1)
}
```

## 3. Deep Linking

### Entitlements

Entitlements config for Universal Links:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:example.com</string>
</array>
```

### Handler (WindowGroup)

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }

    func handleDeepLink(_ url: URL) {
        // 1. Parse URL Components
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let host = components.host else { return }

        // 2. Route based on host
        switch host {
        case "product":
            if let id = components.queryItems?.first(where: { $0.name == "id" })?.value {
                // navigationPath.append(Product(id: id))
            }
        default: break
        }
    }
}
```
