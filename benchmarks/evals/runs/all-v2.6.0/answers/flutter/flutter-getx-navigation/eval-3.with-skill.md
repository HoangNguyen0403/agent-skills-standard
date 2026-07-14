Define a `Bindings` class for the home feature, then assign it to the home `GetPage`. GetX creates the controller when the route is resolved and disposes it when the route is removed, provided it is not registered as permanent or retained by another binding.

```dart
// app_routes.dart
abstract class Routes {
  static const home = '/home';
}

// home_binding.dart
class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<HomeController>(() => HomeController());
  }
}

// app_pages.dart
class AppPages {
  static const initial = Routes.home;

  static final routes = <GetPage>[
    GetPage(
      name: Routes.home,
      page: () => const HomeView(),
      binding: HomeBinding(),
    ),
  ];
}

// main.dart
GetMaterialApp(
  initialRoute: AppPages.initial,
  getPages: AppPages.routes,
);
```

In `HomeView`, obtain the route-scoped controller with `GetView<HomeController>` or `Get.find<HomeController>()`; do not instantiate it in the widget with `HomeController()`. `Get.lazyPut` defers construction until the home route needs it. When home is popped or replaced, GetX runs the controller lifecycle, including `onClose`, and releases the dependency under the default smart-management behavior.

