“Verify checkout works for all payment methods” is too broad: it combines multiple independent conditions into one test, making failures hard to isolate and coverage unclear.

Assuming the available methods are Card, PayPal, Apple Pay, and Google Pay, split it into separate test cases:

- Verify checkout works with Card
- Verify checkout works with PayPal
- Verify checkout works with Apple Pay
- Verify checkout works with Google Pay

Keep the checkout steps and expected result consistent, changing only the payment method. If each method has distinct flows or validations, split those into additional method-specific tests.
