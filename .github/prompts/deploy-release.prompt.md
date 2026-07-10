---
description: "Prepare and verify a staged or production deployment with rollback and smoke checks."
---

# Deploy Release Workflow

Goal: Ship verified work with explicit deployment steps, smoke checks, and rollback criteria.

## Steps

1. Confirm readiness:
   - Verification report is PASS or accepted with documented risk.
   - Required approvals are present.
   - Migrations and feature flags are accounted for.
2. Prepare release:
   - Identify version, environment, deploy command, and owner.
   - Confirm secrets, config, queues, cron, and external services.
   - Define rollback command or revert path.
3. Deploy:
   - Run staging deploy first when available.
   - Run smoke checks before promotion.
   - Promote only when smoke checks pass.
4. Monitor:
   - Check logs, metrics, errors, latency, and core user flows.
   - Stop or roll back on defined failure signals.
5. Route:
   - User-facing notes -> `publish-notes`.
   - Process and standards feedback -> `retro-learn`.

## Runtime Contract
- Use once verification/UAT signoff is PASS and a release window is open.
- Required inputs: verification report plus release version, environment, and rollback path.
- Return BLOCKED only when required approvals, migrations, or rollback path are unresolved.
## Handoff Payload
- `slug`, release verdict (GO/NO-GO/ROLLED-BACK), smoke check results, rollback path, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Deployment Report: [Name]

## Release Verdict
GO | NO-GO | ROLLED-BACK

## Release

## Environments

## Commands

## Smoke Checks

| Check | Result | Evidence |
| --- | --- | --- |
| [check] | [PASS/FAIL/BLOCKED] | [evidence] |

## Rollback

## Outcome Report
feature_status: implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: publish-notes | retro-learn

## Next Workflow

publish-notes | retro-learn

## Cost Report
Call `get_session_cost(workflow="deploy-release")` before final handoff.
```
