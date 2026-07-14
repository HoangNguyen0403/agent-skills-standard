# Software Requirements Specification: Checkout Retry and Idempotency

**Status:** Draft  
**Owner:** Checkout Platform  
**Scope:** Prevent duplicate checkout side effects while allowing safe retries after transient failures. No linked BRD, PRD `REQ-*`, or `AC-*` identifiers were supplied; the trace entries below are therefore explicit placeholders and require product confirmation before approval.

## 1. Traceability

| BRD objective | PRD requirement | AC | SRS | Verification evidence |
| --- | --- | --- | --- | --- |
| BRD-OBJ-TBD | REQ-CHECKOUT-RETRY-TBD | AC-TBD | SRS-CHK-001 | Idempotency integration test and payment-provider test report |
| BRD-OBJ-TBD | REQ-CHECKOUT-RETRY-TBD | AC-TBD | SRS-CHK-002 | Retry-state integration test and audit-log evidence |
| BRD-OBJ-TBD | REQ-CHECKOUT-RETRY-TBD | AC-TBD | SRS-CHK-003 | API contract tests and load-test report |

## 2. Requirement cards

### SRS-CHK-001 — Idempotency-key enforcement

- **Statement:** The checkout API shall require a client-supplied idempotency key for every operation that can create an order, authorization, capture, inventory reservation, or other irreversible side effect.
- **Priority / status:** Must / Draft.
- **Input and validation:** `POST /checkout` accepts `Idempotency-Key` (1–128 printable ASCII characters), authenticated customer identity, cart/version, currency, and payment details or a payment token. Reject a missing, malformed, or expired key with `400`/`422`; do not call downstream systems.
- **Processing rule:** Scope the key to tenant, authenticated customer, operation, and API version. Persist the request fingerprint before side effects. A repeated key with the same fingerprint returns the original terminal response; a repeated key with a different fingerprint returns `409 IDEMPOTENCY_CONFLICT`.
- **Output:** First request returns the created checkout/order result. A replay returns the same order identifier, payment outcome, and HTTP status as the original terminal response.
- **Error / fallback:** If the request record exists in `IN_PROGRESS`, return `409 REQUEST_IN_PROGRESS` with retry guidance; never start a second checkout. If the record is unavailable, fail closed with `503` and perform no downstream side effect.
- **NFR impact:** NFR-CHK-001, NFR-CHK-002.
- **Verification:** Unit tests for fingerprint and key scope; integration tests with duplicate concurrent requests; E2E test proving one order/payment/reservation.

### SRS-CHK-002 — Bounded retry state machine

- **Statement:** The checkout service shall retry only transient, explicitly classified failures and shall persist each attempt and final state.
- **Input / trigger:** Timeout, connection reset, `429`, or downstream `5xx` from a classified dependency.
- **Processing rule:** Use exponential backoff with jitter, maximum 3 attempts per dependency operation, and an overall 30-second checkout deadline. Do not retry validation errors, authorization failures, card declines, or non-idempotent calls lacking a provider idempotency key.
- **Output:** Store `PENDING`, `SUCCEEDED`, `FAILED_RETRYABLE`, or `FAILED_FINAL` with attempt count, correlation ID, dependency, and timestamps. Return `202` only when the operation is durably pending; otherwise return the terminal result.
- **Error / fallback:** On deadline exhaustion, leave the request recoverable as `PENDING` only when downstream reconciliation is safe; otherwise mark `FAILED_RETRYABLE` and expose status polling. A reconciliation worker must resolve unknown payment outcomes before a new charge is attempted.
- **NFR impact:** NFR-CHK-001, NFR-CHK-003.
- **Verification:** Fault-injection integration tests for timeout, `429`, `5xx`, decline, and unknown outcome; inspect persisted state and downstream call count.

### SRS-CHK-003 — Replay-safe status retrieval

- **Statement:** The service shall expose `GET /checkout/{requestId}` so the authenticated owner or authorized support role can retrieve the persisted checkout state without causing a side effect.
- **Output:** Return request ID, order ID when known, state, attempt count, `updatedAt`, and safe customer-facing error code. Never return raw payment credentials or provider secrets.
- **Error / fallback:** Return `404` for an unknown ID without revealing whether another customer owns it; return `403` for an unauthorized owner access.
- **Verification:** Authorization integration tests, schema contract tests, and security review of redacted responses.

## 3. Functional flow

| Flow | Actor / goal | Normal course | Alternatives | Exceptions |
| --- | --- | --- | --- | --- |
| FLOW-CHK-001 | Authenticated customer completes one checkout session | Submit unique key → validate → persist request → call idempotent downstreams → persist terminal result → return result | Client repeats same request and receives the stored result; transient dependency failure is retried within budget | Key conflict, deadline exhaustion, storage outage, or unknown payment outcome returns a safe error/status without duplicate side effects |

## 4. Interface and data contracts

Request: `Idempotency-Key`, authenticated principal, cart/version, currency, and payment token. Response: `requestId`, `orderId` when available, `state`, `attemptCount`, and `correlationId`. Errors: `VALIDATION_ERROR`, `IDEMPOTENCY_CONFLICT`, `REQUEST_IN_PROGRESS`, `CHECKOUT_PENDING`, `PAYMENT_DECLINED`, and `SERVICE_UNAVAILABLE`.

Persist an idempotency record keyed by `(tenantId, principalId, operation, apiVersion, key)` with request fingerprint, state, response/status, attempt metadata, and expiry. Apply a unique constraint on the key scope. Retain records for at least 24 hours after terminal state, subject to the approved retention policy. Propagate the same correlation ID to payment, inventory, order, and audit events.

## 5. Non-functional requirements

| ID | Requirement | Threshold | Measurement |
| --- | --- | --- | --- |
| NFR-CHK-001 | Checkout API availability excluding planned maintenance | ≥99.9% monthly | SLI from API success/availability probes |
| NFR-CHK-002 | Idempotency lookup and replay overhead | P95 ≤100 ms | Integration/load test with warm storage |
| NFR-CHK-003 | Duplicate side effects under concurrent replay | 0 duplicate orders, charges, or reservations in 10,000 duplicate-request scenarios | Concurrency test plus provider ledger reconciliation |

## 6. Security, compatibility, and rollout

Require authentication and tenant isolation; authorize status reads by owner or approved support role. Store tokens, not raw card data, and redact payment data from logs. Use provider idempotency keys derived from the internal request ID. Keep existing clients compatible during rollout by introducing the required header behind a feature flag, then reject missing keys after migration and monitoring confirm adoption.

## 7. Verification matrix

| Requirement | Lane | Evidence |
| --- | --- | --- |
| SRS-CHK-001 | Unit, integration, E2E, security | Test report, provider ledger, authorization results |
| SRS-CHK-002 | Integration, E2E, resilience | Fault-injection report and state-transition evidence |
| SRS-CHK-003 | Integration, security | Contract and access-control test report |

**Outcome report:** `feature_status=Draft/blocked for source trace confirmation`; completed evidence is none; missing evidence is the approved PRD/AC mapping and all listed test reports. Decision needed: provide `BRD-OBJ-*`, `REQ-*`, and `AC-*` IDs before approval. Recommended next workflow: update the PRD, then baseline this SRS and create implementation/test tasks.

