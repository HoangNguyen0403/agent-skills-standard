# GetX Binding Example

Using Bindings ensures that dependencies are only in memory when the associated route is active.

```dart
// 1. Define the Binding
class HomeBinding extends Bindings {
  @override
  void dependencies() {
    // lazyPut only initializes the controller when it's first used (Get.find)
    Get.lazyPut<HomeController>(() => HomeController());
    Get.lazyPut<HomeRepository>(() => HomeRepositoryImpl());
  }
}

// 2. Attach to Route
GetPage(
  name: '/home',
  page: () => HomeView(),
  binding: HomeBinding(),
)

// 3. Use in View via GetView (automatically finds the controller)
class HomeView extends GetView<HomeController> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Obx(() => Text(controller.title.value)),
    );
  }
}
```
