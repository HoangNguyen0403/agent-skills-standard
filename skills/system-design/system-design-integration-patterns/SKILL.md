---
name: system-design-integration-patterns
description: "Choose distributed integration and evolution patterns by the constraint each removes: outbox, CQRS, event sourcing, saga orchestration or choreography, leader election, sidecar, anti-corruption layer, and strangler-fig migration. Use when services must stay consistent across a boundary."
metadata:
  triggers:
    keywords:
      - cqrs
      - event sourcing
      - saga
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
| A business transaction spans services and cannot hold a lock | Saga with compensations | Compensating action per step; no isolation |
| Exactly one instance may run a job or own a resource | Leader election (lease-based) | Fencing tokens; split-brain handling |
| Cross-cutting concerns repeated in every service | Sidecar or ambassador | Another process per pod to operate |
| A legacy or third-party model would infect the domain | Anti-corruption layer | A translation layer to maintain |
| Each client surface needs a different aggregate shape | Backends-for-frontends | One backend per surface, owned by that team |
| A monolith must be replaced without a rewrite freeze | Strangler fig | Dual routing and a live seam until the last slice moves |

## Consistency Across a Boundary

- Never dual-write. Write to your own store, then publish from the outbox or CDC stream; anything else drifts silently.
- Saga orchestration puts the sequence in one coordinator: use it beyond ~4 steps, or when compensations must be reasoned about together.
- Saga choreography lets each service react to events: use it for short flows between 2-3 services that already publish.
- Every saga step needs its compensation defined before implementation. A step with no compensation is a step that must move to the end or become idempotent-retryable.
- Correlate everything: one id threads the whole flow through logs, events, and compensations.

## Evolution

- Strangler fig: route one slice at a time behind a facade, run old and new in parallel, retire the old path only after traffic and data are verified.
- Branch by abstraction inside a service: introduce the seam, implement behind it, switch, delete the old side.
- Schema and event changes follow expand-contract, as in `system-design-data-architecture`.

## Anti-Patterns

- **No CQRS by default**: separate models only after one model demonstrably fails both sides.
- **No event sourcing for ordinary CRUD**: audit needs an audit log, not a rebuilt world.
- **No dual write**: outbox or CDC, never a database write followed by a hopeful publish.
- **No choreography past 4 steps**: nobody can answer "where is order 123" without a coordinator.
- **No two-phase commit on the hot path**: the coordinator is a SPOF and the locks are the outage.
- **No distributed lock as a correctness mechanism**: leases expire under GC pauses; use fencing tokens or single ownership.

## References

- [Integration Patterns Detail](references/integration-patterns.md) - outbox mechanics, saga compensation table, event versioning, BFF ownership, strangler phases
