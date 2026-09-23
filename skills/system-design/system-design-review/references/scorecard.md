# Scorecard

## Scoring Rubric

Score each of the nine axes 0-10 using observable evidence only.

| Band | Meaning  | Evidence standard                                     |
| ---- | -------- | ----------------------------------------------------- |
| 0-2  | Absent   | No artifact, no metric, no owner                      |
| 3-5  | Partial  | Exists for part of the system, stale, or undocumented |
| 6-8  | Adequate | Covers the critical paths, documented, owned          |
| 9-10 | Strong   | Covered, measured, drilled, and reviewed on a cadence |

An unverifiable claim is not a 5. Score it against what is proven and tag the row `UNVERIFIED`.

## Weighting by System Profile

| Profile                        | Heavily weighted axes                       | De-weighted axes                   |
| ------------------------------ | ------------------------------------------- | ---------------------------------- |
| Internal tool, low traffic     | Requirements, rollout, observability        | Redundancy, caching, async offload |
| Public read-heavy product      | Caching, capacity evidence, observability   | Async offload                      |
| Transactional/money            | Data scaling, redundancy, rollout           | Caching                            |
| Batch or data pipeline         | Data scaling, async offload, observability  | Caching, redundancy                |
| Startup pre-product-market-fit | Requirements, rollout, cost proportionality | Redundancy, data scaling           |

State the profile before scoring, so the weighting is a declared choice rather than an implicit bias.

Operability is a weighting input in every profile: a design the owning team cannot run at 3am scores badly on
rollout and observability no matter how elegant the topology is.

## N/A and Machinery Guardrails

- A profile may mark an axis `N/A` only with a written reason and evidence that the axis is outside the system's risk envelope. Preserve the reason in the report and calculate the denominator from applicable axes; do not score it as zero or quietly remove a known risk.
- Caches, queues, replicas, and regions earn no credit merely because they appear. Require a measured constraint, invariant, owner, cost, and failure/recovery path; unnecessary machinery is a cost and operability finding.
- For HLD/LLD review, trace `requirement -> decision -> component -> contract -> verification`; a selected diagram is optional when prose or a table answers the question.

## Report Template

```md
# Design Review: [system]

## Ground Truth
- Traffic: [current QPS / DAU]
- Data: [volume, growth rate]
- Incidents: [recent, with cause class]
- Reported pain: [owner's own words]

## Scorecard
| Axis | Score | Applicable? | Weight | Evidence | Gap |
| --- | ---: | :---: | ---: | --- | --- |
Raw applicable score: [n] / [10 × applicable-axis count]; Weighted score: [weighted n] / [10 × sum of applicable weights] - Profile: [profile] - Declared weights: [weighting axes and rationale] - Weighted verdict: [ship | fix first | redesign scope]

## Critical Path Trace
[hop-by-hop, with the measured or estimated cost of each hop]

## Findings
| Severity | Axis | Evidence | Consequence | Smallest fix |
| --- | --- | --- | --- | --- |

## Roadmap
### Now (stop the bleeding)
### Next (structural)
### Later (optional)

## Risk Register
| Risk | Trigger | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- |
```

## Verdict Guidance

- **Ship**: no axis below 6 on a weighted-heavy axis, and no open critical finding.
- **Fix first**: one or more weighted-heavy axes below 6, but the structure is sound.
- **Redesign scope**: a structural constraint (ownership, partition key, sync coupling on the hot path)
  cannot be fixed without changing the topology.

Never issue a redesign verdict on style, naming, or technology preference. Redesign requires a
structural constraint that the current shape cannot satisfy at the required numbers.
