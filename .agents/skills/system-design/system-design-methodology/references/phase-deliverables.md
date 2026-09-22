# Phase Deliverables

What each phase hands over, and which diagram (if any) carries it. Interview phases follow the
common seven-step framework; methodology phases are the four gates in
[four-phase-process.md](four-phase-process.md). Diagrams are drawn with
`common-architecture-diagramming` (spec, validate, render, export).

| #   | Interview phase                  | Methodology phase | Deliverable                                                                        | Diagram (type / audience)                                                                   | Where `metric`, `constraint`, `evidence` come from                                                                   |
| --- | -------------------------------- | ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Requirements clarification       | Phase 1           | Requirement table, out-of-scope fence, `ASSUMED` list                              | none                                                                                        | -                                                                                                                    |
| 2   | Back-of-envelope estimation      | Phase 2           | QPS avg and peak, storage, bandwidth, working set, shaping quantity, monthly cost  | none; these numbers become `metric` values in later phases                                  | -                                                                                                                    |
| 3   | High-level design                | Phase 3           | Component list as `constraint -> component -> cost`                                | selected `context` / `container` when the audience needs boundaries; otherwise prose        | `metric` = a stated sizing number; `constraint` = the stated left side of the line; `evidence` = the design-doc line |
| 4   | Data model                       | Phase 3           | Ownership map, store per access pattern, consistency class per flow                | selected `dataflow` when data crosses stores and the view answers a question                | `metric` = stated rows/day or GB/yr per store; ERDs come from the schema, not from the spec                          |
| 5   | API design                       | Phase 3           | One endpoint per functional requirement (contracts finalised in `design-solution`) | selected `sequence` for a critical path when hop behavior needs review                      | edge `metric` = a stated latency budget per hop; omit it when unknown                                                |
| 6   | Detailed design / deep dive      | Phase 4           | Specialist briefs, failure modes, idempotency rules                                | selected `deployment` or `state` only for the chosen component and question                 | `evidence` = the deep-dive section; no fabricated metrics                                                            |
| 7   | Bottlenecks, trade-offs, scaling | Phase 4           | Bottleneck and SPOF list, ADRs with reversal triggers, staged plan, scorecard      | no new view required; update only the selected artifact if its question or evidence changed | -                                                                                                                    |

## Rules

- Quick-sketch depth leaves `evidence` absent, so every box renders UNVERIFIED by design; say so in `scope`.
- One C4 level per diagram; an exec view caps at twelve nodes. Split before you cram.
- Point `evidence` at the heading line of the component block, not an interior line, and re-render when the doc changes.
- A node with no stated number gets no `metric`. Never back-fill a figure to silence the validator warning.
- Files land in `docs/architecture/<slug>-<type>.drawio` plus the exported image; the `.drawio` is the source of truth.

## HLD -> LLD Handoff

Use one trace, not a second diagramming lane:

`REQ-* requirement -> HLD-* boundary/decision -> CMP-* component -> LLD-* contract/state rule -> VER-* verification`

- HLD records audience, scope, shaping constraint, ownership, failure domain, lifecycle status, and the decision that must be reviewed.
- LLD records one component or flow's API/event contract, state ownership, ordering/idempotency, adverse timeline, recovery, and verification. “Low-level design” is an alias for LLD.
- A view is selected only when it answers a named question. Its contract declares `audience`, `question`, `decision`, `scenario`, `invariant`, `scope`, `status`, `evidence`, and `omissions`; the renderer-owned spec is authoritative for concrete fields.
- Evidence confidence and lifecycle status are separate. A source-code or documentation pointer proves provenance of the claim, not that the deployment exists. Mark target metrics as target, measured, or estimated.
- HLD/LLD can be prose, tables, or diagrams. Do not require context, container, sequence, dataflow, deployment, or state diagrams when the decision is unambiguous without one.
