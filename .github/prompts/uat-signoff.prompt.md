---
description: "Walk a business/UAT approver through a plain-language demo of a verified feature and capture business acceptance signoff."
---

# UAT Signoff Workflow

Goal: Convert a `verify-work` PASS into an explicit, evidence-linked business acceptance decision before release.

## Steps

1. Load scope:
   - `verify-work` report, AC list, PRD/BRD-lite business objective, and inherited `operator_profile` (carry, do not re-infer).
   - Load `common-operator-profile`.
2. Draft demo script:
   - Map each AC to an observable business outcome in plain language; omit file paths, commands, and code identifiers from the primary script.
   - For `operator_profile=business` or `hybrid`, this plain-language script is the primary artifact; keep technical trace in a trailing appendix.
3. Walk the signoff:
   - Present each AC outcome and ask the approver to accept or reject.
   - Ask max 3 blocking questions at a time with a recommended default and 2-3 options.
   - Record conditions attached to any conditional acceptance.
4. Capture decision:
   - Signoff owner, date, and per-AC accept/reject status.
   - Reject on any AC -> route to `dev-fix`.
   - Full accept -> route to `deploy-release`.

## Runtime Contract
- Use after `verify-work` PASS on a feature, before `deploy-release`.
- Required inputs: a PASS verification report with an AC list to demo against.
- Return BLOCKED only when no verification report exists or the approver is unavailable in autonomous/channel mode.
## Handoff Payload
- `slug`, `operator_profile`, signoff owner, per-AC decision, conditions, outcome report, next workflow.
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
feature_status: implemented | partially_implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: deploy-release | dev-fix

## Next Workflow
deploy-release | dev-fix

## Cost Report
Call `get_session_cost(workflow="uat-signoff")` before final handoff.
```
