```dart
class OutOfStockFailure implements Exception {
  final String message;

  const OutOfStockFailure({
    this.message = 'This product is currently out of stock.',
  });

  @override
  String toString() => message;
}
```

Usage example:

```dart
if (product.stockQuantity <= 0) {
  throw const OutOfStockFailure();
}
```

This creates a dedicated failure type with a user-facing message that can be caught and mapped cleanly in your BLoC, Cubit, or UI layer.

