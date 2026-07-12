# Software Requirements Specification: Checkout Retry and Idempotency

## 1. Scope and assumptions

This specification covers a client request to create a checkout/payment session and the server-side coordination with an order and payment provider. It assumes checkout creation is a state-changing operation, clients may retry after timeouts, and the payment provider may also support an idempotency key. Payment authorization is not repeated for the same logical checkout attempt.

## 2. Functional requirements

- The checkout API shall require an idempotency key for every state-changing create request. The key shall be opaque to the server, non-empty, and limited to a documented maximum length (for example, 255 bytes).
- The caller shall send the same key for retries of the same logical operation and shall generate a new key for a new checkout attempt.
- The service shall atomically reserve the key within the caller scope (merchant/account/user as applicable) before creating externally visible state. The uniqueness constraint shall be enforced by durable storage, not by an in-memory cache.
- A request with a previously completed key shall return the original response, including the same checkout/order identifier and stable HTTP status, without creating another order or payment authorization.
- A request with a key currently in progress shall return a documented conflict or in-progress response, or wait for the original operation according to a bounded policy. It shall not start a concurrent duplicate operation.
- Reuse of a key with a materially different normalized request payload shall be rejected with `409 Conflict` (or the API’s documented equivalent). The service shall compare a canonical request fingerprint and shall not expose sensitive payload details in the error.
- Transient failures shall be retried only for operations known to be safe. Each retry shall use bounded exponential backoff with jitter, a maximum attempt count, and a total deadline.
- If the outcome of an external call is unknown, the service shall reconcile using the provider’s idempotency key or lookup API before deciding whether to retry. It shall never blindly repeat a possibly successful charge.
- A terminal failure shall persist the final state and a safe error classification. The response shall allow the client to retry with the same key when the outcome is retryable and shall instruct the client to create a new key when the operation is definitively invalid.
- Cancellation, client disconnect, and process restart shall not release a durable idempotency record prematurely. A recovery worker shall resume or reconcile records left in an in-progress state.

## 3. API and data contract

`POST /checkouts` accepts the checkout payload and `Idempotency-Key`. Successful creation returns `201` with a stable resource ID. A replay returns the stored response. Validation errors return `400/422`; key/payload mismatch returns `409`; authentication/authorization errors return `401/403`; rate limiting returns `429`; unavailable dependencies return a retryable `5xx` response.

The idempotency record shall contain: scoped key, canonical request hash, operation status (`IN_PROGRESS`, `SUCCEEDED`, `FAILED_RETRYABLE`, `FAILED_FINAL`), resource ID, response status/body or response reference, provider correlation IDs, timestamps, attempt count, expiry/retention time, and a schema/version marker. Sensitive card data shall not be stored in the record or logs.

## 4. Consistency and concurrency

Order creation, idempotency reservation, and state transitions shall use transactional boundaries that prevent two workers from owning the same key. External side effects shall be represented by an outbox or durable workflow state so a crash between database commit and message publication is recoverable. State transitions shall be monotonic and validated against an explicit state machine.

## 5. Non-functional requirements

- The same-key replay shall meet the documented API latency SLO without invoking the payment provider again.
- The implementation shall tolerate process restarts, duplicate messages, delayed responses, and at-least-once delivery.
- Keys and stored responses shall be retained long enough to cover the supported retry window, then expired safely with documented semantics.
- Metrics shall include duplicate rate, key conflicts, retry attempts, unknown outcomes, reconciliation outcomes, terminal failures, and duplicate external-side-effect prevention.
- Logs and traces shall include a redacted correlation ID, scoped idempotency-key fingerprint, checkout ID, attempt number, and dependency result; raw keys and payment credentials shall be excluded.

## 6. Verification requirements

Tests shall cover concurrent identical requests, replay after success, payload mismatch, timeout after provider acceptance, provider rejection, process crash at each commit boundary, retry exhaustion, recovery of stale `IN_PROGRESS` records, retention expiry, and authorization scoping. Integration tests shall assert exactly one order and exactly one payment authorization for all retry permutations. Load tests shall verify that the uniqueness constraint and replay path remain within the SLO.


