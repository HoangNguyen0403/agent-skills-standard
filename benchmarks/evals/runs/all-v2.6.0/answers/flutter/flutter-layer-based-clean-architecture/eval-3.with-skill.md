Put that rule in the **domain layer** as a checkout policy/use case because it is business behavior, not UI behavior. It should operate on domain entities/value objects and return a domain result or `Failure`; it must not depend on Flutter widgets, BLoC, Dio, or a DTO.

```dart
// lib/domain/entities/cart.dart
@freezed
class Cart with _$Cart {
  const factory Cart({required Money total}) = _Cart;
}

// lib/domain/entities/customer_credit.dart
@freezed
class CustomerCredit with _$CustomerCredit {
  const factory CustomerCredit({required Money available}) = _CustomerCredit;
}

// lib/domain/failures/checkout_failure.dart
@freezed
sealed class CheckoutFailure with _$CheckoutFailure {
  const factory CheckoutFailure.insufficientCredit({
    required Money required,
    required Money available,
  }) = InsufficientCredit;
}

// lib/domain/usecases/validate_checkout.dart
class ValidateCheckout {
  const ValidateCheckout();

  Either<CheckoutFailure, Unit> call({
    required Cart cart,
    required CustomerCredit credit,
  }) {
    if (cart.total > credit.available) {
      return left(CheckoutFailure.insufficientCredit(
        required: cart.total,
        available: credit.available,
      ));
    }
    return right(unit);
  }
}
```

The application layer's `CheckoutCubit` obtains the cart and credit through domain repository interfaces, invokes `ValidateCheckout`, and converts the result into presentation state (for example, `readyToCheckout` or `creditRejected`). The screen only renders that state and sends the user's checkout action. If available credit comes from an API, its DTO-to-domain mapping belongs in infrastructure before the Cubit calls the domain use case.

