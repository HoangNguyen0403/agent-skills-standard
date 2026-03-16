# Route Middleware (Guards)

Use middleware to protect routes from unauthorized access or handle redirections.

```dart
class AuthMiddleware extends GetMiddleware {
  @override
  int? get priority => 1;

  @override
  RouteSettings? redirect(String? route) {
    bool isAuthenticated = AuthService.to.isLoggedInValue;

    if (isAuthenticated) {
      return null; // Continue to target route
    } else {
      // Redirect to login if user is not authenticated
      return const RouteSettings(name: Routes.LOGIN);
    }
  }
}

// Usage in AppPages
GetPage(
  name: Routes.PROFILE,
  page: () => ProfileView(),
  middlewares: [AuthMiddleware()],
)
```
