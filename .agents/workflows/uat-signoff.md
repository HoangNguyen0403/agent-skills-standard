---
description: Walk a business/UAT approver through a plain-language demo of a verified feature and capture business acceptance signoff.
---

# UAT Signoff Workflow

Goal: Convert a `verify-work` PASS into an explicit, evidence-linked business acceptance decision before release.

## Steps

1. Load scope:
   - `verify-work` report, AC list, PRD/BRD-lite business objective, open defect ledger, residual risks, and inherited `operator_profile` per `skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md`.
   - Load `common-operator-profile`; `release_confidence` from `test-loop`/`quality-engineering-automation-health`.
2. Draft demo script (V-Model Level 1 Acceptance):
   - Map each AC to an observable business outcome in plain language; technical details and residual risks go to appendix.
   - For `operator_profile=business` or `hybrid`, this plain-language script is the primary artifact.
3. Walk the signoff:
   - Present each AC outcome, open defects, and residual risks (e.g. untested device cells, waived non-blockers).
   - Technical PASS confirms contract verification only; human approver accepts or rejects business delivery.
   - Ask max 3 blocking questions at a time with a recommended default and 2-3 options.
4. Capture decision:
   - Signoff owner, date, per-AC accept/reject, and accepted residual risks. Reject on any AC -> route to `dev-fix`.
   - Full accept -> route to `deploy-release`.
5. Persist:
   - Write the run record to `artifacts/runs/[slug]/[compactISO]-uat-signoff.json` when file writes are allowed.

## Runtime Contract
- Use after `verify-work` PASS on a feature, before `deploy-release`.
- Required inputs: a PASS verification report with an AC list to demo against.
- Return BLOCKED only when no verification report exists or the approver is unavailable in autonomous/channel mode.
## Handoff Payload
- `slug`, `operator_profile`, `release_confidence`, signoff owner, per-AC decision, conditions, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# UAT Signoff: [Name]

## Demo Script (Plain Language)

## Per-AC Decision

| AC ID | Outcome Demonstrated | Decision | Conditions |
| --- | --- | --- | --- |
| [ac-id] | [outcome] | [accept/reject] | [conditions] |

## Signoff Owner And Date

## Technical Appendix

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: uat-signoff, feature_status: verified, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: deploy-release, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
deploy-release | dev-fix

## Cost Report
Call `get_session_cost(workflow="uat-signoff")` before final handoff.
```
