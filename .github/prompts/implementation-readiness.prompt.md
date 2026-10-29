---
description: "Verify BRD-lite, PRD, SRS/FRS, UX, and test prerequisites before implementation starts."
---

# Implementation Readiness Workflow

Goal: Decide whether a planned change is ready for implementation or must return to planning/design.

## Steps
1. Load artifacts:
   - Load task-linked approved brief/ticket, PRD/story or equivalent approved evidence, canonical ledger (`docs/product/<slug>/evidence.json`) when present, SRS/FRS when needed, UX/design evidence, implementation plan, and test plan.
   - Do not require a separate filename when an approved task record supplies the necessary information; missing documents do not force repeat intake. A matching record and stable slug are required; unrelated documents/working-tree changes are not authority or approval.
   - Carry the delivered `delivery_mode`, authoritative work-item reference plus source revision, owner, and approval reference from the handoff; do not re-infer them from filenames or surprising tree state.
   - Readiness consumes evidence-lane references, never their claims: technical verification, business acceptance, and release remain separate decisions, and an absent reference is `not assessed`.

2. Check readiness:
   - Approved task record supplies outcome, constraints/non-goals, testable ACs, owner and approval; equivalent approved low-risk evidence suffices without separate BRD/PRD/SRS files. `delivery_mode: brief` requires only that record with outcome, scope fence, owner, observable criteria, approval reference, and verification lane; missing formal IDs are expected, while a sensitive change is never ready as `brief`. `approval: approved` passes; `pending` blocks; `assumed-autonomous` warns and blocks only when `snc_tier=high`. Sensitive trust-boundary changes still require applicable design/human floor.
   - ACs have one observable behavior per AC across happy, edge, and error paths, with necessary preconditions and platform/market/role scope; truth tables for interacting conditions. Examine scope coverage and conflicts before issuing READY or PARTIAL; consequential conflicts block affected slices with consequence, owner, and required input without inventing business/error policy.
   - Affected-scope evidence freshness and current authority: stale or disputed decisions block only the consuming action, never a global block on independent approved scope.
   - Human risk acceptance: where lawful, an explicit recorded release `risk_accept` decision documents uncertainty and rationale; it waives specific baseline sources for release only, but never converts unvalidated/inconclusive evidence into validated proof, and cannot authenticate host approval. An investment `risk_accept` documents uncertainty and rationale without waiving evidence or altering product state. Missing monetary data is not a qualitative-investment blocker.
   - Optional product capability gap: if optional product-evidence capability (`product-evidence` / `product-management` package / script / Node >=20) is absent, record exact gap in `missing_evidence` (e.g. `Capability gap: <pkg> not installed; opt in at a reviewed ref and sync`), preserve `feature_status`, and treat product gate result as an unvalidated proposal only; other missing required tooling or environment remains a BLOCKED prerequisite for the affected slice.
   - Available requirement/design evidence identifies affected modules and consequential API/data/interface/migration/permission/failure/NFR choices; unresolved sensitive or consequential choices route to technical design and human approval.
   - Trace ACs across 4 V-Model levels (Acceptance, System, Integration, Unit) per `skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md` (STLC Stages 1-2); low-risk changes use equivalent existing evidence.
   - UX/design evidence covers loading, empty, error, permission, responsive/mobile cases when UI changes.
   - Mobile readiness (Contract C6): app build/digest/version, OS/device matrix, driver preflight (`appium-mcp`/native runner), permissions, test data/reset (distinguish `fullReset`, `noReset`, real binary upgrade where `noReset != real upgrade`, and state preservation for prior build/session/offline queue), lifecycle mechanism (warm resume vs config change vs true process death where `ActivityScenario.recreate != process death`). Missing build or driver blocks affected mobile slices.
   - Test strategy maps ACs to unit, integration (API contracts/dependencies), system (E2E/mobile), security, Zephyr/manual lanes; tool prerequisites known (credentials, environments, feature flags, test data, MCP). Schedulable delivery dependencies required; unresolved prerequisites block affected slices.
3. Decide:
   - READY: approved evidence, owner, ACs, required design/approval and test prerequisites permit named slice(s) to start.
   - BLOCKED: required authority/approval, owner, unclear AC, consequential design, environment, or risk unresolved; do not recommend unconditional implementation.
   - PARTIAL: name each independently bounded ready slice with owner, approval and verification lane; name each blocked slice with its owner, dependency/input and reason. Only ready slices may flow downstream.

4. Route:
   - For autonomous/channel mode, return READY only with named slices, owners, verification lanes, approval and available required environments.
   - READY -> `implement-feature` or `dev-fix`.
   - BLOCKED -> `plan-feature` or `design-solution`; do not emit unconditional implementation recommendation.
   - PARTIAL -> send only explicitly ready slices downstream with their blockers and owners; downstream execution cannot absorb blocked slices or claim their activation.
   - Write run record to `artifacts/runs/[slug]/[compactISO]-implementation-readiness.json` when writes allowed.
## Runtime Contract
- Use before implementation starts to gate go/no-go.
- Required inputs: matching approved task record/ticket or equivalent evidence, owner, testable ACs and design/test prerequisites applicable to each proposed slice. Missing filenames do not force repeat intake.
- Return BLOCKED only when required authority/approval, owner, unclear AC, consequential design, environment, or risk remains unresolved.
## Handoff Payload
- `slug`, `operator_profile`, `delivery_mode`, work-item reference plus source revision, approval reference, verdict (READY/BLOCKED/PARTIAL), ready slices with criteria refs and verification lanes, blocking gaps, capability gaps, evidence-lane refs, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Output Template

```md
# Implementation Readiness

## Delivery Mode And Work Item
- Mode: brief | standard | extended; work item + revision: [ref @ rev]; owner: [owner]; approval: [ref or pending]
- Evidence lanes: technical [not assessed], acceptance [not assessed], release [not assessed]

## Verdict

## Ready Slices
| Slice | Owner | Criteria refs | Verification lane |
| --- | --- | --- | --- |
| [slice] | [owner] | [REQ/AC or observable criteria] | [lane] |

## Blocking Gaps

| Area | Gap | Owner/Input Needed |
| --- | --- | --- |
| [area] | [gap] | [owner/input] |

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: implementation-readiness, feature_status: design_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: implement-feature, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

## Cost Report
Call `get_session_cost(workflow="implementation-readiness")` before final handoff.
```
