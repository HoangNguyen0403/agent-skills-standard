Replace every empty catch with deliberate handling:

```ts
try {
  await processOrder();
} catch (error) {
  throw new Error("process order failed", { cause: error });
}
```

Choose the appropriate action:

- Log the error when intentionally continuing, including useful context.
- Handle it with an explicit fallback or recovery branch.
- Wrap it with context (`new Error("...", { cause: error })` or `fmt.Errorf("process: %w", err)`).
- Rethrow it when the caller or boundary must decide.
- Map it at the API boundary to a standardized JSON error envelope and HTTP response.
- Keep domain errors framework-independent—never place HTTP status codes there.
- In infrastructure code, wrap third-party or database exceptions; do not leak raw DB errors.
- Use `SCREAMING_SNAKE_CASE` error codes such as `ORDER_PAYMENT_FAILED`.
- Return specific `400` validation errors instead of generic `500` responses.
- Never expose stack traces in API responses.

Do not leave `catch(e) {}` or silently ignore failures. If an error is intentionally discarded, document why and at minimum log or explicitly handle that branch.
