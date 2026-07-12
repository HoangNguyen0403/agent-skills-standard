# Payment Checkout Requirements — Discovery Draft

Checkout is high risk and cannot be specified safely from the feature name alone. Establish the business objective, payment responsibilities, supported markets, and compliance boundary first.

1. Which actors and purchase model? a) Customer buying a one-time item b) Customer starting a subscription c) Business purchasing seats d) Multiple models.
2. What payment methods and markets? a) Cards only, one currency b) Cards + wallets c) Bank/deferred methods d) Multiple countries/currencies; list the exact scope.
3. Who owns payment processing and compliance? a) Hosted provider checkout b) Provider elements in our UI c) Internal processing (requires explicit security/compliance review). Name provider, tax, refund, dispute, and SCA/3DS responsibilities.
4. What is the required outcome? a) Successful payment completion b) Reduced checkout abandonment c) Faster fulfillment d) Other; provide baseline and target.
5. What order states and operational rules are required? a) Pending/succeeded/failed b) Add refund/cancelled/disputed c) Include retries, idempotency, webhooks, reconciliation, and customer support workflows.

## Provisional scope and traceability

After answers, link to a business objective such as `OBJ-CHECKOUT-001` and define requirements including `REQ-CHECKOUT-001` (review and consent), `REQ-CHECKOUT-002` (payment authorization), `REQ-CHECKOUT-003` (order/payment state reconciliation), and `REQ-CHECKOUT-004` (failure and recovery). Each requirement needs owner, priority, status, and mapped `AC-*` criteria.

Example criterion, subject to approved provider and states: **Given** a valid order and authorized customer, **when** payment confirmation is received, **then** the order is marked paid exactly once and the customer receives the approved confirmation. Also specify invalid input, decline, timeout, duplicate submission, interrupted redirect, webhook replay/out-of-order delivery, refund/dispute, accessibility, localization, privacy/security, analytics, and support evidence. A technical contract/SRS and security review are required alongside the PRD; do not invent provider behavior in the product spec.

