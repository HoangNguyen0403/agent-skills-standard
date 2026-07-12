Orders must not import the loyalty feature's data layer or call a loyalty repository implementation directly. Cross-feature communication may use only domain-level contracts and types.

Expose the needed loyalty capability from `lib/features/loyalty/domain/`, for example a `LoyaltyRepository` interface and a `LoyaltyPoints` domain entity/value type. Then inject an implementation of that interface into an orders domain use case (or an orders presentation BLoC/Cubit when the query is presentation-specific). The implementation remains in `loyalty/data/` and is wired through dependency injection at composition time.

For example:

```dart
// loyalty/domain/repositories/loyalty_repository.dart
abstract interface class LoyaltyRepository {
  Future<LoyaltyPoints> getPointsForCustomer(CustomerId customerId);
}

// orders/domain/usecases/price_order.dart
final class PriceOrder {
  PriceOrder(this._loyaltyRepository);

  final LoyaltyRepository _loyaltyRepository;

  Future<OrderQuote> call(CustomerId customerId, Cart cart) async {
    final points = await _loyaltyRepository.getPointsForCustomer(customerId);
    return OrderQuote.fromCart(cart, loyaltyPoints: points);
  }
}
```

This preserves `presentation -> domain <- data`: orders depends on a stable domain abstraction, while the concrete loyalty data implementation depends on that abstraction. If the interaction becomes a broader cross-feature workflow, place the coordinating application/use-case boundary in an appropriate shared/core composition layer, still without importing another feature's data internals.

