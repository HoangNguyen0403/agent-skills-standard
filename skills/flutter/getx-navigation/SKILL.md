---
name: Flutter GetX Navigation
description: Context-less navigation, named routes, and middleware using GetX.
metadata:
  labels: [navigation, getx, routing, middleware]
  triggers:
    files: ['**/app_pages.dart', '**/app_routes.dart']
    keywords: [GetPage, Get.to, Get.off, Get.offAll, Get.toNamed, GetMiddleware]
---

# GetX Navigation

## **Priority: P0 (CRITICAL)**

Decoupled navigation system allowing UI transitions without `BuildContext`.

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

```dart
static final routes = [
  GetPage(
    name: _Paths.HOME,
    page: () => HomeView(),
    binding: HomeBinding(),
    middlewares: [AuthMiddleware()],
  ),
];

// Usage in Controller
void logout() => Get.offAllNamed(Routes.LOGIN);
```

## Anti-Patterns

- **Navigator Context**: Do not use `Navigator.of(context)` with GetX.
- **Hardcoded Routes**: Use a `Routes` constant class.
- **Direct Dialogs**: Use `Get.dialog()` and `Get.snackbar()`.

## References

- [AppPages Config](references/app-pages.md)
- [Middleware Implementation](references/middleware-example.md)

## Related Topics

getx-state-management | feature-based-clean-architecture
