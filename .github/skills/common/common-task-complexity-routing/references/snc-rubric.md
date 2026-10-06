# SNC Rubric — Scoring Cues and Worked Examples

## Spread (S)

| Score | Cue |
| --- | --- |
| 0 | One file in one module; no callers outside the file change behavior. |
| 1 | Several files in one module or package; consumers inside the same boundary. |
| 2 | Crosses module, package, or service boundaries; shared schema, API contract, DB migration, or event shape changes. |

Count consumers, not lines. A 3-line change to a shared DTO is S=2.

## Novelty (N)

| Score | Cue |
| --- | --- |
| 0 | Small edit, typo, constant, log line, or removal of existing behavior. |
| 1 | Existing logic modified; behavior contract stays the same shape. |
| 2 | New behavior, new endpoint, new state machine, or rewrite of an existing flow. |

Ask: does an existing test already describe the intended outcome? If none can, N is at least 1.

## Centrality (C)

| Score | Cue |
| --- | --- |
| 0 | Peripheral: docs, tooling, admin-only screens, dead-end utilities. |
| 1 | Shared but non-core: helpers used by several features, non-critical UI. |
| 2 | Core domain, revenue path, auth, payments, permissions, trust boundary, hot path, data integrity. |
Any touch to auth, money, permissions, data integrity, or a trust boundary is C=2 regardless of size. The sensitive-change risk floor enforces minimum `tier=medium` (even if S=0, N=0, total=2). Any sensitive change with non-zero novelty or spread (S≥1 or N≥1 with C=2) escalates to `tier=high`.

## Worked Examples

| Task | S | N | C | Total | Tier |
| --- | --- | --- | --- | --- | --- |
| Fix typo in an error message string | 0 | 0 | 0 | 0 | low |
| Add a null guard in one request handler | 0 | 1 | 0 | 1 | low |
| Clarify log message in auth validator (sensitive floor) | 0 | 0 | 2 | 2 (floor: medium) | medium |
| Update token expiry check in auth utility (high sensitivity) | 0 | 1 | 2 | 3 (effective: high) | high |
| Change validation rules across 3 files in the forms module | 1 | 1 | 1 | 3 | medium |
| Add a new CSV export endpoint in the reporting module | 1 | 2 | 1 | 4 | medium |
| Fix order-total calculation spanning order-service and billing-service | 2 | 1 | 2 | 5 | high |
| Rewrite session handling in the auth module | 2 | 2 | 2 | 6 | high |
## Inference Labelling

- From ticket text only: `SNC (inferred from ticket)`.
- After `specialist-codebase-scout` impact radius: `SNC (evidence: scout)`.
- When the two disagree, the higher score wins until proven otherwise.

## Downward Reassessment

- Permitted ONLY when documented new evidence (e.g. `specialist-codebase-scout` proves the blast radius is strictly isolated with no external consumers) disproves initial inferred spread or centrality.
- NEVER permitted to bypass unresolved risk, required approvals, or the sensitive-change risk floor.
