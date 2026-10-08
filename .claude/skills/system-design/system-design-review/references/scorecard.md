# Scorecard

## Scoring Rubric

Score each of the nine axes 0-10 using observable evidence only.

| Band | Meaning  | Evidence standard                                     |
| ---- | -------- | ----------------------------------------------------- |
| 0-2  | Absent   | No artifact, no metric, no owner                      |
| 3-5  | Partial  | Exists for part of the system, stale, or undocumented |
| 6-8  | Adequate | Covers the critical paths, documented, owned          |
| 9-10 | Strong   | At declared scope: proposed mechanisms, owners and validation criteria are complete; implementation behavior is verified; operations are measured and drilled on a cadence |

Score against lifecycle-appropriate evidence. Missing production drills or telemetry withholds operations readiness; it does not by itself determine proposed-design quality.

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

## Review Scope And Evidence

Declare one scope before scoring:

- **Proposed design:** documented mechanisms, calculations and planned validation count as design evidence. Name runtime/operations evidence still unverified; missing design-shaping inputs or mechanisms remain explicit gaps and prevent a readiness claim when material.
- **Implementation:** implementation evidence must establish that the design is realized; planned mechanisms alone are insufficient.
- **Operations:** require production runtime/deployment evidence for operational claims, including measured SLO/telemetry and relevant failover/recovery exercises. Missing evidence withholds operations-readiness.

Keep lifecycle (`proposed|implemented|retired`), evidence kind (`code|document|runtime|deployment`) and confidence (`unverified|assumed|documented|observed`) distinct. Existing `feature_status: design_ready` may report a proposed design; it does not authorize implementation, UAT, release or deployment.

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
Raw applicable score: [n] / [10 × applicable-axis count]; Weighted score: [weighted n] / [10 × sum of applicable weights] - Profile: [profile] - Scope: [proposed design | implementation | operations] - Declared weights: [weighting axes and rationale] - Scope-qualified conclusion: [existing feature_status and verdict supported by evidence; `design_ready` only for a sufficiently supported proposed design]

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

- **Readiness at declared scope:** evidence must support the claim; a score threshold alone is insufficient. For a proposed design, use existing `feature_status: design_ready` only when the design inputs and mechanisms are sufficient and no material design gap remains. Sparse facts require named missing design evidence, not an automatic readiness status. Implementation and operations claims require their corresponding evidence.
- **Fix first:** material gaps at the declared scope remain open; route the smallest evidence-backed correction and withhold readiness until resolved.
- **Redesign scope**: a structural constraint (ownership, partition key, sync coupling on the hot path)
  cannot be fixed without changing the topology.

Never issue a redesign verdict on style, naming, or technology preference. Redesign requires a structural constraint that the current shape cannot satisfy at the required numbers.

- **Proposed design:** `design_ready` describes documented mechanisms and planned validation only. It is not implementation, operations, UAT, release, or deployment approval.
- **Implementation:** report implementation readiness only when implementation evidence supports the claim; do not substitute design plans for realized behavior.
- **Operations:** withhold operations-readiness when production telemetry/SLO evidence or relevant recovery/failover evidence is absent. Do not reuse proposed-design readiness as operational acceptance.

## Source Release And Rollback

The canonical skills remain the source of truth; update the next reviewed system-design patch and regenerate configured native copies before checks. A source commit does not publish a category or activate a consumer. Roll back by reverting the canonical source change and regenerating native copies; do not treat a revert or source PR as publication or runtime activation.
