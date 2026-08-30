# Integration Patterns Detail

## Transactional Outbox

The only safe way to change state and tell the world about it.

1. In one local transaction, write the business row and an `outbox` row holding the event payload.
2. A relay reads unpublished outbox rows and publishes them, marking each sent.
3. Consumers deduplicate on the event id, because the relay guarantees at-least-once.

| Relay | How | Trade-off |
| --- | --- | --- |
| Poller | Query unsent rows on an interval | Simple, no extra infrastructure; adds publish latency |
| CDC | Stream the database log (Debezium and similar) | Low latency, no query load; a connector to operate |

Monitor outbox depth and oldest-unsent age. Depth alone hides a stalled relay; age catches it.

## Saga Design

Choose the coordination style, then write the compensation table before any code.

| Style | Where the sequence lives | Fits |
| --- | --- | --- |
| Orchestration | One coordinator service or workflow engine | 4+ steps, complex compensation, auditable state |
| Choreography | Each service reacts to events | 2-3 steps between services that already publish |

Example compensation table for a booking flow:

| Step | Forward action | Compensation |
| --- | --- | --- |
| 1 | Reserve inventory | Release reservation |
| 2 | Authorize payment | Void authorization |
| 3 | Confirm booking | Cancel booking and notify |
| 4 | Send confirmation | None - move last, or make it idempotent |

Rules that hold for every saga:
- A step with no possible compensation belongs at the end of the sequence.
- Compensations are themselves retryable and idempotent; they run when things are already broken.
- Persist saga state; an in-memory saga does not survive the deploy that happens mid-flow.
- Carry one correlation id through every step, event, and compensation.

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
