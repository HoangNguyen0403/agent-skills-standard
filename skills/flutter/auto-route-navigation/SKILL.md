---
name: Flutter AutoRoute Navigation
description: Typed routing, nested routes, and guards using auto_route.
metadata:
  labels: [navigation, auto-route, routing]
  triggers:
    files: ['**/router.dart', '**/app_router.dart']
    keywords: [AutoRoute, AutoRouter, router, guards, navigate, push]
---

# AutoRoute Navigation

## **Priority: P1 (HIGH)**

Type-safe routing system with code generation using `auto_route`.

## Structure

```text
core/router/
├── app_router.dart # Router configuration
└── app_router.gr.dart # Generated routes
```

## Implementation Guidelines

- **@RoutePage**: Annotate all screen/page widgets with `@RoutePage()`.
- **Router Config**: Extend `_$AppRouter` and annotate with `@AutoRouterConfig`.
- **Typed Navigation**: Use generated route classes (e.g., `HomeRoute()`). Never use strings.
- **Nested Routes & Tabs**: Use `children` in `AutoRoute` for tabs. When navigating to a route with nested tabs, use the `children` parameter to define the initial active sub-route (e.g., `context.navigateTo(OrdersTabRoute(children: [ViewByOrdersPageRoute()]))`).
- **Guards**: Implement `AutoRouteGuard` for authentication/authorization logic.

- **Parameters**: Constructors of `@RoutePage` widgets automatically become route parameters.
- **Declarative**: Prefer `context.pushRoute()` or `context.replaceRoute()`.

## Reference & Examples

For full Router configuration and Auth Guard implementation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

go-router-navigation | layer-based-clean-architecture
