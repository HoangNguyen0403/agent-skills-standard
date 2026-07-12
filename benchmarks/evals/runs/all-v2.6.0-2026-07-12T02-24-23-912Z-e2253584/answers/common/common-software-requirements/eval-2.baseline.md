# Technical Requirements Specification: API Timeout Fallback and Event Retries

## Scope and assumptions

The system calls an external API from a request-driven service and publishes or consumes events through a durable broker. The external API can time out without revealing whether it processed the request. Events use at-least-once delivery. The specification prioritizes bounded failure handling, duplicate safety, and truthful status reporting.

## API timeout requirements

1. Every outbound call shall have explicit connect, read, and total deadlines. No request may wait indefinitely, and the total deadline shall be less than the caller’s own deadline.
2. The client shall classify failures as retryable (connection reset, timeout, selected `5xx`, and documented rate limits), non-retryable (most `4xx`), or unknown outcome (timeout after the request may have reached the server).
3. Retries shall use bounded exponential backoff with jitter, a maximum attempt count, and a total retry budget. The budget shall be configurable per operation and shall not be allowed to exceed the end-to-end latency budget.
4. A retry after an unknown outcome shall be permitted only when the operation is idempotent or carries a stable idempotency token. Otherwise the service shall stop, record the unknown outcome, and reconcile through a lookup or operator workflow.
5. The primary response shall not silently convert an unknown external result into a definitive failure. The API shall return a documented `202`/pending result or a retryable error with a correlation ID when the final state cannot be established.
6. If the primary API is unavailable and a fallback exists, the fallback shall be selected only for explicitly supported operations. The fallback shall have its own timeout, circuit breaker, authentication, schema compatibility, and capacity limits.
7. Fallback responses shall identify their source and freshness where that information affects correctness. The system shall not return cached or degraded data for a state-changing operation unless the contract explicitly permits it.
8. Circuit breakers shall open after a configured failure threshold, prevent retry storms, probe with limited half-open traffic, and close only after successful probes. Rate limits and bulkheads shall isolate callers and dependencies.

## Event retry requirements

1. Producers shall use an outbox or equivalent durable handoff so a committed business transaction cannot lose its event because publication failed.
2. Each event shall include a globally unique event ID, event type/version, aggregate ID, creation time, correlation/causation IDs, producer, and schema-valid payload.
3. Consumers shall be idempotent. They shall persist a processed-event marker or use an equivalent atomic deduplication mechanism before committing side effects. Duplicate delivery shall not duplicate a charge, email, entitlement, or state transition.
4. Consumer retries shall use bounded exponential backoff and jitter. Each delivery shall have a visibility/lease timeout longer than the handler deadline, with explicit extension behavior for long work.
5. Non-retryable messages shall be acknowledged or routed to a dead-letter queue without repeated redelivery. Retry exhaustion shall preserve the original event, error classification, attempt count, and timestamps.
6. Dead-letter messages shall support controlled replay after correction. Replay shall retain the original event ID and add replay metadata; it shall not bypass authorization or idempotency checks.
7. Poison messages shall be isolated so one failing event cannot block unrelated partitions or queues. Ordering requirements shall be documented per aggregate and enforced only where required.

## Observability and operations

Metrics shall cover timeout rate, retry count, retry exhaustion, fallback usage, circuit state, queue age, delivery attempts, duplicate suppression, dead-letter volume, and reconciliation latency. Distributed traces shall propagate correlation and causation IDs across API calls and events. Logs shall be structured, redacted, and safe for replay diagnostics.

## Verification

Automated tests shall inject connect/read/total timeouts, delayed success, duplicate responses, rate limits, circuit transitions, broker redelivery, consumer crashes before and after commit, malformed events, and dead-letter replay. Integration tests shall prove that one logical operation produces one external side effect despite retries. Resilience tests shall verify bounded latency and recovery after dependency restoration. Runbooks shall document reconciliation, DLQ replay, rollback, and alert thresholds.


