# Distributed Systems: CAP Theorem & Consistency Patterns

## CAP Theorem

CAP constrains a distributed data system's choices **when a network partition occurs**. When the network may partition, a distributed read/write object cannot guarantee both linearizability and CAP availability in all executions. Linearizability means each concurrent operation history is equivalent to a legal sequential history that preserves real-time order: if one operation completes before another begins, it must appear first; each read returns the value of the latest preceding write in that order. CAP availability requires every request received by a non-failing node to terminate with a valid result for the requested operation. Refusing or failing a request because the node cannot satisfy that result sacrifices availability; an error response is not availability. Partition tolerance describes operation despite lost communication; it is not an optional product mode for a networked system. Outside a partition, this theorem does not say a system must choose consistency or availability.

Do not label products “CP” or “AP” as a complete design decision, and do not equate CAP availability with an uptime percentage. State which requests may fail, block, or return stale data during a partition, and which consistency guarantee is retained. Gilbert and Lynch formalize the result for atomic/linearizable objects in asynchronous networks and discuss partially synchronous models: [Brewer’s Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services](https://www.cs.princeton.edu/courses/archive/spr22/cos418/papers/cap.pdf).

## Eventual Consistency {#eventual-consistency}

“Eventually” provides no fixed freshness bound by itself. State the freshness or convergence objective, its measurement point, and what clients or operators observe when it is missed. The achievable bound depends on the mechanism and failure conditions; under a prolonged partition, convergence may wait for communication to recover.

Design rules:

1. Define replay and conflict behavior for writes; use the [idempotency contract](idempotency-contract.md) where retries can repeat effects.
2. Choose conflict resolution (for example, last-write-wins, versioning, CRDT merge, or application decision) from the business invariant.
3. State read-your-writes and monotonic-read needs, and the mechanism or explicit limitation for each.

## Idempotency {#idempotency}

Idempotency preserves the intended effect of one business operation when a request is repeated; it does not require every API to return byte-identical responses. Define a stable business-operation identity, parameter matching, concurrent duplicate handling, retention/replay boundary, commit/crash recovery, and API-specific client result. See the [idempotency contract](idempotency-contract.md) for the required scenario ladder and verification.

HTTP method semantics and API contracts differ: `GET`, `PUT`, and `DELETE` are idempotent by HTTP semantics; `POST` is not inherently so. An API may provide idempotent `POST` behavior through an explicit contract. Stripe documents API-version-specific response replay, parameter mismatch, concurrent conflicts, and key pruning in its [idempotent requests contract](https://docs.stripe.com/api/idempotent_requests).
