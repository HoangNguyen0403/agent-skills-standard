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

## Implementation Guidelines

- **Prefer Named Routes**: Use `Get.toNamed('/path')` for better maintainability. Define routes in a centralized `AppPages` class.
- **No Context Navigation**: Leverage `Get.to()`, `Get.back()`, etc., directly from controllers.
- **Navigation Methods**:
  - `Get.to()`: Navigate to next screen.
  - `Get.off()`: Navigate and replace current screen (e.g., Splash -> Home).
  - `Get.offAll()`: Clear stack and navigate (e.g., Logout -> Login).
  - `Get.back()`: Close current screen, dialog, or bottom sheet.
- **Bindings Everywhere**: Always link routes with `Bindings` to manage controller lifecycles.
- **Middleware**: Use `GetMiddleware` for route guards (Auth, Permissions) instead of logic inside views.

## Code Example

```dart
// Route Definition
static final routes = [
  GetPage(
    name: _Paths.HOME,
    page: () => HomeView(),
    binding: HomeBinding(),
    middlewares: [AuthMiddleware()],
  ),
];

// Usage in Controller
void logout() {
  _authService.clear();
  Get.offAllNamed(Routes.LOGIN);
}

// Route Guard
class AuthMiddleware extends GetMiddleware {
  @override
  RouteSettings? redirect(String? route) {
    return isAuthenticated ? null : RouteSettings(name: Routes.LOGIN);
  }
}
```

## Anti-Patterns

- **Mixing Context and GetX**: Do not use `Navigator.of(context)` when GetX is the primary router.
- **Hardcoded Strings**: Always use a `Routes` constant class for names.
- **Dialogs without GetX**: Use `Get.dialog()` and `Get.snackbar()` for consistency.

## Reference & Examples

For centralized route configuration and middleware guards:
See [references/app-pages.md](references/app-pages.md) and [references/middleware-example.md](references/middleware-example.md).

## Related Topics

getx-state-management | feature-based-clean-architecture
