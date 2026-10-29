---
description: "Verify feature, bug, UI, API, mobile, security, or deployment work against acceptance criteria."
---

# Verify Work Workflow

Goal: Prove the delivered change works against explicit acceptance criteria before handoff.

1. Load the approved brief/acceptance criteria and changed files; carry inherited `operator_profile`, risk tier, `delivery_mode`, authoritative work-item reference plus source revision, and approval reference instead of re-deriving authority. Preserve sensitive minimum medium risk (high when required); require PRD/SRS trace only for governed work, and take brief-mode criteria from the approved record without minting IDs.
2. Select applicable unit/component, integration/API, E2E/visual, mobile, security, migration, deployment-smoke, and acceptance lanes. For the four V-Model levels and required evidence, use `skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md`.
3. Run smallest reliable checks first. Use Playwright/Appium only for changed user behavior; run driver `scripts/preflight.sh` and use the first available rung (web: CLI then MCP; mobile: local then cloud). Missing required driver without exported proof is `BLOCKED (driver: <name>)`. Use ticket/TC integrations only when configured; otherwise request exports or mark that lane BLOCKED.
   - Mobile evidence (Contract C6): record app artifact digest/build, OS/device cell, simulator vs physical designation, and permissions; browser emulation or component mocks cannot prove native mobile behavior.
   - Capture applicable logs, screenshots, traces, or terminal summaries as `<AC|step>-<before|after>.*` under `.playwright-cli/<session>/` or `.appium-mcp/<session>/`. Bug fixes prove before-failure and after-success; preserve every applicable driver and verification lane.
4. PASS only when all approved criteria are proven with fresh evidence and required independent-review/approval gates are met; FAIL when a defect or missed requirement remains; BLOCKED when a required lane lacks its driver or evidence, or environment, credentials, or approval prevents proof. Record this as technical verification only: it never grants business acceptance or deployment authority, and unreferenced acceptance/release evidence stays `not assessed`.
5. If observed behavior exceeds the approved brief, do not silently change scope or redefine criteria: route the decision to the owner, then verify against the resolved contract. Governed behavior drift requires PRD/SRS updates before PASS.
6. Record low-risk checks, outcomes, and evidence in chat/task report; do not require new BRD/PRD/SRS, task-list, REQ/AC-ID, trace, or walkthrough artifacts. Governed work updates BRD-to-PRD-to-SRS/FRS trace and `docs/srs/srs-walkthrough-[slug].md`, and runs `rtk pnpm audit:trace --slug <slug> --required` in that lane; brief tickets acquire no document-trace gate, and no-selector discovery remains optional. Where a change claims a run record, run `rtk pnpm audit:outcome --records --required --slug <slug> --workflow <workflow> --run-id <run-id>`; schema-and-scope validity is not approval. When an initiative uses product evidence (`docs/product/<slug>/evidence.json`), carry measurement owner, registered MET baseline or exact scoped exception DEC, query, instrumentation, cohort, window, guardrails, and review trigger; never fabricate agent-created baselines, approvals, or ROI. Proposal in ledger is not host execution or deployment permission. Handoff carries executed results, open defects, and residual risks (STLC Stage 6 closure); unresolved defects or blocked lanes route to `dev-fix` or remain explicit residual risks.
## Runtime Contract
- Use after implementation, before handoff, or when validating a bug fix.
- Required inputs: explicit scope plus acceptance criteria or expected behavior.
- Return BLOCKED when a required lane lacks its driver or evidence, or when
  environment, credentials, or approval prevents proof; return FAIL for an
  observed defect or missed requirement. Feature verified status is retained
  when product value is pending or inconclusive.
## Handoff Payload
- `operator_profile`, `delivery_mode`, work-item reference plus source revision, approval reference, criteria results, comparative evidence, measurement contract refs (owner, baseline or exception, guardrails) when present, evidence-lane refs (technical/acceptance/release), risks, evidence location (chat/task report for low-risk; governed trace/walkthrough path when governed), outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Governed Walkthrough Template
```md
# Walkthrough: [Name]
## Scope
## Acceptance Criteria Trace (stable IDs when governed)
| Criterion | Status | Proof / Evidence |
| --- | --- | --- |
| [criterion] | PASS/FAIL | [evidence] |

## Comparative Evidence (Before vs After)

## Negative Testing Proof (Fail Cases)

## Evidence (Screenshots/Logs)

driver: playwright-cli | playwright-mcp | appium-mcp | none (BLOCKED); evidence_dir: <relative path>

## Risks Observed

## Next Workflow
```

## Output Template
```md
# Verification Report: [Name]
## Delivery Mode And Work Item
- Mode: brief | standard | extended; work item + revision: [ref @ rev]; approval: [ref]
## Scope
## Checks Run (Lanes)
## Acceptance Criteria Status
## Requirement Trace Status (governed only)
## Evidence Lanes
- Technical verification: [receipts]; business acceptance: [not assessed]; release: [not assessed]
## Observed Risks & Edge Cases

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: verify-work, feature_status: implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: uat-signoff, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
uat-signoff | implement-feature | dev-fix
## Cost Report
Call `get_session_cost(workflow="verify-work")` before final handoff.
```
