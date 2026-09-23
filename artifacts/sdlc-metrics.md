# SDLC Metrics: heavy-dragonfly

Period: rolling 30d
Generated at: 2026-09-23T08:34:47.261Z

## Delivery Health

| Metric | Value | Trend vs previous | Source |
| --- | --- | --- | --- |
| Deployment frequency | 7 deploy tag(s) in rolling 30d | up from 6 tags to 7 tags | git tags (`*-vX.Y.Z`, `git for-each-ref refs/tags`) and commit history (`git log`) |
| Lead time for changes | median 0.6h (n=41 commits across 7 deploy(s)) | n/a (single-period derivation; no comparable prior-period commit set persisted) | git tags (`*-vX.Y.Z`, `git for-each-ref refs/tags`) and commit history (`git log`); commit range per deploy tag |
| Change failure rate | 0% (0/7 deploys with a revert/fix commit since the prior deploy) | n/a (single-period derivation; no comparable prior-period classification persisted) | git tags (`*-vX.Y.Z`, `git for-each-ref refs/tags`) and commit history (`git log`); commit subjects matching /^(revert|fix)/i |
| Time to restore | unavailable | unavailable | n/a |

## Stage Indicators

| Stage | Indicator | Value | Trend | Source |
| --- | --- | --- | --- | --- |
| BRD | BRD survival rate into PRD | 1/1 BRDs reached a committed PRD | n/a (single-period derivation; no comparable prior-period snapshot persisted) | docs/brd/*.md, docs/prd/*.md filenames |
| PRD / SRS | BRD to PRD to SRS commit deltas | unavailable | unavailable | git log --follow --format=%aI (first commit per docs/{brd,prd,srs}/*.md) |
| PRD / SRS | requirement rework after first task-list commit | 0 rework commit(s) across 1 task-listed slug(s) | n/a (single-period derivation; no comparable prior-period snapshot persisted) | git log --format=%aI (docs/prd/prd-<slug>.md, docs/srs/srs-<slug>.md vs docs/srs/srs-task-list-<slug>.md) |
| Build | plan adherence (run-record completion) | unavailable | unavailable | artifacts/runs/<slug>/*.json (`feature_status`, `workflow`) |
| Test | eval pass rate with skill guidance | 71.9% | n/a (only one history record) | benchmarks/evals/history.json (avgWithSkillPassRate field) |
| Test | skill-benchmark structural quality score | 9.8/10 | flat at 9.8 | benchmarks/history.json (avgQuality field) |
| Release | change lead time | median 0.6h (n=41 commits across 7 deploy(s)) | n/a (single-period derivation; no comparable prior-period commit set persisted) | git tags (`*-vX.Y.Z`, `git for-each-ref refs/tags`) and commit history (`git log`); commit range per deploy tag |
| Release | change failure rate | 0% (0/7 deploys with a revert/fix commit since the prior deploy) | n/a (single-period derivation; no comparable prior-period classification persisted) | git tags (`*-vX.Y.Z`, `git for-each-ref refs/tags`) and commit history (`git log`); commit subjects matching /^(revert|fix)/i |

## Control Bands

| Metric | Baseline window | Tier reached | Action taken | Routed to |
| --- | --- | --- | --- | --- |
| avgTokens | rolling_release (vs v2.6.0) | 3sigma | propose | pull_request |

## Attribution

| Identity class | Changes | Notes |
| --- | --- | --- |
| agent | 23 |  |
| human | 22 |  |

## Unavailable

| Metric | Reason |
| --- | --- |
| Time to restore | no incident record source in this repository (expects `artifacts/incidents/*.json`; none found) |
| PRD / SRS: BRD to PRD to SRS commit deltas | no slug has both a committed BRD and PRD (or PRD and SRS) to measure a delta between |
| Build: plan adherence (run-record completion) | run records exist, but none for workflow "implement-feature" |
| band: savingsPctHeavy | gate passed: savingsPctHeavy -6 pts vs v2.6.0 (within threshold) |
| band: avgQuality | gate passed: avgQuality +0.0 vs v2.6.0 (within threshold) |
| band: avgWithSkillPassRate | insufficient history for a rolling_all_runs baseline plus an 8-point detection tail (have 1 point(s)) |
| band: avgDelta | insufficient history for a rolling_all_runs baseline plus an 8-point detection tail (have 1 point(s)) |

## Follow-Ups

- none
