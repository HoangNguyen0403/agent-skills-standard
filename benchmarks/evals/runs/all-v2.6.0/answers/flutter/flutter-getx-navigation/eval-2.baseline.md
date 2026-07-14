Use `Get.offAllNamed` to replace the entire navigation stack with the checkout route:

```dart
Get.offAllNamed('/checkout');
```

Call it from the cart screen when the user proceeds to checkout:

```dart
ElevatedButton(
  onPressed: () {
    Get.offAllNamed('/checkout');
  },
  child: const Text('Proceed to checkout'),
)
```

`offAllNamed` removes the current route and every previous route, then pushes `/checkout`. Therefore pressing the system back button on the checkout screen will not return to the cart. The checkout route must be registered in `GetMaterialApp`:

```dart
GetMaterialApp(
  getPages: [
    GetPage(name: '/cart', page: () => const CartPage()),
    GetPage(name: '/checkout', page: () => const CheckoutPage()),
  ],
)
```

If you only wanted to remove the cart screen while preserving earlier history, use `Get.offNamed('/checkout')` instead. For the stated no-back-stack behavior, `Get.offAllNamed` is the appropriate method.

