# Critical-Flow Contract

Use this contract for a critical user journey or data path whose failure can violate a requirement, invariant, trust boundary, or lifecycle promise. It is mandatory reasoning, not a mandatory diagram or a form that must be completed field-by-field for every path. Keep the record proportional; mark material unknowns as assumptions or decisions needed.

## Minimum record

- **Identity and trace:** stable `FLOW-*` record ID linked to applicable `REQ-*`, `HLD-*`, `CMP-*`, `LLD-*`, and observable `VER-*` condition. `FLOW-*` is a design-record link, not an outcome-schema field or enum.
- **Source and sink:** named producer/entry and consumer/visible result; state the system, tenant, or user boundary and the logical or physical scope.
- **Payload and purpose:** name the data and why it moves; name each material validation, filtering, enrichment, aggregation, or conversion. Data labels are nouns; transformations are verbs.
- **Authority and copies:** name the authoritative owner and who may change it. Distinguish queues, caches, projections, files, replicas, and client state as derived or transient copies; identify their rebuild or refresh source.
- **Invariant and outcome:** state what must remain true across retries, duplicates, reorder, interruption, conflict, or deletion, and what the user sees on success, pending, failure, or unknown outcome.
- **Verification:** cite an observable pass/fail condition that exercises the adverse timeline, not merely a document or diagram's existence.

## Add fields when material

Record trigger/protocol; sync or async delivery; durable-ack point; consistency and freshness target; ordering and deduplication identity; retry/replay limits; backlog/backpressure and recovery; capacity target/estimate/measurement and provenance; tenant/auth/privacy boundary; retention, expiry and deletion propagation; schema compatibility, migration, rollback and restore; evidence source and unresolved assumptions. Omission or `N/A` needs a scope/risk reason when the concern could affect the invariant.

## Work order

Trace ingress, each meaningful transformation, authoritative and derived state, consumers, and trust boundaries before selecting stores or transport. Describe an adverse timeline and its user-visible result. Then choose a logical flow view if it clarifies movement/ownership; bind to physical components after those decisions. A table or prose is sufficient when a picture adds no decision value. A stateless computation or SDK function may have no store, queue, or database; explain why none is needed rather than inventing one.

Choose sync, async, or hybrid transport from the invariant, latency, durability, coupling, and failure behavior. State what acknowledgment means and how uncertainty is resolved. A queue is not durability until its acceptance/acknowledgment contract says so. A cache, search index, or replica is not authoritative merely because users read it. A domain label alone does not require a saga, specialized store, or universal strong-consistency designation; justify the mechanism per operation and boundary.

## Linked views

Keep traceability `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*`; attach applicable `FLOW-*` records to those artifacts without adding a machine-readable outcome field. Dataflow covers movement, transformation, and authority; sequence covers ordering and acknowledgment; state covers lifecycle; ERD covers schema relationships; deployment covers runtime placement. A DFD does not prove call order, concurrency, state transitions, security, or deployment. See [DFD semantic review](dfd-review.md), [worked flows](worked-flows.md), and the shared [diagram selection guide](../../../common/common-architecture-diagramming/references/diagram-selection.md).
