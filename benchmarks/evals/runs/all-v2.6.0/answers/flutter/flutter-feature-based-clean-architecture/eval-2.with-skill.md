Orders should consume loyalty through loyalty’s domain layer only.

- Define a domain entity such as `LoyaltyPoints` and a domain use case, e.g. `GetLoyaltyPoints`, in `lib/features/loyalty/domain/`.
- Inject `GetLoyaltyPoints` into the orders use case/BLoC.
- Configure the concrete loyalty data repository through dependency injection at the composition root.

```dart
// loyalty/domain/entities/loyalty_points.dart
class LoyaltyPoints {
  final int value;
  const LoyaltyPoints(this.value);
}

// loyalty/domain/usecases/get_loyalty_points.dart
abstract interface class GetLoyaltyPoints {
  Future<LoyaltyPoints> call(String customerId);
}

// orders/domain/usecases/create_order.dart
class CreateOrder {
  final GetLoyaltyPoints getLoyaltyPoints;

  CreateOrder(this.getLoyaltyPoints);

  Future<void> call(String customerId) async {
    final points = await getLoyaltyPoints(customerId);
    // Apply order-specific points logic.
  }
}
```

Orders may import loyalty’s domain entities/use cases, but never import from loyalty’s `data/` or `presentation/` layers. Keep the dependency direction `Presentation -> Domain <- Data`; the UI must not call another feature’s repository directly.
