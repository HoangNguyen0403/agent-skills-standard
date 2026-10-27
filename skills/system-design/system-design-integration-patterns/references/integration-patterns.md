# Integration Patterns Detail

## Transactional Outbox

Use an outbox when one local transaction must commit business state and publication intent together; it does not make downstream effects exactly-once. The transaction writes the business row plus an outbox row holding the event payload; a relay publishes committed rows and marks them sent. Duplicate delivery remains possible, so consumers need inbox arbitration. Where publication is not tied to a local commit, publish from durable intent or read the change stream directly instead of adding a table.

| Relay | How | Trade-off |
| --- | --- | --- |
| Poller | Query unsent rows on an interval | Simple, no extra infrastructure; adds publish latency and query load |
| CDC | Stream the database log (Debezium and similar) | Low latency, no query load; a connector to operate |

Monitor outbox depth and oldest-unsent age. Depth alone hides a stalled relay; age catches it. See [Debezium's outbox event router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html) for the CDC form.

## Inbox and Duplicate Delivery

Distinguish the two identities before designing either guard:

- **Event ID** identifies one message for delivery deduplication. CloudEvents requires `source` + `id` to be unique per distinct event and allows a re-send to reuse it ([spec](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md#id)). The delivery identity is therefore the pair `(source, id)`, or an equivalent globally unique normalized ID—never the bare `id`.
- **Business-operation ID** identifies the intent and its effect across different events, retries, or workflow replays. Two distinct events may describe the same business operation; one event may be replayed after a crash.
- **Correlation ID** traces a flow and never arbitrates effects.

The inbox record and the local effect must commit in one consistency boundary, keyed on the consumer plus the normalized delivery identity `(source, id)` plus tenant/producer scope where the canonical identity contract requires it; committing the dedupe row before the effect loses the message when the process dies. Retention must cover the source's replay horizon, and expired records need a durable business-state or reconciliation lookup. Broker delivery guarantees do not extend to external effects; an at-least-once consumer plus operation-scoped idempotency is the honest contract. Reuse the canonical [idempotency contract](../../system-design-principles/references/idempotency-contract.md) for identity scope, atomic arbitration, payload conflicts, retention horizons, and unknown outcomes.

Check both edges of the identity: the same `(source, id)` redelivered is one delivery to acknowledge once, while the same bare `id` from different sources names different events and must not be suppressed—dropping it loses a legitimate operation before business arbitration runs. A source-qualified event key is sufficient; no additional store is required.

## Saga Design

Choose orchestration or choreography by visibility, coupling, ownership, failure isolation, and recovery requirements. A fixed number of steps does not determine the coordination style.
For each step, record the forward effect, owner, whether it is reversible, and its recovery path. Compensate only where the domain defines a valid reversal; an irreversible effect may instead require idempotent retry, authoritative reconciliation, or forward recovery. A compensation can fail or be ambiguous and needs its own identity and recovery policy.

Persist enough state to resume after process loss. Carry correlation for tracing, but use business-operation identity—not correlation or delivery identity—to prevent duplicate effects.

When a step's outcome is unknown (timeout after the call, lost reply), record the unknown state and reconcile against the step owner's authoritative record before retrying or compensating. Compensating an effect that may still land creates a second problem; a compensation is another effect that needs its own recovery path. Replay, timers, cancellation, and version compatibility for long-running processes live in [Durable Execution](durable-execution.md).

## CQRS and Event Sourcing

They are separable. CQRS without event sourcing is common and much cheaper.

- **Adopt CQRS** when the write model is normalized for invariants while reads need denormalized aggregates, and one model has demonstrably failed both. Cost: two models, a sync path, and reads that lag writes.
- **Adopt event sourcing** when the sequence of changes is the product: audit trails, replay to a past state, temporal queries, or a domain where "what happened" outranks "what is". Cost: projections to rebuild, event schema versioning forever, and deletion becomes a design problem (GDPR erasure versus an append-only log).
- Read-your-own-writes under CQRS: route the writer's next read to the write model, or block on a version token the projection publishes.

Event versioning rules:
- Events are immutable and permanent. Add fields, never repurpose or remove them.
- Version in the event type (`OrderPlaced.v2`) or carry a schema version field; upcast old events on read.
- Keep a replay test: rebuild a projection from event zero in CI, or the replay path rots unnoticed.

## Leader Election

- Prefer a lease from infrastructure that already exists (a database row with an expiry, a Kubernetes lease, a consensus store) over hand-rolled election.
- The lease holder must renew well inside the expiry, and must stop work immediately when renewal fails.
- Use fencing tokens: every write carries a monotonically increasing token, and the resource rejects a stale one. This is what makes a GC pause survivable; a lock alone does not.
- Design for two leaders existing briefly. If that is catastrophic and cannot be fenced, the work needs single ownership, not election.

## Topology Patterns

| Pattern | Owns | Watch for |
| --- | --- | --- |
| Sidecar | Cross-cutting concerns beside the app (mTLS, retries, telemetry) | Another process per pod; version skew with the app |
| Ambassador | Outbound calls to an external dependency | Hides the dependency's real latency from the service |
| Anti-corruption layer | Translation at a legacy or vendor boundary | Must stay thin; it becomes a second domain model if it grows logic |
| Backends-for-frontends | One aggregate backend per client surface | Owned by the surface team, or it becomes a shared bottleneck again |
| Gateway offloading | TLS, authn, quota at the edge | Business rules leaking into the gateway |

## Strangler Fig

1. Put a facade in front of the legacy path so routing is a decision, not a deploy.
2. Move one slice: implement it new, route a fraction of traffic, compare outputs against the old path.
3. Migrate that slice's data with expand-contract, and verify both stores agree before switching reads.
4. Cut the slice over fully, then delete the legacy code for it. Deleting is part of the step, not a later cleanup.
5. Repeat. The facade disappears only after the last slice moves.

Keep a live list of remaining slices with owners. A strangler migration without a visible remainder becomes a permanent dual system.
