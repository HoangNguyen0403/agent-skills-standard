# Metrics Report Schema

Write to `artifacts/sdlc-metrics.md` at a workflow terminal state. Every row cites its source. A
value the runtime cannot supply is written `unavailable` with the reason, never estimated.

```md
# SDLC Metrics: [scope]

Period:
Generated at:

## Delivery Health

| Metric | Value | Trend vs previous | Source |
| --- | --- | --- | --- |
| Deployment frequency | | | [deployment reports] |
| Lead time for changes | | | [commit range] |
| Change failure rate | | | [deploys vs hotfix/rollback records] |
| Time to restore | | | [incident record] |

## Stage Indicators

| Stage | Indicator | Value | Trend | Source |
| --- | --- | --- | --- | --- |
| [stage] | [leading or lagging indicator] | | | [artifact or commit range] |

## Control Bands

| Metric | Baseline window | Tier reached | Action taken | Routed to |
| --- | --- | --- | --- | --- |
| [metric] | [rolling window] | [tier] | [log / diagnose / propose] | [workflow or owner] |

## Attribution

| Identity class | Changes | Notes |
| --- | --- | --- |
| [agent or human] | | |

## Unavailable

| Metric | Reason |
| --- | --- |
| [metric] | [missing input] |

## Follow-Ups
```

## Derivation Notes

- **Plan adherence**: compare the merged diff's changed files against the file list committed in
  `docs/srs/srs-task-list-[slug].md`. Report the share of changed files the plan named, plus unplanned files.
- **Requirement rework**: count commits to `docs/prd/prd-[slug].md` and `docs/srs/srs-[slug].md`
  after the first `docs/srs/srs-task-list-[slug].md` commit for the same slug.
- **BRD survival rate**: BRDs that reached a committed PRD, divided by BRDs committed in the period.
- **First-pass CI success**: pipeline runs green on first attempt for the change, divided by changes.
- **Band breach to intake**: breach timestamp to the commit that created the intake artifact.
- **Run-record health**: read `artifacts/runs/<slug>/*.json` for `feature_status`, `cost`, and
  `requirement_trace` per stage instead of re-deriving them from chat transcripts.
