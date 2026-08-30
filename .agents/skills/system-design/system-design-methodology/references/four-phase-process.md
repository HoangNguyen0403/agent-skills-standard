# Four-Phase Process

Each phase has an entry condition, an output, and an exit gate. A gate is a user confirmation
in full-session depth, and a labeled assumption in quick-sketch depth.

## Phase 0 - Classify

- Entry: any design request.
- Output: one line stating mode (new design | review existing | interview practice) and depth (quick | full).
- Signals for full session: money moves, data migrates, contracts cross teams, hardware or vendor spend, an irreversible store choice.
- Signals for quick sketch: "roughly", "at a high level", "which approach", exploration with no committed build.
- Escalation is one-way: a quick sketch that hits a hard constraint becomes a full session, announced explicitly.

## Phase 1 - Intake

- Entry: depth chosen.
- Output: requirements table (functional, non-functional, out of scope) with every unknown labeled `ASSUMED`.
- Gate: user confirms the requirement table, or the assumptions are stated in writing.

## Phase 2 - Estimation

- Entry: requirement table exists.
- Output: QPS (average and peak), storage per year, bandwidth, working-set memory, and the single shaping quantity.
- Gate: user confirms the order of magnitude. Wrong-by-10x here invalidates every later decision.

## Phase 3 - High-Level Design

- Entry: numbers confirmed.
- Output: component list, API surface, data ownership map, diagram.
- Method: begin with client, API, service, store. Add each further component with one line of the form
  `constraint -> component -> cost`, for example `120k read QPS on a 3k QPS store -> read-through cache -> stale reads up to TTL`.
- Gate: user agrees to the component set before any diagram is rendered.

## Phase 4 - Deep Dives and Trade-offs

- Entry: component set agreed.
- Output: 2-3 deep dives, bottleneck list, SPOF list, rejected alternatives with reasons, ADRs, scorecard, next scaling step.
- Deep-dive candidates: the highest-QPS path, the strongest consistency requirement, the largest data set, the least reversible choice.
- Gate: scorecard from `system-design-review` reaches an agreed threshold, or gaps are recorded as follow-up work.

## Session Outputs

| Artifact | When produced | Consumer |
| --- | --- | --- |
| Requirement table | Phase 1 | design doc, downstream SRS |
| Capacity numbers | Phase 2 | provisioning, cost model |
| Component and data map | Phase 3 | diagrams, implementation plan |
| ADRs | Phase 4 | future maintainers, review |
| Scorecard and risk register | Phase 4 | readiness gate, roadmap |
