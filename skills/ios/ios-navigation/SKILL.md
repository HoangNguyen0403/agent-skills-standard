---
name: ios-navigation
description: "SwiftUI navigation and deep linking using NavigationStack and Universal Links. Use when implementing NavigationStack or Universal Links deep linking in iOS. (triggers: **/*View.swift, **/*App.swift, NavigationStack, NavigationLink, onOpenURL, universalLink, NSUserActivity)"
---

# iOS Navigation (SwiftUI)

## **Priority: P2 (OPTIONAL)**

SwiftUI path-based navigation and deep linking.

## Guidelines

- **Stack**: Use `NavigationStack` (iOS 16+) with `NavigationPath` for programmatic control.
- **Deep Links**: Handle `onOpenURL` at the Root View (`WindowGroup`).
- **Universal Links**: Configure Associated Domains (`applinks`) in Entitlements.
- **Tabs**: Maintain separate `NavigationStack` instances per `TabItem`.

### Example: NavigationStack with Programmatic Navigation

```swift
struct ContentView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List(items) { item in
                NavigationLink(value: item) {
                    Text(item.title)
                }
            }
            .navigationDestination(for: Item.self) { item in
                DetailView(item: item)
            }
        }
    }

    func navigateToItem(_ item: Item) {
        path.append(item)
    }
}
```

### Example: Deep Link Handling

```swift
@main
struct MyApp: App {
    @State private var path = NavigationPath()

    var body: some Scene {
        WindowGroup {
            ContentView(path: $path)
                .onOpenURL { url in
                    guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                          let id = components.queryItems?.first(where: { $0.name == "id" })?.value else {
                        return
                    }
                    path.append(ItemRoute(id: id))
                }
        }
    }
}
```

## Anti-Patterns

- **No Force Unwrapping**: Use `guard let` when parsing URL components.
- **No Broken Back Stack**: Ensure valid path state before appending destinations.
- **No Missing Validation**: Check content availability before deep-link navigation.

## References

- [Navigation Patterns](references/swiftui-navigation.md)
