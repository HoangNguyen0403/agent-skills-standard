---
name: flutter-auto-route-navigation
description: Implement typed routing, nested routes, and guards using auto_route in Flutter. Use when adding navigation flows, nested routes, or route guards with auto_route.
metadata:
  triggers:
    files:
    - '**/router.dart'
    - '**/app_router.dart'
    keywords:
    - AutoRoute
    - AutoRouter
    - router
    - guards
    - navigate
    - push
---

# AutoRoute Navigation

## **Priority: P1 (HIGH)**

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

Use `children` in `AutoRoute` for tabs. Pass `children` parameter to define initial active sub-route.

See [implementation examples](references/implementation.md) for nested route navigation and router configuration patterns.

## Reference & Examples

For full Router configuration and Auth Guard implementation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- **No string-based navigation**: Use generated typed route classes (e.g., `OrderDetailRoute(id: 123)`).
- **No protected screen without AutoRouteGuard**: Every protected route must declare guard; don't rely on UI-level checks.
- **No navigation calls from BLoC**: Emit state and let Presentation layer navigate.

## References

- [go-router-navigation](../flutter-navigation/SKILL.md) | [layer-based-clean-architecture](../../common/common-clean-architecture/SKILL.md)
