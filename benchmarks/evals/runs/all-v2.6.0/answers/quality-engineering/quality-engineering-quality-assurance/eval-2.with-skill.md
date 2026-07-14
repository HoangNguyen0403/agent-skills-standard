“Verify checkout works for all payment methods” is too broad:

- It tests multiple conditions and implicitly uses **“OR” Logic**.
- It may cover multiple screens.
- It violates the `Module_Action on Screen when Condition` naming convention.
- It cannot isolate which payment method failed.

Apply the guardrail: **1 Test Case = 1 Condition** on 1 screen. Split into separate TCs, for example:

- `Checkout_Verify payment on Payment Screen when Credit Card is selected`
- `Checkout_Verify payment on Payment Screen when PayPal is selected`
- `Checkout_Verify payment on Payment Screen when Apple Pay is selected`
- `Checkout_Verify payment on Payment Screen when Bank Transfer is selected`

Replace the methods with the actual supported methods. If behavior differs between Web and Mobile, add separate `Web_` and `Mobile_` cases; otherwise omit the platform prefix.

Use **High: Critical path** when checkout/payment completion is blocked. Use Normal for standard validation or edge cases, and **Low: Cosmetic** only for visual issues.
