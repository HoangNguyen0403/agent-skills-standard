---
name: verify-work
description: "Verify feature, bug, UI, API, mobile, security, or deployment work against acceptance criteria."
metadata:
  internal: true
  triggers:
    keywords:
    - verify work
    - workflow
---
# Verify Work Skill

> [!IMPORTANT]
> Verify feature, bug, UI, API, mobile, security, or deployment work against acceptance criteria.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Verify Work Workflow

Goal: Prove the delivered change works against explicit acceptance criteria before handoff.

1. Load the approved brief/acceptance criteria and changed files; use inherited `operator_profile` and risk tier. Preserve sensitive minimum medium risk (high when required); require PRD/SRS trace only for governed work.
2. Select applicable lanes across the 4 V-Model levels (Unit, API/Integration, System/E2E-web/mobile, Acceptance) per `skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md`.
3. Run smallest reliable checks first. Use Playwright/Appium only for changed behavior; run driver `scripts/preflight.sh` (web: CLI then MCP; mobile: local then cloud). Missing required driver is `BLOCKED (driver: <name>)`.
   - Mobile evidence (Contract C6): record app artifact digest/build, OS/device cell, simulator vs physical designation, and permissions; browser emulation or component mocks cannot prove native mobile behavior.
   - Capture logs, screenshots, traces as `<AC|step>-<before|after>.*` under `.playwright-cli/<session>/` or `.appium-mcp/<session>/`. Bug fixes must prove before-failure and after-success.
4. PASS only when all approved criteria are proven with fresh evidence; FAIL when a defect or missed requirement remains; BLOCKED when environment, credentials, or approval prevents proof. Technical PASS confirms technical delivery against contract; it NEVER impersonates human UAT signoff (`uat-signoff`) or release deployment approval (`deploy-release`).
5. If observed behavior exceeds approved brief, route decision to owner. Governed work updates PRD/SRS trace and `docs/srs/srs-walkthrough-[slug].md`. Product evidence initiatives carry measurement owner, MET baseline, instrumentation, and guardrails.
6. Handoff carries executed results, open defects, and residual risks (STLC Stage 6 closure). Unresolved defects or blocked lanes route to `dev-fix` or remain explicit residual risks; never claim unverified scope.
## Runtime Contract
- Use after implementation, before handoff, or when validating a bug fix.
- Required inputs: explicit scope plus acceptance criteria or expected behavior.
- Return BLOCKED only when environment, credentials, or approval prevents proof. Feature verified status is retained when product value is pending or inconclusive.
## Handoff Payload
- `operator_profile`, criteria results, comparative evidence, measurement contract refs (owner, baseline or exception, guardrails) when present, risks, evidence location (chat/task report for low-risk; governed trace/walkthrough path when governed), outcome report, next workflow.
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
## Scope
## Checks Run (Lanes)
## Acceptance Criteria Status
## Requirement Trace Status (governed only)
## Observed Risks & Edge Cases

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: verify-work, feature_status: implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: uat-signoff, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
uat-signoff | implement-feature | dev-fix
## Cost Report
Call `get_session_cost(workflow="verify-work")` before final handoff.
```

