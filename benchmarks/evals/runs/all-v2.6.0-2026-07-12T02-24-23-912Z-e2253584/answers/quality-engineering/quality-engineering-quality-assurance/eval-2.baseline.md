“Verify checkout works for all payment methods” combines multiple independent conditions and has an unbounded expected result. A failure in one payment method can be hidden by passing methods, and the name does not identify platform, role, data, or method.

Keep shared setup in a reusable precondition, then create one test case per payment method, for example:

- `Checkout_PayByCard on Checkout when valid card is selected`
- `Checkout_PayPal on Checkout when PayPal is selected`
- `Checkout_BankTransfer on Checkout when bank transfer is selected`
- `Checkout_CashOnDelivery on Checkout when cash on delivery is selected`

Each case should select exactly one method, submit the order, and assert that method’s success, confirmation, and any method-specific behavior. Add separate cases for invalid details, cancellation, timeout, declined payment, and retry rather than hiding them in an “all methods” case. Replace the examples with the project’s actual payment methods.
