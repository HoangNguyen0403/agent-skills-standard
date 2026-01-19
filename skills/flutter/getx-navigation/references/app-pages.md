# Centralized Route Management

Organizing routes in a single location for scalability.

```dart
// app_routes.dart
abstract class Routes {
  static const HOME = _Paths.HOME;
  static const LOGIN = _Paths.LOGIN;
}

abstract class _Paths {
  static const HOME = '/home';
  static const LOGIN = '/login';
}

// app_pages.dart
class AppPages {
  static const INITIAL = Routes.LOGIN;

  static final routes = [s
    GetPage(
      name: _Paths.HOME,
      page: () => HomeView(),
      binding: HomeBinding(),
    ),
    GetPage(
      name: _Paths.LOGIN,
      page: () => LoginView(),
      binding: LoginBinding(),
    ),
  ];
}

// main.dart
GetMaterialApp(
  initialRoute: AppPages.INITIAL,
  getPages: AppPages.routes,
)
```
