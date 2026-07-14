Use a `GetMiddleware` guard and attach it to every protected `GetPage` in `AppPages`. Keep the login route public, otherwise a redirect to login can recurse.

```dart
// app_routes.dart
abstract class Routes {
  static const login = '/login';
  static const home = '/home';
  static const profile = '/profile';
}

class AuthMiddleware extends GetMiddleware {
  AuthMiddleware(this.authService);

  final AuthService authService;

  @override
  int? get priority => 1;

  @override
  RouteSettings? redirect(String? route) {
    if (authService.isLoggedIn) {
      return null; // Allow the requested route.
    }

    return const RouteSettings(name: Routes.login);
  }
}

class AppPages {
  static final _authMiddleware = AuthMiddleware(Get.find<AuthService>());

  static final routes = <GetPage>[
    GetPage(
      name: Routes.login,
      page: () => const LoginView(),
    ),
    GetPage(
      name: Routes.home,
      page: () => const HomeView(),
      middlewares: [_authMiddleware],
    ),
    GetPage(
      name: Routes.profile,
      page: () => const ProfileView(),
      middlewares: [_authMiddleware],
    ),
  ];
}
```

Register `AuthService` before `GetMaterialApp` builds the route table (for example, with `Get.put(AuthService())` in app startup). For a large application, define a small helper that supplies the same middleware to all protected `GetPage`s; do not use `Navigator.of(context)` for this redirect.

