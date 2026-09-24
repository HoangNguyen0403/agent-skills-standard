# Deploy Release

Prepare and verify a staged or production deployment with rollback and smoke checks.

**Input:** $ARGUMENTS

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

Execute the following steps for **$ARGUMENTS**.


# Deploy Release Workflow

Goal: Ship verified work with explicit deployment steps, smoke checks, and rollback criteria.

## Steps

1. Confirm readiness:
   - Verification report is PASS or accepted with documented risk.
   - Required approvals are present, and production carries a named release owner's authorization.
   - Migrations and feature flags are accounted for.
   - `release_confidence` is `high`, or `medium` with documented risk; `low` means NO-GO unless the release owner overrides in writing.
2. Prepare release:
   - Identify version, environment, deploy command, and owner.
   - Confirm secrets, config, queues, cron, and external services.
   - Define rollback command or revert path.
   - Environment tier: dev deploys freely; staging deploys behind the smoke gate; production is prepared by the agent and authorized by the named release owner through the guardrail approval gate.
3. Deploy:
   - Run staging deploy first when available.
   - Rehearse the rollback in staging before promoting to production.
   - Run smoke checks before promotion.
   - Promote only when smoke checks pass.
4. Monitor:
   - Check logs, metrics, errors, latency, and core user flows.
   - Stop or roll back on defined failure signals.
5. Persist and route:
   - Write the run record to `artifacts/runs/[slug]/[compactISO]-deploy-release.json` when file writes are allowed.
   - User-facing notes -> `publish-notes`.
   - Process and standards feedback -> `retro-learn`.

## Runtime Contract
- Use once verification/UAT signoff is PASS and a release window is open.
- Required inputs: verification report plus release version, environment, and rollback path.
- Return BLOCKED when required approvals, migrations, or rollback path are unresolved, or when a production deploy has no named authorizer.
## Handoff Payload
- `slug`, `release_confidence`, release verdict (GO/NO-GO/ROLLED-BACK), smoke check results, rollback path, outcome report, next workflow.
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
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: deploy-release, feature_status: released, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: publish-notes, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

publish-notes | retro-learn

## Cost Report
Call `get_session_cost(workflow="deploy-release")` before final handoff.
```
