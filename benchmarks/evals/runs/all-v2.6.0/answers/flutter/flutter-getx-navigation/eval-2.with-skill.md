Use `Get.offAllNamed` with the checkout route constant. It removes every existing route from the navigation stack and makes checkout the new root, so the system back action cannot return to the cart.

```dart
abstract class Routes {
  static const cart = '/cart';
  static const checkout = '/checkout';
}

class CartController extends GetxController {
  void beginCheckout() {
    Get.offAllNamed(Routes.checkout);
  }
}
```

Call `beginCheckout()` from the cart screen, such as from the checkout button's `onPressed`. This is context-free GetX navigation; do not use `Navigator.of(context)` or a hard-coded `'/checkout'` string. If checkout needs data, pass it deliberately, for example `Get.offAllNamed(Routes.checkout, arguments: orderDraft)`, and read it in the checkout controller/view via `Get.arguments`.

