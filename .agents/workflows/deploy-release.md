---
description: Prepare and verify a staged or production deployment with rollback and smoke checks.
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

## Output Template

```md
# Deployment Report: [Name]

## Release

## Environments

## Commands

## Smoke Checks

| Check | Result | Evidence |
| --- | --- | --- |
| [check] | [PASS/FAIL/BLOCKED] | [evidence] |

## Rollback

## Next Workflow

publish-notes | retro-learn

## Cost Report
```
