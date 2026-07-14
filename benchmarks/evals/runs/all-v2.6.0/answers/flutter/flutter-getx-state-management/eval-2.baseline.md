Let a route binding own the controller instead of calling `Get.put` independently from each screen. Register the controller once for the route subtree, navigate among child screens normally, and let GetX remove it when that owning route is removed.

```dart
class CheckoutController extends GetxController {
  final currentStep = 0.obs;

  @override
  void onClose() {
    // Cancel streams, timers, or other controller-owned resources here.
    super.onClose();
  }
}

class CheckoutBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CheckoutController>(() => CheckoutController());
  }
}

final pages = [
  GetPage(
    name: '/checkout',
    page: () => const CheckoutShell(),
    binding: CheckoutBinding(),
  ),
];
```

Any screen below `/checkout` can retrieve the same instance:

```dart
class ShippingStep extends GetView<CheckoutController> {
  const ShippingStep({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() => Text('Step ${controller.currentStep.value}'));
  }
}
```

This gives the controller a clear owner: it remains available while the checkout route is in the navigation stack, and its `onClose` runs after that route is popped/replaced and no longer used. Avoid `Get.put(CheckoutController())` in every screen's `build`, which can create unclear ownership and duplicate instances.

For an app-wide service such as authentication, use `Get.put(AuthController(), permanent: true)` (or `GetxService`) intentionally; it will not be automatically disposed. For a controller that should survive only within a flow, do not use `permanent: true`. If you manually create a controller outside route bindings, pair it with an explicit lifecycle decision such as `Get.delete<CheckoutController>()` when the flow ends.

