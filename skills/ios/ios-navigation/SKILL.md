---
name: ios-navigation
description: SwiftUI navigation and deep linking using NavigationStack and Universal Links. Use when implementing NavigationStack or Universal Links deep linking in iOS.
metadata:
  triggers:
    files:
    - '**/*View.swift'
    - '**/*App.swift'
    keywords:
    - NavigationStack
    - NavigationLink
    - onOpenURL
    - universalLink
    - NSUserActivity
---
# iOS Navigation (SwiftUI)

## **Priority: P2 (OPTIONAL)**


## Guidelines

- **Stack**: Use `NavigationStack` (iOS 16+) with `NavigationPath` for programmatic control.
- **Deep Links**: Handle `onOpenURL` at Root View (`WindowGroup`).
- **Universal Links**: Configure Associated Domains (`applinks`) in Entitlements.
- **Tabs**: Maintain separate `NavigationStack` instances per `TabItem`.

See [NavigationStack and deep linking examples](references/swiftui-navigation.md)

## Anti-Patterns

- **No Force Unwrapping**: Use `guard let` when parsing URL components.
- **No Broken Back Stack**: Ensure valid path state before appending destinations.
- **No Missing Validation**: Check content availability before deep-link navigation.

## References

- [Navigation Patterns](references/swiftui-navigation.md)