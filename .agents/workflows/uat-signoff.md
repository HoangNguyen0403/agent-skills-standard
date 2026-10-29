---
description: Walk a business/UAT approver through a plain-language demo of a verified feature and capture business acceptance signoff.
---

# UAT Signoff Workflow

Goal: Convert a `verify-work` PASS into an explicit, evidence-linked business acceptance decision before release.

## Steps

1. Load scope:
   - `verify-work` report, criteria list, PRD/BRD-lite business objective, open defect ledger, residual risks, and inherited `operator_profile` (carry, do not re-infer).
   - Carry `delivery_mode`, the authoritative work-item reference plus source revision, and the approval that authorized this scope; the demo and decision target that revision, and a later revision requires renewed review. An absent reference is `not assessed`, never inferred from a filename or status string.
   - Load `common-operator-profile`; carry `release_confidence` from `test-loop` or `quality-engineering-automation-health` when available.
2. Draft demo script:
   - Open with the decision requested: exact acceptance sought, the scope fence it covers, evidence and limitations, and any open decision with owner and affected slice. Keep it roughly one screen; do not bury the decision in a walkthrough.
   - Map each criterion to an observable business outcome in plain language; omit file paths, commands, and code identifiers from the primary script.
   - For `operator_profile=business` or `hybrid`, the plain-language script is primary; keep technical trace in a trailing appendix.
3. Walk the signoff:
   - Present each criterion outcome, open defects, and residual risks (including untested device cells and waived non-blockers); ask the approver to accept or reject.
   - Technical PASS confirms contract verification only; the human approver accepts or rejects business delivery. Reuse an existing acceptance policy only when the authorized owner supplied it as an explicitly scoped grant; otherwise the human gate remains.
   - Ask max 3 blocking questions at a time with a recommended default and 2-3 options.
4. Capture decision:
   - Record signoff owner, acceptance authority reference, date, and per-criterion accept/reject status against the reviewed revision, including accepted residual risks. Acceptance is a human decision: never infer it from a technical PASS, schema-valid run record, or your own review.
   - Reject on any criterion → route to `dev-fix`.
   - Full accept → route to `deploy-release`; release authority and its own named authorizer remain separate.
5. Persist:
   - Write the run record to `artifacts/runs/[slug]/[compactISO]-uat-signoff.json` when file writes are allowed.

## Runtime Contract
- Use after `verify-work` PASS on a feature, before `deploy-release`.
- Required inputs: a PASS verification report with criteria to demo against, plus the reviewed work-item revision and the acceptance authority. A prior acceptance policy applies only when its authorized owner supplied that scoped grant; otherwise the human gate applies.
- Return BLOCKED only when no verification report exists or the approver is unavailable in autonomous/channel mode.
## Handoff Payload
- `slug`, `operator_profile`, `delivery_mode`, work-item reference plus reviewed revision, `release_confidence`, signoff owner, acceptance authority reference, per-criterion decision, conditions, evidence-lane refs (technical PASS ref; release `not assessed`), outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# UAT Signoff: [Name]

## Decision Brief
- Decision sought: [accept/reject the reviewed revision]; authority: [owner/ref]
- Scope fence: [covered scope]; evidence: [technical PASS ref]; limitations: [known gaps]
- Unresolved decision: [decision] — owner: [owner] — affected slice: [slice]
- Work item: [ref @ revision]; delivery mode: brief | standard | extended

## Demo Script (Plain Language)

## Per-Criterion Decision

| Criterion ref | Outcome Demonstrated | Decision | Conditions |
| --- | --- | --- | --- |
| [REQ/AC id or approved criterion] | [outcome] | [accept/reject] | [conditions] |

## Signoff Owner, Authority Reference And Date

## Technical Appendix

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: uat-signoff, feature_status: verified, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: deploy-release, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
deploy-release | dev-fix

## Cost Report
Call `get_session_cost(workflow="uat-signoff")` before final handoff.
```
