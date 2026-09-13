# Phase Deliverables

What each phase hands over, and which diagram (if any) carries it. Interview phases follow the
common seven-step framework; methodology phases are the four gates in
[four-phase-process.md](four-phase-process.md). Diagrams are drawn with
`common-architecture-diagramming` (spec, validate, render, export).

| # | Interview phase | Methodology phase | Deliverable | Diagram (type / audience) | Where `metric`, `constraint`, `evidence` come from |
| --- | --- | --- | --- | --- | --- |
| 1 | Requirements clarification | Phase 1 | Requirement table, out-of-scope fence, `ASSUMED` list | none | - |
| 2 | Back-of-envelope estimation | Phase 2 | QPS avg and peak, storage, bandwidth, working set, shaping quantity, monthly cost | none; these numbers become `metric` values in later phases | - |
| 3 | High-level design | Phase 3 | Component list as `constraint -> component -> cost` | `context` (exec) when externals matter; `container` (tech) always | `metric` = the sizing number; `constraint` = the left side of the line; `evidence` = `docs/design/system-design-[slug].md:<line>` of that line |
| 4 | Data model | Phase 3 | Ownership map, store per access pattern, consistency class per flow | `dataflow` (tech) when data crosses stores | `metric` = rows/day or GB/yr per store; ERDs come from the schema, not from the spec |
| 5 | API design | Phase 3 | One endpoint per functional requirement (contracts finalised in `design-solution`) | `sequence` (tech) for the critical path | edge `metric` = the latency budget per hop |
| 6 | Detailed design / deep dive | Phase 4 | Specialist briefs, failure modes, idempotency rules | `deployment` (where it runs) or `state` (entity lifecycle), only for the 2-3 chosen components | `evidence` = the deep-dive section |
| 7 | Bottlenecks, trade-offs, scaling | Phase 4 | Bottleneck and SPOF list, ADRs with reversal triggers, staged plan, scorecard | none new; re-render the container diagram with the binding-constraint node's `metric` updated and SPOF nodes given `sublabel: "SPOF"` | - |

## Rules

- Quick-sketch depth leaves `evidence` absent, so every box renders UNVERIFIED by design; say so in `scope`.
- One C4 level per diagram; an exec view caps at twelve nodes. Split before you cram.
- Point `evidence` at the heading line of the component block, not an interior line, and re-render when the doc changes.
- A node with no stated number gets no `metric`. Never back-fill a figure to silence the validator warning.
- Files land in `docs/architecture/<slug>-<type>.drawio` plus the exported image; the `.drawio` is the source of truth.
