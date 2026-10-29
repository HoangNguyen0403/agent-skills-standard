---
description: "Turn an approved PRD or implementation goal into SRS/FRS technical requirements (How), architecture, contracts, and verification decisions."
---

# Design Solution Workflow (SRS/FRS / How)

Goal: Produce a build-ready technical design with explicit boundaries, contracts, risks, and tests.

## Steps

1. Load inputs:
   - Load baseline SRS/FRS, requirements guidance, authoritative work-item/source reference + approved revision + scope owner + prior scoped-approval reference, inherited risk/operator metadata, implementation plan, matched skills, architecture docs, and trace source; report unavailable inputs without guessing.
   - Carry `delivery_mode` and sensitivity: `brief` uses its approved ticket and writes no SRS; `standard`/`extended` design only where technical decisions or contracts need it.
2. Define architecture:
   - Name bounded contexts, module/data owners, migration needs; select technical contracts/views without inventing product scope. Consume or create HLD trace: requirements, audience, scope, shaping constraints, lifecycle status, ownership, failure domains, decisions; define dependency direction, component RACI, and sync/async/hybrid communication.
   - Define early mock/schema contracts for parallel start; create LLD contracts only for components/flows needing them. Select views by question through `common-architecture-diagramming` or `requirements-modeling.md`; diagrams are not mandatory when prose or tables are precise.
3. Define contracts:
   - Functional flows (FRS): trigger, inputs, validations, outputs, error states. Complex flows: one actor, one goal, one session; split normal, alternate, and exception courses.
   - Requirement cards: statement, priority, status, source, behavior, failure/fallback, NFR/security impact, and one verification mapping (lane plus evidence artifact).
   - APIs/events/storage: input/output/error contracts, async guarantees, ownership, retention, migration; link existing ADR/API/schema instead of restating.
   - Carry `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*` IDs; LLD covers ownership, consistency, ordering/idempotency, adverse timeline, recovery, and verification.
   - NFRs: numeric thresholds where appropriate; categorical verifiable invariants for security, access, and integrity; never fabricate numbers. Sensitive changes keep their technical design, failure analysis, and explicit human/governance gate regardless of the mode label.
4. Plan verification:
   - Unit, integration, E2E, visual, mobile, security, and migration checks; failure mode analysis for dependencies, fallbacks, retries, and rollback/degradation. Save to `docs/srs/srs-[slug].md` when file writes are allowed; record evidence in `docs/srs/srs-walkthrough-[slug].md`.
5. Record ADR and route:
   - Write one concise ADR when architecture or a public contract changes; continue when patterns are inferable; return BLOCKED for missing authority inputs, cross-team contracts, migrations, permissions, or NFR uncertainty; route next step to `implementation-readiness` or `dev-fix`.

## Runtime Contract
- Use after PRD or approved implementation when design is needed. Required: original work-item/source reference, approved revision, scope owner, prior scoped-approval reference, and enough PRD/ticket context for contracts. Return BLOCKED for missing authority inputs or cross-team contracts, migrations, permissions, or NFR uncertainty.

## Handoff Payload
- `slug`, `delivery_mode`, authoritative original work-item/source reference + approved revision + scope owner + prior scoped-approval reference, inherited risk/operator metadata, design artifact path/revision (SRS; approved source ticket only for brief), requirement trace, architecture decisions, diagram paths, contracts, data/migration plan, NFR thresholds, verification matrix, ADR, separate pending design approval, run record path, next workflow.

## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Technical Design (SRS/FRS): [Name]
## Decision Brief
- Changes since approved revision: [what changed]
- Recommendation: [technical decision]
- Impact if wrong: [consequence]
- Evidence and limitations: [confirmed(<source>); unverified]
- Unresolved decision: [decision] — owner: [owner] — affected slice: [slice]
- Approval sought: [exact approval and authority]
- Independently ready slices: [slices]
## Trace Source
- PRD or approved ticket + revision: [path/reference]
- Source IDs: [REQ-001], [AC-001]
## Architecture And Contract Delta
- Delta against existing baseline: [changed components/contracts]
- Ownership and boundaries: [module/data owners]
## Technical Requirements
### SRS-001: [Title]
- Statement: [behavior when condition]; priority: [Must/Should/Could]; status: [Draft/Approved/Tested]
- Source: [REQ-001], [AC-001]
- Behavior / failure: [trigger, input, validation, output; error or fallback behavior]
- NFR / security impact: [threshold or verifiable invariant]
- Verification: [lane] — [evidence artifact]
## Extensions
| Trigger | Required extension |
| --- | --- |
| API, event, or storage contract change | Interface and data contracts |
| Numeric performance/reliability commitment | NFR thresholds and measurement |
| Sensitive change | Security controls, human gate, failure analysis |
| Migration or compatibility impact | Migration and rollback plan |
## Blockers And References
- blocked(<slice>, <owner>, <required input>) — [references]
## Status And Receipt
- `feature_status`: [status]
- Run record: `artifacts/runs/[slug]/[run-id].json` (schema-valid is not an approval)
## Next Workflow
- [implementation-readiness | dev-fix]
```
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: design-solution, feature_status: design_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: implementation-readiness, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Cost Report
Call `get_session_cost(workflow="design-solution")` before final handoff.
