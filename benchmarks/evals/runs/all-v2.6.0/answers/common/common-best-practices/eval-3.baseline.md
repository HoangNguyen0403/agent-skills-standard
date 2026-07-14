These names are too vague to communicate intent. A caller should be able to understand what a function does, what it operates on, and—when relevant—what it returns or changes without reading the implementation.

- Replace `doStuff()` with a specific action such as `generateInvoice()`, `persistUser()`, or `sendPasswordResetEmail()`.
- Replace `handleIt()` with the event or condition being handled, such as `handlePaymentFailure()` or `onCheckoutSubmitted()`. If it is an event-handler convention, keep the event subject explicit.
- Replace `process()` with the actual operation and subject, such as `parseImportFile()`, `validateOrder()`, `queueNotifications()`, or `calculateRefund()`.

Prefer consistent verb-noun names for commands (`createUser`, `revokeToken`) and noun or predicate names for queries (`userById`, `isEligibleForRefund`, `hasExpired`). Avoid generic verbs like `handle`, `process`, `manage`, and `do` unless the rest of the name makes the exact responsibility clear. Use names that distinguish side effects from pure computation—for example, `calculateTotal` should not also save an order.

Review each function in context: inspect its parameters, return value, side effects, and callers, then choose a name that describes its observable contract. If a function is difficult to name precisely, that often indicates it has multiple responsibilities and should be split. Apply the project's casing and vocabulary consistently, and prefer domain terms already used by the surrounding code so names remain searchable and unambiguous.

