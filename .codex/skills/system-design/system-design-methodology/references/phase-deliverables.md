# Phase Deliverables

What each phase hands over. Interview practice follows the seven-step clock in
[interview coaching](../../system-design-interview-coaching/references/time-budget.md); methodology
uses the four gates in [four-phase-process.md](four-phase-process.md). Diagrams use
`common-architecture-diagramming` only when a named question needs a view.

| Phase | Deliverable | View, if it answers a named question |
| --- | --- | --- |
| Intake | Journeys, requirements, quality scenarios, scope, assumptions, boundaries | None required |
| Estimation | Decision-relevant quantities, provenance, shaping quantity | None |
| Logical flow | Critical-flow record or pointer; logical boundary, data, transformations, authority, invariant, outcomes, verification | Dataflow for movement/transformation/authority |
| Physical HLD | Accepted components, ownership, contracts, constraints and cost | Context/container or prose |
| LLD / practice deep dive | One selected risk/flow contract, adverse timeline, recovery, verification | Sequence for order/ack; state for lifecycle |
| Wrap-up | Changed-constraint adaptation, gaps, decisions, evidence-qualified readiness, next step | Update only a view whose answer changed |

## Flow and trace contract

Use the canonical [critical-flow contract](../../system-design-data-architecture/references/flow-contracts.md), not a repeated checklist. A `FLOW-*` ID links a design record; it is not a field or enum in the machine-readable outcome. Attach applicable flows to the stable trace:

`REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*`

Logical flow reasoning precedes technology selection. Physical binding follows component decisions. `N/A` or omission of a material flow concern needs a scope/risk reason; retain unknown ownership or verification as a visible gap.

## View and evidence rules

- Dataflow covers movement, transformation, and authority; sequence covers ordering and acknowledgments; state covers lifecycle; ERD covers schema relationships; deployment covers runtime placement. A DFD does not prove call order, concurrency, security, state, or deployment.
- Select a view only if it answers a named decision. Prose or a table is sufficient otherwise. Keep decomposition level distinct from C4 level; logical DFD conventions do not prohibit explained physical direct-upload or replication routes.
- The diagram JSON spec owns semantics; `.drawio` is editable presentation; an image is an exported copy.
- Mark estimates and targets as such. A document citation is documented evidence, not deployment proof. Planned checks are not executed checks. In quick sketches, unknown evidence remains explicit.
- Do not invent metrics, stores, queues, diagrams, specialists, or phase-specific sketches to fill a template.
