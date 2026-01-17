# AutoRoute Routing Reference

Detailed examples for implementing a scalable, type-safe routing system in Flutter.

## References

- [**AppRouter Configuration**](router-config.md) - Standard setup with `@AutoRouterConfig`.
- [**Auth Guards**](guards.md) - Protecting routes based on authentication state.
- [**Nested Routes & Tabs**](nested-routes.md) - Implementation for bottom navigation bars or sub-flows.

## **Quick Navigation Command**

```dart
// Navigating to a page with parameters
context.pushRoute(ProfileRoute(userId: '123'));

// Popping and returning a value
context.maybePop(true);
```
