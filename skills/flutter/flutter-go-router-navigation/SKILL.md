---
name: flutter-go-router-navigation
description: 'Typed routes, route state, and redirection using go_router. Use when implementing go_router typed routes, guards, or redirects in Flutter. (triggers: **/router.dart, **/app_router.dart, GoRouter, GoRoute, StatefulShellRoute, redirection, typed-routes)'
---

# GoRouter Navigation

## **Priority: P0 (CRITICAL)**

Type-safe deep linking and routing system using `go_router` and `go_router_builder`.

## Structure

```text
core/router/
├── app_router.dart # Router configuration
└── routes.dart # Typed route definitions (GoRouteData)
```

## Implementation Guidelines

- **Typed Routes**: Always use **GoRouteData** and **@TypedGoRoute** from `go_router_builder`. Never use raw path strings.
- **Parameters**: Define strongly-typed parameters in the route class (e.g., `class OrderDetailRoute extends GoRouteData { final String id; }`) with paths like **'/orders/:id'**.
- **Root Router**: One global `GoRouter` instance registered in DI.
- **Sub-Routes**: Nest related routes using `TypedGoRoute` and children lists.
- **Redirection**: Handle Auth (Login check) in the **redirect callback** of the `GoRouter` config: `redirect: (context, state) => isLoggedIn ? null : '/login'`. **Do NOT check auth inside the page widget.**
- **Tabs**: Use **StatefulShellRoute** with branches for a bottom tab bar (Home, Orders, Profile) so each tab maintains its own navigation stack.
- **Transitions**: Define standard transitions (Fade, Slide) in `buildPage`.
- **Navigation**: Use **MyRoute().go(context)** or `MyRoute().push(context)`. Using **OrderDetailRoute(id: id).go(context)** is the only allowed way to navigate.

## Code

```dart
// Route Definition
@TypedGoRoute<HomeRoute>(path: '/')
class HomeRoute extends GoRouteData {
  @override
  Widget build(context, state) => const HomePage();
}

// Router Config
final router = GoRouter(
  routes: $appRoutes,
  redirect: (context, state) {
    if (notAuthenticated) return '/login';
    return null;
  },
);
```

## Anti-Patterns

- ❌ `context.go('/orders/123')` with a raw string path — always use typed `GoRouteData` classes (e.g., `OrderDetailRoute(id: 123).go(context)`)
- ❌ Auth check inside the page widget's `build()` — redirect logic belongs in the `GoRouter.redirect` callback, not the UI
- ❌ Multiple `GoRouter` instances — register one global instance in DI and share it throughout the app
- ❌ Navigating to a deep link without validating the ID in `redirect` — always verify IDs/parameters exist before building the route

## Related Topics

layer-based-clean-architecture | auto-route-navigation | security
