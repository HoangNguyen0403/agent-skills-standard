---
name: flutter-auto-route-navigation
description: "Implement typed routing, nested routes, and guards using auto_route. Use when adding typed navigation, nested routes, or route guards with auto_route in Flutter. (triggers: **/router.dart, **/app_router.dart, AutoRoute, AutoRouter, router, guards, navigate, push)"
---

# AutoRoute Navigation

## **Priority: P1 (HIGH)**

Type-safe routing system with code generation using `auto_route`.

## Structure

```text
core/router/
├── app_router.dart       # Router configuration
└── app_router.gr.dart    # Generated routes
```

## Implementation Workflow

1. **Annotate pages** — Mark all screen/page widgets with `@RoutePage()`.
2. **Configure router** — Extend `_$AppRouter` and annotate with `@AutoRouterConfig`.
3. **Navigate with types** — Use generated route classes (e.g., `HomeRoute()`). Never use strings.
4. **Add guards** — Implement `AutoRouteGuard` for authentication/authorization logic.
5. **Handle parameters** — Constructors of `@RoutePage` widgets automatically become route parameters.
6. **Prefer declarative calls** — Use `context.pushRoute()` or `context.replaceRoute()`.

### Nested Routes & Tabs

Use `children` in `AutoRoute` for tabs. Pass the `children` parameter to define the initial active sub-route.

See [implementation examples](references/implementation.md) for nested route navigation and router configuration patterns.

## Reference & Examples

For full Router configuration and Auth Guard implementation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- ❌ `Navigator.pushNamed(context, '/orders/123')` — always use generated typed route classes (e.g., `OrderDetailRoute(id: 123)`)
- ❌ Authenticated screen without an `AutoRouteGuard` — every protected route must declare a guard; don't rely on UI-level checks alone
- ❌ `context.router.push(…)` called from a BLoC or repository — navigation is a Presentation concern; emit a state and let the UI navigate

## Related Topics

go-router-navigation | layer-based-clean-architecture

