# Metrics Definitions and Data Sources

All windows default to the last 30 days or last 20 pipeline runs, whichever is larger. State the window in every report.

## feedback_loop_minutes

- **Formula**: median minutes from commit push to first trusted verdict (green, or red that the team acts on) on the default CI path.
- **Target**: under 15 minutes for PR checks; under 60 minutes for the full pre-release gate.
- **GitHub Actions**: `gh run list --workflow <name> --json createdAt,updatedAt,conclusion --limit 50`; duration = `updatedAt - createdAt`; exclude runs cancelled by a newer push.
- **GitLab**: `GET /projects/:id/pipelines?per_page=50` then `duration` per pipeline; exclude `canceled`.

## suite_reliability_pct

- **Formula**: `100 * (runs with a red that was a real defect or real infra outage) / (all red runs)`. A red that went green on plain re-run with no code change counts against reliability.
- **Target**: at or above 90%. Below 80% means the team no longer trusts red.
- **GitHub Actions**: count re-runs via `gh run list --json databaseId,attempt,conclusion`; `attempt > 1` that ends green with identical head SHA is a re-run flake. Pair with `QUARANTINE_CANDIDATE` verdicts from `quality-engineering-test-healing`.
- **GitLab**: `GET /projects/:id/pipelines/:pipeline_id/jobs` and compare `retried: true` jobs against the same commit; `retry` count with same SHA and green outcome is a flake.

## release_cadence

- **Formula**: releases to production per week, reported next to `prod_escape_rate` so cadence is never read alone.
- **Target**: rising or stable cadence with flat or falling escapes.
- **GitHub**: `gh release list --limit 50` or tag dates via `git tag --sort=-creatordate --format='%(creatordate:short) %(refname:short)'`.
- **GitLab**: `GET /projects/:id/releases` or DORA `deployment_frequency` from `GET /projects/:id/dora/metrics?metric=deployment_frequency`.

## prod_escape_rate

- **Formula**: `serious defects found in production after release / releases in window`. Serious = severity that triggers a hotfix, rollback, or incident.
- **Target**: at or below the trailing-90-day baseline; any rise after a release is `release_confidence: low` until explained.
- **Source**: incident or bug tracker query for issues tagged post-release or hotfix, created after the release timestamp (Jira JQL example: `labels = escaped AND created >= "<release date>"`). GitLab DORA `change_failure_rate` is an acceptable proxy.

## Reading the four together

| Pattern | Reading |
| --- | --- |
| Fast loop, high reliability, rising cadence, flat escapes | Suite is doing its job even if it rarely fails |
| Fast loop, low reliability | Reds are ignored; fix flakes before adding tests |
| Slow loop, high reliability | Trusted but late; developers batch changes and risk grows |
| Rising cadence, rising escapes | Automation is not gating what matters; revisit core-workflow coverage |
