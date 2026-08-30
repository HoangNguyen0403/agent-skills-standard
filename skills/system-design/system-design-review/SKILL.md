---
name: system-design-review
description: "Audit an existing or proposed architecture and return a scored verdict across eight axes, from requirements and capacity evidence to observability and rollout, then convert gaps into a prioritized roadmap. Use when reviewing a design doc, auditing a running system, or gating a design."
metadata:
  triggers:
    keywords:
      - design review
      - architecture review
      - design scorecard
      - bottleneck analysis
      - scalability audit
      - evolution roadmap
      - architecture assessment
---

# System Design Review

## **Priority: P1 (HIGH)**

Score against evidence, not intent. A claim with no number or artifact scores zero.

## Nine Axes (score each 0-10)

| Axis | Scores 10 when | Scores 0 when |
| --- | --- | --- |
| Requirements | Functional, NFR, and out-of-scope written with owners | Only a feature description exists |
| Capacity evidence | Peak QPS, storage, and bandwidth computed and current | Numbers absent or older than the last traffic change |
| Redundancy | No SPOF; failover drilled with a measured RTO | Single instance or untested failover on a critical path |
| Data scaling | Access patterns mapped, ownership single, growth path stated | One shared store, no growth plan, unbounded tables |
| Caching | Hot read paths cached with TTL and invalidation defined | No cache on a proven hot path, or uninvalidatable cache |
| Async offload | Slow and bursty work queued with drain rate and DLQ | Everything synchronous on the request path |
| Observability | Traffic, error, latency, saturation instrumented with owned alerts | Logs only, or alerts with no runbook |
| Rollout | Canary or flag with metric rollback trigger and reversible migrations | Big-bang deploy, irreversible migration |
| Cost proportionality | Spend is sized to the traffic and the risk, and someone can state it | Topology bought for an imagined scale nobody measured |

Report each score with the evidence used, out of 90. Weight axes by the system's actual risk: a 100 RPS internal
tool is not failed for lacking multi-region.

## Review Method

1. Establish ground truth first: current traffic, data volume, incident history, and the top pain the owner reports.
2. Score the eight axes against artifacts and metrics; mark any unverifiable claim `UNVERIFIED`.
3. Trace the hottest and the most critical path end to end; the worst hop is the real bottleneck.
4. List findings as `severity - axis - evidence - consequence - smallest fix`.
5. Convert findings into a roadmap: stop-the-bleeding now, structural next, optional later.
6. Check operability: who runs this at 3am, which team owns which piece, and whether that team can actually operate it.

## Common Mistakes to Check

- Architecture drawn before requirements or numbers existed.
- Redundancy claimed but sharing one config plane, credential, or control plane.
- Cache added over a query that was never optimized.
- Sharding adopted before indexing, replicas, and caching were exhausted.
- Queue with no drain-rate budget, no DLQ, and alerting on depth rather than age.
- Alerts on CPU rather than user-visible symptoms or error-budget burn.
- Migration and code shipped as one irreversible step.

## Anti-Patterns

- **No score without evidence**: cite the metric, artifact, or drill; otherwise mark `UNVERIFIED`.
- **No rewrite recommendation by default**: prefer the smallest fix that removes the proven bottleneck.
- **No uniform severity**: rank by user impact and reversibility, not by axis order.
- **No finding without a next action**: every gap gets an owner-ready fix.

## References

- [Scorecard](references/scorecard.md) - scoring rubric, weighting guidance, report template
- [Mistakes Table](references/mistakes-table.md) - failure symptom, root cause, and corrective action
