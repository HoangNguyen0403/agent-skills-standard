Use a `GetMiddleware` on every protected `GetPage`. The middleware checks the authentication state before the page is built and redirects to the login route when no authenticated session exists.

```dart
import 'package:get/get.dart';

abstract class Routes {
  static const login = '/login';
  static const home = '/home';
  static const profile = '/profile';
}

class AuthService extends GetxService {
  final isSignedIn = false.obs;
}

class AuthMiddleware extends GetMiddleware {
  @override
  RouteSettings? redirect(String? route) {
    final auth = Get.find<AuthService>();

    if (!auth.isSignedIn.value) {
      return const RouteSettings(name: Routes.login);
    }
    return null; // Allow the requested route.
  }
}

class AppPages {
  static final pages = <GetPage>[
    GetPage(name: Routes.login, page: () => const LoginPage()),
    GetPage(
      name: Routes.home,
      page: () => const HomePage(),
      middlewares: [AuthMiddleware()],
    ),
    GetPage(
      name: Routes.profile,
      page: () => const ProfilePage(),
      middlewares: [AuthMiddleware()],
    ),
  ];
}
```

Register `AuthService` before `GetMaterialApp` is used, for example in `main`:

```dart
void main() {
  Get.put(AuthService(), permanent: true);
  runApp(GetMaterialApp(getPages: AppPages.pages));
}
```

For an app with many protected routes, place them under a shared route structure or attach the same middleware to each protected `GetPage`. Keep the login route unprotected to avoid a redirect loop. After a successful login, update the auth state and navigate with `Get.offAllNamed(Routes.home)` if the login screen should no longer remain in history.

