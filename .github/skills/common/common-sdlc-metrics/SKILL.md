---
name: common-sdlc-metrics
description: Define the delivery metrics contract for agent-assisted SDLC — DORA four plus per-stage indicators derived from artifact and git history, and the control bands that turn metric drift into a routed intake. Use when reporting cycle time, plan adherence, or defining response thresholds.
metadata:
  triggers:
    files:
      - "docs/ops/bands.yaml"
      - "artifacts/sdlc-metrics.md"
    keywords:
      - dora metrics
      - lead time
      - change failure rate
      - plan adherence
      - control band
      - delivery metrics
---

# SDLC Metrics Standard

## **Priority: P2 (MEDIUM)**

Measure the handoffs, not the keystrokes. Every metric here is derived from committed artifacts and
git history, so it survives a change of runtime and cannot be inflated by activity.

## 1. Contract, Not Collector

- This skill defines what to report and how. It does not gather provider or CI telemetry itself.
- The host runtime or orchestrator supplies the raw counts; unavailable inputs are reported as
  unavailable, never estimated.
- Emit `artifacts/sdlc-metrics.md` at a workflow terminal state, alongside `artifacts/session-cost.md`.
- Load `references/metrics-schema.md` for the report skeleton.

## 2. Aggregate Health (DORA)

- **Deployment frequency**: successful deploys per period, from deployment reports.
- **Lead time for changes**: first commit to production, per change.
- **Change failure rate**: deploys needing hotfix or rollback, divided by deploys.
- **Time to restore**: mitigation timestamp minus incident detection, from the incident record.

## 3. Per-Stage Indicators

| Stage | Leading | Lagging |
| --- | --- | --- |
| BRD | first conversation to committed BRD | BRD survival rate into PRD |
| PRD / SRS | BRD to PRD to SRS commit deltas | requirement rework after first `docs/srs/srs-task-list-[slug].md` |
| Build | share merging on first implementation pass | plan adherence, merged diff versus `docs/srs/srs-task-list-[slug].md` |
| Test | first-pass CI success, eval pass rate | defect escape rate |
| Review | time to first finding | findings per review by severity |
| Release | change lead time | change failure rate |
| Maintain | band breach to intake in queue | repeat incidents by class |

## 4. Control Bands

- Define bands in `docs/ops/bands.yaml`, version controlled and reviewed like code. Schema:
  `references/bands-template.yaml`.
- Baseline is a rolling window, not a fixed target. Detection is deterministic and computed before
  any agent reads the signal.
- Tiers escalate by evidence: log, then read-only diagnose, then propose a change. Never let a tier
  act beyond its declared tools and routes.
- Dismissals tune the band. A band that fires constantly is miscalibrated, not urgent.

## 5. Reporting Rules

- **Trend over snapshot**: report direction against the previous period, not a bare number.
- **Name the source**: every value cites the artifact, commit range, or pipeline run it came from.
- **No composite scores**: do not blend indicators into a single productivity number.
- **Separate agent and human runs**: attribute a change to the identity that produced it.

## Anti-Patterns

- **No unavailable value guessed**: Mark it unavailable and say why.
- **No lines-of-code or commit-count metrics**: Measure outcomes and handoffs.
- **No fixed baseline**: Use a rolling window per band.
- **No metric without a source**: Cite the artifact or commit range.
- **No band with no owner**: Name who triages a breach.

## Red Flags

- **Stop if a metric ranks individuals**: Report the flow, not the person.
- **Stop if a band fires every run**: Recalibrate before responding.
- **Stop if adherence is measured against an unwritten plan**: Require the committed `docs/srs/srs-task-list-[slug].md`.

## References

- [Metrics Report Schema](references/metrics-schema.md)
- [Control Bands Template](references/bands-template.yaml)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:

- artifacts/sdlc-metrics.md
- DORA
- plan adherence
- rolling baseline
- docs/ops/bands.yaml
- report unavailable
- artifacts/runs/<slug>/
