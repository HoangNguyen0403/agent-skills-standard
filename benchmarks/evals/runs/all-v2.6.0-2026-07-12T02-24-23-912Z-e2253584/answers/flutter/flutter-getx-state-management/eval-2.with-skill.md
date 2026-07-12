Register the controller through a Binding with `Get.lazyPut`, then let route ownership determine its lifetime. Do not create it with `Get.put()` inside a widget and do not mark it `permanent: true` merely to share it across screens.

```dart
class CheckoutBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<CheckoutController>(() => CheckoutController());
  }
}

GetPage(
  name: '/checkout',
  page: () => const CheckoutView(),
  binding: CheckoutBinding(),
),
```

All checkout screens can then use the same route-scoped instance:

```dart
class CheckoutView extends GetView<CheckoutController> {
  const CheckoutView({super.key});

  @override
  Widget build(BuildContext context) => Obx(
        () => Text('Items: ${controller.items.length}'),
      );
}
```

Navigate among child screens while keeping them within the checkout flow (for example, nested pages under the checkout route). They resolve the existing controller with `Get.find<CheckoutController>()` or `GetView<CheckoutController>`. GetX keeps that instance while its owning route/dependency is in use and disposes it when the flow is removed from navigation. Put cleanup such as cancelling streams in `onClose()`:

```dart
class CheckoutController extends GetxController {
  final items = <String>[].obs;

  @override
  void onClose() {
    // Cancel subscriptions or release resources owned by this controller.
    super.onClose();
  }
}
```

If the screens do not belong to one route flow, define the controller once in the Binding of their common parent route instead of registering it separately in every screen. That gives the intended app-running lifetime for that feature and automatic disposal when the parent feature route is gone.

