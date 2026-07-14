Define a binding for the home route. GetX creates the controller when the route is opened and disposes it when the route is removed, unless the controller is registered as permanent or configured to be kept alive.

```dart
import 'package:get/get.dart';

abstract class Routes {
  static const home = '/home';
}

class HomeController extends GetxController {
  final title = 'Home'.obs;

  @override
  void onClose() {
    // Cancel streams, timers, or other controller-owned resources here.
    super.onClose();
  }
}

class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<HomeController>(() => HomeController());
  }
}

class AppPages {
  static final pages = <GetPage>[
    GetPage(
      name: Routes.home,
      page: () => const HomePage(),
      binding: HomeBinding(),
    ),
  ];
}
```

Configure the pages on the app:

```dart
GetMaterialApp(
  initialRoute: Routes.home,
  getPages: AppPages.pages,
);
```

In `HomePage`, obtain the route-provided controller with `GetView<HomeController>` or `Get.find<HomeController>()`; do not instantiate another controller in the widget.

```dart
class HomePage extends GetView<HomeController> {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Obx(() => Text(controller.title.value))),
    );
  }
}
```

Use the normal route lifecycle (`Get.toNamed` followed by a pop, or `Get.offNamed` when replacing home) so the route is actually removed. Avoid `permanent: true` for this controller, because that prevents its automatic disposal.

