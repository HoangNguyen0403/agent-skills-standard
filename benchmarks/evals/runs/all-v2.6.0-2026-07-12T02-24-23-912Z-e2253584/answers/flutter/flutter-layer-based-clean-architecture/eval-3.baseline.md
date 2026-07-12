Put this rule in the domain layer, typically as a use case or domain service, because it expresses business policy rather than UI behavior or data-access mechanics.

For a simple checkout flow, create a `CanCheckout` or `ValidateCheckout` use case that receives the cart total and retrieves available credit through a domain repository contract. It returns a domain result such as `CheckoutEligibility.allowed()` or `CheckoutEligibility.denied(InsufficientCredit())`. The presentation layer invokes it and displays the result; it must not duplicate the comparison rule.

```dart
class CanCheckout {
  const CanCheckout(this._creditRepository);
  final CreditRepository _creditRepository;

  Future<CheckoutEligibility> call(Cart cart) async {
    if (cart.total.isNegative || cart.items.isEmpty) {
      return const CheckoutEligibility.denied(InvalidCart());
    }

    final credit = await _creditRepository.availableCredit();
    return credit >= cart.total
        ? const CheckoutEligibility.allowed()
        : const CheckoutEligibility.denied(InsufficientCredit());
  }
}
```

Keep value invariants close to the domain types as well: `Money` should prevent invalid currency arithmetic, and `Cart` can own rules such as how its total is calculated. The data layer implements `CreditRepository` using an API or local store; it does not decide whether the available credit is sufficient. If checkout needs several collaborating policies, extract a domain service, but keep it independent of Flutter, widgets, Dio, and persistence packages.

