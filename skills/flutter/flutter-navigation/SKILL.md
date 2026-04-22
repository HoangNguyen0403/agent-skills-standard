---
name: flutter-navigation
description: Implement navigation patterns with go_router, deep linking, and named routes in Flutter. Use when building navigation, deep linking, or routing.
metadata:
  triggers:
    files:
    - '**/*_route.dart'
    - '**/*_router.dart'
    - '**/main.dart'
    keywords:
    - Navigator
    - GoRouter
    - routes
    - deep link
    - go_router
    - AutoRoute
---
# Flutter Navigation

## **Priority: P1 (OPERATIONAL)**


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

- **No Manual URL Parsing**: Use `go_router` built-in parsing instead of `Uri.parse(url)`
- **No Manual Tab State Management**: Use `IndexedStack` or `StatefulShellRoute` to preserve state
- **No Unvalidated Deep Link IDs**: Always check existence in `redirect`
- **No Hardcoded Route Strings**: Use constants (e.g., `Routes.orders`) or code-gen instead of `'/orders'`

## Related Topics

flutter-design-system | flutter-notifications | mobile-ux-core