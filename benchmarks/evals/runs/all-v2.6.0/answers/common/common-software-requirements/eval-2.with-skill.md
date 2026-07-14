# Technical Requirements Specification: API Timeout Fallback and Event Retries

**Status:** Draft  
**Scope:** Make synchronous API calls and asynchronous event delivery resilient to transient failure while preserving ordering, deduplication, and observability. No source PRD or acceptance criteria were provided, so `BRD-OBJ-TBD`, `REQ-TBD`, and `AC-TBD` must be replaced before approval.

## 1. Traceability

| BRD objective | PRD requirement | AC | SRS | Verification |
| --- | --- | --- | --- | --- |
| BRD-OBJ-TBD | REQ-RESILIENCE-TBD | AC-TBD | SRS-RES-001 | API timeout integration test |
| BRD-OBJ-TBD | REQ-RESILIENCE-TBD | AC-TBD | SRS-RES-002 | Event retry/failure-injection report |
| BRD-OBJ-TBD | REQ-RESILIENCE-TBD | AC-TBD | SRS-RES-003 | Contract, replay, and observability tests |

## 2. Requirement cards

### SRS-RES-001 — API timeout fallback

- **Statement:** The API client shall enforce a 2-second connect timeout, 5-second per-attempt read timeout, and 10-second total deadline for a dependency call.
- **Input / trigger:** An authenticated API request invokes the dependency through the resilience client.
- **Processing rule:** Retry at most twice, with exponential backoff and jitter, only for connection failures, timeouts, `429`, and `5xx`; propagate a cancellation when the total deadline expires.
- **Output:** Return the dependency response when successful, preserving correlation ID. If a safe cached or previously committed result exists, return it with `X-Result-Source: fallback`.
- **Error / fallback:** If no safe fallback exists, return `504 DEPENDENCY_TIMEOUT` for deadline exhaustion or `503 DEPENDENCY_UNAVAILABLE` for classified unavailability. Do not return fabricated success or retry non-idempotent operations without an idempotency key.
- **Priority / status:** Must / Draft.
- **NFR impact:** NFR-RES-001, NFR-RES-002.
- **Verification:** Unit tests for classification/deadlines; integration tests with delayed, reset, `429`, `5xx`, and cancellation responses; load test deadline behavior.

### SRS-RES-002 — Durable event retry

- **Statement:** The event publisher shall durably record an event before acknowledging the originating transaction and retry delivery of retryable failures.
- **Input / trigger:** A domain transaction emits an event with event ID, type, schema version, aggregate ID, occurred-at timestamp, and correlation ID.
- **Processing rule:** Use an outbox or equivalent durable queue. Retry `408`, `429`, network failures, and `5xx` up to 8 attempts using exponential backoff with jitter over 15 minutes. Use a stable event ID and consumer deduplication key.
- **Output:** Mark `PENDING`, `DELIVERED`, or `DEAD_LETTER`; record attempt count, last error class, and next-attempt time. A successful consumer acknowledgment marks delivery complete.
- **Error / fallback:** Do not retry permanent `4xx` schema/authentication errors. Move exhausted or permanent failures to a dead-letter store, alert operations, and provide replay tooling that preserves the original event ID.
- **Priority / status:** Must / Draft.
- **NFR impact:** NFR-RES-003, NFR-RES-004.
- **Verification:** Integration tests with a fake broker/consumer; failure injection for each class; dead-letter and replay tests; inspect database-to-broker consistency.

### SRS-RES-003 — Ordering and observability

- **Statement:** The event system shall preserve per-aggregate ordering and expose complete retry telemetry.
- **Processing rule:** Partition events by aggregate ID or enforce an equivalent sequence number. Consumers reject or defer an event whose predecessor is missing, while duplicate event IDs are acknowledged without repeating side effects.
- **Output / telemetry:** Emit metrics for attempt count, age, delivery latency, retry rate, dead-letter count, and fallback responses; log structured event ID, aggregate ID, dependency, attempt, outcome, and correlation ID.
- **Error / fallback:** Alert when oldest pending event age exceeds 60 seconds or dead-letter count is nonzero; do not log credentials, tokens, or sensitive payloads.
- **Priority / status:** Must / Draft.
- **NFR impact:** NFR-RES-003, NFR-RES-004.
- **Verification:** Consumer contract tests, out-of-order and duplicate tests, metric/log schema tests, and alert rule validation.

## 3. Functional flows

| Flow | Actor / goal | Normal course | Alternatives | Exceptions |
| --- | --- | --- | --- | --- |
| FLOW-RES-001 | API caller completes one request session | Call dependency → receive response → return result | Transient error → bounded retry; safe cached result → fallback response | Deadline exceeded → typed `504`; unsafe operation is not replayed |
| FLOW-RES-002 | Event worker delivers one event | Commit outbox row → publish → consumer acknowledges → mark delivered | Retryable failure → scheduled retry; duplicate → acknowledge without side effect | Permanent failure/exhaustion → dead letter and alert |

## 4. Interface and data contracts

API errors are stable JSON: `{code, message, correlationId, retryable}`. Event envelope is `{eventId, type, schemaVersion, aggregateId, sequence, occurredAt, correlationId, payload}`. The outbox has a unique `eventId`, delivery state, attempt count, next-attempt timestamp, and last-error classification. Consumers must be idempotent and acknowledge only after their side effect is committed.

## 5. Non-functional requirements

| ID | Requirement | Threshold | Measurement |
| --- | --- | --- | --- |
| NFR-RES-001 | API dependency calls must honor total deadline | 99.99% of calls terminate within 10.5 seconds including cleanup | Distributed tracing and timeout integration test |
| NFR-RES-002 | Safe fallback availability | ≥99.9% of eligible requests return the cached/committed fallback | SLI by fallback eligibility |
| NFR-RES-003 | Event delivery latency for healthy dependencies | P95 ≤30 seconds from commit to acknowledgment | Outbox/broker metrics |
| NFR-RES-004 | Duplicate consumer side effects | 0 in 10,000 replayed deliveries | Replay integration test and business-ledger comparison |

## 6. Security, compatibility, and verification matrix

Authenticate API callers, authorize access to fallback data by tenant and resource owner, encrypt durable events, and redact sensitive payload fields. Version event schemas; consumers must remain backward compatible for at least one prior schema version. Roll out behind metrics and a feature flag with dead-letter replay disabled until tested.

| Requirement | Lane | Evidence |
| --- | --- | --- |
| SRS-RES-001 | Unit, integration, E2E | Timeout/fallback test report and traces |
| SRS-RES-002 | Integration, resilience, manual | Failure-injection, DLQ, and replay evidence |
| SRS-RES-003 | Contract, integration, security | Ordering/deduplication and telemetry validation |

**Outcome report:** `feature_status=Draft/needs PRD trace`; completed evidence is none; missing evidence is approved source IDs, dependency-specific fallback policy, and test reports. Next workflow: confirm PRD/AC scope, baseline the SRS, then implement with resilience and contract-test tasks.

