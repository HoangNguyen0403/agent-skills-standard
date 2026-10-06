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
2. Select applicable unit/component, integration/API, E2E/visual, mobile, security, migration, and deployment-smoke lanes.
3. Run smallest reliable checks first. Use Playwright/Appium only for changed user behavior; run driver `scripts/preflight.sh` and use first available rung (web: CLI then MCP; mobile: local then cloud). Missing required driver without exported proof is `BLOCKED (driver: <name>)`. Use ticket/TC integrations only when configured; otherwise request exports or mark that lane BLOCKED.
   - Capture applicable logs, screenshots, traces, or terminal summaries as `<AC|step>-<before|after>.*` under `.playwright-cli/<session>/` or `.appium-mcp/<session>/`.
   - For bug fixes, prove before-failure and after-success; preserve every applicable driver and verification lane.
4. PASS only when all approved criteria are proven and required approval/independent review gates are met; FAIL when a defect or missed requirement remains; BLOCKED when environment, credentials, or approval prevents proof.
5. If observed behavior exceeds the approved low-risk brief, do not silently change scope or redefine criteria: route the decision to the owner, then verify against the resolved contract. Governed behavior drift requires PRD/SRS updates before PASS.
6. Record low-risk checks, outcomes, and evidence in chat/task report; do not require new BRD/PRD/SRS, task-list, REQ/AC-ID, trace, or walkthrough artifacts. Governed work updates BRD-to-PRD-to-SRS/FRS trace and `docs/srs/srs-walkthrough-[slug].md`. Hand off the risk-sized evidence location.

## Runtime Contract
- Use after implementation, before handoff, or when validating a bug fix.
- Required inputs: explicit scope plus acceptance criteria or expected behavior.
- Return BLOCKED only when environment, credentials, or approval prevents proof.
## Handoff Payload
- `operator_profile`, criteria results, comparative evidence, risks, evidence location (chat/task report for low-risk; governed trace/walkthrough path when governed), outcome report, next workflow.
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

