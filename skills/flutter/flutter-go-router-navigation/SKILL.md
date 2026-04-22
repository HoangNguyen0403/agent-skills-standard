---
name: flutter-go-router-navigation
description: Implement typed routes, redirection, and guards using go_router in Flutter. Use when building declarative navigation with go_router.
metadata:
  triggers:
    files:
    - '**/router.dart'
    - '**/app_router.dart'
    keywords:
    - GoRouter
    - GoRoute
    - StatefulShellRoute
    - redirection
    - typed-routes
---
# GoRouter Navigation

## **Priority: P0 (CRITICAL)**


## Structure

```text
core/router/
├── app_router.dart # Router configuration
└── routes.dart # Typed route definitions (GoRouteData)
```

## Implementation Guidelines

- **Typed Routes**: Always use **GoRouteData** and **@TypedGoRoute** from `go_router_builder`. Never use raw path strings.
- **Parameters**: Define strongly-typed parameters in route class (e.g., `class OrderDetailRoute extends GoRouteData { final String id; }`) with paths like **'/orders/:id'**.
- **Root Router**: One global `GoRouter` instance registered in DI.
- **Sub-Routes**: Nest related routes using `TypedGoRoute` and children lists.
- **Redirection**: Handle Auth (Login check) in **redirect callback** of `GoRouter` config: `redirect: (context, state) => isLoggedIn ? null : '/login'`. ** NOT check auth inside page widget.**
- **Tabs**: Use **StatefulShellRoute** with branches for bottom tab bar (Home, Orders, Profile) so each tab maintains its own navigation stack.
- **Transitions**: Define standard transitions (Fade, Slide) in `buildPage`.
- **Navigation**: Use **MyRoute().go(context)** or `MyRoute().push(context)`. Using **OrderDetailRoute(id: id).go(context)** only allowed way to navigate.

## Code

See [references/typed-routes.md](references/typed-routes.md) for GoRouteData + redirect implementation.

## Anti-Patterns

- **No Raw String Paths**: Use typed `GoRouteData` classes (e.g., `OrderDetailRoute(id: 123).go(context)`) instead of `context.go('/orders/123')`
- **No Inline Auth Logic**: Redirect logic belongs in `GoRouter.redirect`, not UI's `build()` method
- **No Multiple Routers**: Register one global `GoRouter` instance in DI
- **No Unvalidated IDs**: Always verify parameters exist in `redirect` before building route

## Related Topics

layer-based-clean-architecture | auto-route-navigation | security