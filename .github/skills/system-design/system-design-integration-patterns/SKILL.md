---
name: system-design-integration-patterns
description: "Choose distributed integration and evolution patterns by the constraint each removes: outbox, CQRS, event sourcing, saga orchestration or choreography, leader election, sidecar, anti-corruption layer, and strangler-fig migration. Use when services must stay consistent across a boundary."
metadata:
  triggers:
    keywords:
      - cqrs
      - event sourcing
      - saga
      - durable execution
      - workflow replay
      - reconciliation
      - outbox
      - leader election
      - sidecar
      - strangler fig
      - backends for frontends
      - anti-corruption layer
      - choreography
---

# Integration Patterns

## **Priority: P1 (HIGH)**

Each pattern buys one guarantee and charges operational complexity. Adopt on evidence, not on architecture fashion.

## Selection Table

| Constraint observed | Pattern | Cost accepted |
| --- | --- | --- |
| A write must update the database and publish an event atomically | Transactional outbox | A relay (poller or CDC) to run and monitor |
| Read shape and write shape have diverged and one model serves neither | CQRS | Two models, sync lag, doubled tests |
| The sequence of changes is itself the product (audit, replay, temporal queries) | Event sourcing | Projections, event versioning, no easy delete |
| A business process crosses services and needs recoverable coordination | Saga or durable workflow | Persisted progress, retries, reconciliation, and only feasible compensations |
| Exactly one instance may run a job or own a resource | Leader election (lease-based) | Fencing tokens; split-brain handling |
| Cross-cutting concerns repeated in every service | Sidecar or ambassador | Another process per pod to operate |
| A legacy or third-party model would infect the domain | Anti-corruption layer | A translation layer to maintain |
| Each client surface needs a different aggregate shape | Backends-for-frontends | One backend per surface, owned by that team |
| A monolith must be replaced without a rewrite freeze | Strangler fig | Dual routing and a live seam until the last slice moves |

## Consistency Across a Boundary

- Avoid dual-write: atomically persist local state plus publication intent where both must commit; use an outbox/CDC only when that boundary requires it.
- Deduplicate delivery on the normalized event identity—source plus event ID, or an equivalent globally unique ID—and arbitrate effects on stable business-operation identity. A bare event ID from two sources is two events. Broker delivery guarantees stop at the broker.
- A timeout after a possible commit is an unknown outcome: query or reconcile before retrying, never retry blindly.
- Select saga orchestration or choreography from visibility, ownership, coupling and recovery needs—not a fixed step count.
- Compensate only when the domain permits reversal. Irreversible or ambiguous effects need idempotent retry, reconciliation, or forward recovery; compensation is another fallible effect.
- Keep correlation identifiers for tracing; they never arbitrate effects. Long-running progress must be replay-safe and version-compatible.

## Evolution

- Strangler fig: route one slice at a time behind a facade, run old and new in parallel, retire the old path only after traffic and data are verified.
- Branch by abstraction inside a service: introduce the seam, implement behind it, switch, delete the old side.
- Schema and event changes follow expand-contract, as in `system-design-data-architecture`.

## Anti-Patterns

- **No CQRS by default**: separate models only after one model demonstrably fails both sides.
- **No event sourcing for ordinary CRUD**: audit needs an audit log, not a rebuilt world.
- **No dual write**: where local state and a publication must commit together, use outbox or CDC; never a database write followed by a hopeful publish.
- **No exactly-once claim from broker delivery**: topic-level guarantees do not cover external effects; use inbox dedupe plus operation identity.
- **No universal choreography cutoff**: choose coordination from observability, ownership, coupling and recovery constraints.
- **No two-phase commit on the hot path**: the coordinator is a SPOF and the locks are the outage.
- **No distributed lock as a correctness mechanism**: leases expire under GC pauses; use fencing tokens or single ownership.

## References

- [Integration Patterns Detail](references/integration-patterns.md) - outbox and inbox mechanics, saga coordination and recovery, event versioning, BFF ownership, strangler phases
- [Durable Execution](references/durable-execution.md) - workflow replay, durable timers, activity cancellation, unknown outcomes, effect identity, and version compatibility
