# Review of the naming conventions

`doStuff()`, `handleIt()`, and `process()` hide intent. They force callers and maintainers to inspect the implementation to learn what the function does, and `process()` is especially risky because it can become an overloaded catch-all. Rename functions using a specific verb plus the domain object or outcome.

| Current name | Better shape | Example |
| --- | --- | --- |
| `doStuff()` | domain verb + object | `createInvoice()` |
| `handleIt()` | event/action + subject | `handleCheckoutSubmission()` |
| `process()` | exact operation + subject | `processRefundRequest()` or `calculateOrderTotal()` |

The exact replacement depends on the function's behavior. Do not rename `process()` to another vague synonym such as `doWork()`; name the observable result. A function that validates should be `validatePaymentDetails`, one that persists should be `saveCustomer`, and one that sends a message should be `publishOrderCreatedEvent`. If a function has to be described with “and,” it probably has multiple responsibilities and should be split under the Single Responsibility Principle.

Use consistent naming patterns:

```ts
async function submitCheckoutOrder(order: CheckoutOrder): Promise<OrderReceipt> {}

function calculateOrderTotal(order: CheckoutOrder): Money {}

function isEligibleForRefund(order: Order): boolean {}

function handlePaymentAuthorized(event: PaymentAuthorizedEvent): Promise<void> {}
```

Use `is`, `has`, `can`, or `should` for boolean-returning predicates. Use command verbs such as `create`, `update`, `delete`, `fetch`, `calculate`, `validate`, `publish`, and `parse` when they accurately describe the side effect or result. Avoid unexplained abbreviations, generic nouns like `data` and `item`, and names that conceal side effects such as `getUser()` when the function also mutates state.

Review each rename at its call sites and check whether the function is truly doing one thing. Keep names aligned with the project's casing conventions, and prefer a clear name over a short one. After renaming, run type-checking, tests, and linting so stale references and inconsistent terminology are caught.


