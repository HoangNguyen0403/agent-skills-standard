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

Any touch to auth, money, or a trust boundary is C=2 regardless of size.

## Worked Examples

| Task | S | N | C | Total | Tier |
| --- | --- | --- | --- | --- | --- |
| Fix typo in an error message string | 0 | 0 | 0 | 0 | low |
| Add a null guard in one request handler | 0 | 1 | 0 | 1 | low |
| Change validation rules across 3 files in the forms module | 1 | 1 | 1 | 3 | medium |
| Add a new CSV export endpoint in the reporting module | 1 | 2 | 1 | 4 | medium |
| Fix order-total calculation spanning order-service and billing-service | 2 | 1 | 2 | 5 | high |
| Rewrite session handling in the auth module | 2 | 2 | 2 | 6 | high |

## Inference Labelling

- From ticket text only: `SNC (inferred from ticket)`.
- After `specialist-codebase-scout` impact radius: `SNC (evidence: scout)`.
- When the two disagree, the higher score wins until proven otherwise.
