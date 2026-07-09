# iOS Framework Map

Reviewed: 2026-07-09

Official sources:
- https://developer.apple.com/documentation/swiftui
- https://developer.apple.com/documentation/observation
- https://developer.apple.com/documentation/swift/concurrency
- https://developer.apple.com/documentation/swiftui/navigationstack

Notes:
- `@Observable` (iOS 17+) is the default state-observation model for new code; `ObservableObject`/`@Published` is legacy/back-compat only. See `ios-swiftui` and `ios-state-management`.

## Default stance

- `ios-architecture`: module boundaries, MV/MVVM conventions.
- `ios-swiftui`: view composition, state selection (base language skill).
- `ios-state-management`: `@Observable`-first reactive state, UDF pattern.
- `ios-navigation`: `NavigationStack`-based routing.
- `ios-security`: keychain, transport security, secure storage.

## State & navigation defaults

- New view models: `@Observable` class, owned via `@State` in the parent view.
- Legacy `ObservableObject`/`@Published` VMs: keep only where Combine operators or pre-iOS-17 support are required; do not use as the template for new code.
- Navigation: `NavigationStack` + `NavigationPath` for new code (iOS 16+); `ios-ui-navigation` covers the `UIKit`/`UINavigationController` bridge for mixed-stack apps.

## Smells that mean "load more skills"

- A new view model conforms to `ObservableObject` with no stated pre-iOS-17 or Combine-interop reason.
- `@StateObject`/`@ObservedObject` appear in new SwiftUI code alongside `@Observable` view models in the same feature.
- Business logic runs inside a SwiftUI `body` instead of the view model.
- Deep-linking or multi-step flows are built with `NavigationLink` + boolean flags instead of `NavigationPath`.
