---
name: flutter-getx-navigation
description: Implement context-less navigation, named routes, and middleware using GetX. Use when building navigation with GetX routing in Flutter.
metadata:
  triggers:
    files:
    - '**/app_pages.dart'
    - '**/app_routes.dart'
    keywords:
    - GetPage
    - Get.to
    - Get.off
    - Get.offAll
    - Get.toNamed
    - GetMiddleware
---
# GetX Navigation

## **Priority: P0 (CRITICAL)**


## Guidelines

- **Named Routes**: Use `Get.toNamed('/path')`. Define routes in `AppPages`.
- **Navigation APIs**:
 - `Get.to()`: Push new route.
 - `Get.off()`: Replace current route.
 - `Get.offAll()`: Clear stack and push.
 - `Get.back()`: Pop route/dialog/bottomSheet.
- **Bindings**: Link routes with `Bindings` for automated lifecycle.
- **Middleware**: Implement `GetMiddleware` for Auth/Permission guards.

## Code Example

See [AppPages Config](references/app-pages.md) for route definition and controller usage patterns.

## Anti-Patterns

- **Navigator Context**: not use `Navigator.of(context)` with GetX.
- **Hardcoded Routes**: Use `Routes` constant class.
- **Direct Dialogs**: Use `Get.dialog()` and `Get.snackbar()`.

## References

- [AppPages Config](references/app-pages.md)
- [Middleware Implementation](references/middleware-example.md)

## Related Topics

getx-state-management | feature-based-clean-architecture