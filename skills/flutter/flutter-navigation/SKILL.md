---
name: flutter-navigation
description: "Implement navigation patterns with go_router, deep linking, and named routes. Use when building navigation, deep linking, or named routes in Flutter. (triggers: **/*_route.dart, **/*_router.dart, **/main.dart, Navigator, GoRouter, routes, deep link, go_router, AutoRoute)"
---

# Flutter Navigation

## **Priority: P1 (OPERATIONAL)**

Navigation and routing for Flutter apps using `go_router` or named routes.

## Implementation Workflow

1. **Choose router** — Use `go_router` for modern, declarative routing.
2. **Define routes** — Use constants or code generation for route paths; never hardcode strings.
3. **Configure deep links** — Set up `AndroidManifest.xml` and `Info.plist` for URL schemes.
4. **Validate parameters** — Check parameters in `redirect` logic before navigation.
5. **Preserve tab state** — Use `StatefulShellRoute` or `IndexedStack` for bottom navigation.

### Route Configuration Example

See [implementation examples](references/implementation.md) for GoRouter configuration with parameter validation and redirects.

[Routing Patterns & Examples](references/routing-patterns.md)

## Anti-Patterns

- ❌ `Uri.parse(url)` for manual URL parsing — use `go_router` built-in parsing
- ❌ `Scaffold` body switching for tabs — loses state; use `IndexedStack` or `StatefulShellRoute`
- ❌ Unvalidated deep link IDs — always check existence in `redirect`
- ❌ Hardcoded route strings like `'/orders'` — use constants (e.g., `Routes.orders`) or code generation

## Related Topics

flutter-design-system | flutter-notifications | mobile-ux-core
