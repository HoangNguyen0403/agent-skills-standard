# Technical Implementation Specification When the PRD Has No AC IDs

## Traceability decision

The absence of acceptance-criteria IDs is a documentation gap, not a reason to omit verification. Create stable implementation requirement IDs (`TR-001` onward) and verification IDs (`V-001` onward) for this release. Each requirement shall link to its source PRD section or statement, design decision, implementation location, and test evidence. When product owners later add AC IDs, preserve the technical IDs and add a one-to-one mapping rather than renumbering history.

## Baseline implementation

1. Define the domain state model and invariants before coding. Document actors, authorization boundaries, inputs, outputs, error states, retries, and terminal conditions. Reject ambiguous behavior as an explicit open decision.
2. Define versioned API and event contracts using schemas. Specify required fields, nullability, limits, error envelopes, compatibility rules, correlation IDs, and idempotency semantics.
3. Separate application use cases from adapters for persistence, external services, queues, clock, and randomness. Inject these boundaries so failure modes can be simulated and the core behavior can be tested deterministically.
4. Use durable transactions for state changes and an outbox for asynchronous side effects. Enforce uniqueness and authorization in the database as well as in application code. Make consumers idempotent and use explicit state-transition guards.
5. Add bounded timeouts, retry budgets, exponential backoff with jitter, circuit breaking, and reconciliation for unknown external outcomes. Do not retry non-idempotent operations without a stable operation key.
6. Add structured logs, metrics, and traces at each boundary. Record operation ID, correlation/causation IDs, state transition, attempt, dependency, and latency while excluding secrets and personal data.

## Requirement and verification matrix

| ID | Technical requirement | Verification |
|---|---|---|
| TR-001 | Valid requests produce the documented state and response. | V-001: contract and service tests for valid and invalid inputs. |
| TR-002 | Unauthorized actors cannot read or mutate another scope. | V-002: positive/negative authorization tests. |
| TR-003 | Duplicate delivery or retry cannot duplicate a state-changing side effect. | V-003: concurrent, replay, and crash-recovery integration tests. |
| TR-004 | External calls and queue handlers terminate within configured budgets. | V-004: injected timeout, slow dependency, and retry-exhaustion tests. |
| TR-005 | Durable records and events can be recovered after process failure. | V-005: fault-injection tests at transaction/outbox boundaries. |
| TR-006 | Operational failures are observable without exposing sensitive data. | V-006: log-redaction assertions, metric checks, and trace inspection. |
| TR-007 | Contract changes remain compatible or are versioned. | V-007: schema compatibility and migration tests. |

## Delivery gates

Before implementation, obtain confirmation for unresolved scope, ownership, data retention, consistency, and failure semantics. During implementation, require schema validation, migration review, unit tests, integration tests, and static/security checks. Before release, run the end-to-end critical path, retry and recovery scenarios, authorization tests, performance checks, and rollback rehearsal. The release report shall list each `TR-*`, its corresponding `V-*` result, environment, build/version, and any accepted risk.

## Handling missing AC IDs

Do not invent product acceptance criteria and label them as approved. Mark the traceability source as `PRD_UNNUMBERED`, assign provisional technical IDs, and maintain an assumptions/open-questions section. If a requirement cannot be derived safely, block only that behavior and request the missing product decision; continue with independently verifiable technical foundations. Update the matrix when AC IDs arrive and require review for any changed scope.


