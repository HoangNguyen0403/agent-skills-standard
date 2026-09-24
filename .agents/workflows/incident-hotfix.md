---
description: Mitigate a production incident or urgent regression first, then route to root-cause remediation and a postmortem.
---

# Incident Hotfix Workflow

Goal: Stop user-facing harm immediately, then hand off to root-cause discipline instead of debugging live.

## Steps

1. Triage:
   - Severity, blast radius, affected environments/markets, and whether the regression is a rollback candidate.
   - Load `deploy-release` rollback path and prior deployment report if present.
2. Mitigate first:
   - Prefer rollback, feature flag disable, or config revert over a live code fix.
   - Confirm mitigation stopped user-facing harm before investigating root cause.
   - Do not attempt a root-cause code fix under live production pressure.
3. Stabilize:
   - Monitor logs, metrics, errors, and core user flows until signals return to baseline.
   - Record mitigation timestamp, owner, and evidence.
4. Route to remediation:
   - Once stable, hand off to `dev-fix` for root-cause debugging under the normal Propose -> Approve -> Verify cycle.
   - Do not skip `dev-fix`'s root-cause-before-code requirement just because mitigation already shipped.
5. Route to learning:
   - After `verify-work` confirms the permanent fix, route to `retro-learn` for a postmortem.
   - The confirmed root cause becomes a permanent eval case in the skill or workflow that should have prevented it.

## Runtime Contract
- Use only for production incidents or urgent regressions with active user-facing harm; non-urgent bugs go directly to `dev-fix`.
- Required inputs: incident signal (alert, report, or error spike) plus a mitigation path (rollback, flag, or config revert).
- Return BLOCKED only when no mitigation path exists and the incident cannot be safely stopped.
## Handoff Payload
- `slug`, `operator_profile` (carried, not re-inferred), severity, mitigation applied, stabilization evidence, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Incident Hotfix: [Name]

## Severity And Blast Radius

## Mitigation Applied

## Stabilization Evidence

| Signal | Before | After |
| --- | --- | --- |
| [signal] | [value] | [value] |

## Root Cause Handoff

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: incident-hotfix, feature_status: partially_implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: dev-fix, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
dev-fix | verify-work | retro-learn

## Cost Report
Call `get_session_cost(workflow="incident-hotfix")` before final handoff.
```
