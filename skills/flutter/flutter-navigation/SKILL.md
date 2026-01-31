---
name: Flutter Navigation
description: Flutter navigation patterns including go_router, deep linking, and named routes for Flutter apps.
metadata:
  labels: [flutter, navigation, routing, deep-linking, go-router]
  triggers:
    files: ['**/*_route.dart', '**/*_router.dart', '**/main.dart']
    keywords: [Navigator, GoRouter, routes, deep link, go_router, AutoRoute]
---

# Flutter Navigation

## **Priority: P1 (OPERATIONAL)**

Navigation and routing for Flutter apps using `go_router` or named routes.

## Guidelines

- **Package**: Use `go_router` for modern, declarative routing.
- **Deep Linking**: Configure `AndroidManifest.xml` and `Info.plist` for URL schemes.
- **Validation**: Validate parameters in `redirect` logic before navigation.
- **Stateful Tabs**: Use `IndexedStack` to preserve state in bottom navigation.

[Routing Patterns & Examples](references/routing-patterns.md)

## Anti-Patterns

- **No Manual URL Parsing**: Use `go_router` parsing, never `Uri.parse` manually.
- **No Stateless Tabs**: `Scaffold` body switching loses state; use `IndexedStack`.
- **No Unvalidated Deep Links**: Always check if IDs exist in `redirect`.
- **No Hardcoded Routes**: Use constants (e.g., `Routes.home`) or code generation.

## Related Topics

flutter-design-system | flutter-notifications | mobile-ux-core
