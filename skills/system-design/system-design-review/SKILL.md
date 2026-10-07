---
name: system-design-review
description: "Audit an existing or proposed architecture and return a scored verdict across nine axes, from requirements and capacity evidence to observability and rollout, then convert gaps into a prioritized roadmap. Use when reviewing a design doc, auditing a running system, or gating a design."
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

## Nine Axes (score each applicable axis 0-10)

| Axis                 | Scores 10 when                                                        | Scores 0 when                                           |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Requirements         | Functional, NFR, and out-of-scope written with owners                 | Only a feature description exists                       |
| Capacity evidence    | Peak QPS, storage, and bandwidth computed and current                 | Numbers absent or older than the last traffic change    |
| Redundancy           | No SPOF; failover drilled with a measured RTO                         | Single instance or untested failover on a critical path |
| Data scaling         | Access patterns mapped, ownership single, growth path stated          | One shared store, no growth plan, unbounded tables      |
| Caching              | Hot read paths cached with TTL and invalidation defined               | No cache on a proven hot path, or uninvalidatable cache |
| Async offload        | Slow and bursty work queued with drain rate and DLQ                   | Everything synchronous on the request path              |
| Observability        | Traffic, error, latency, saturation instrumented with owned alerts    | Logs only, or alerts with no runbook                    |
| Rollout              | Canary or flag with metric rollback trigger and reversible migrations | Big-bang deploy, irreversible migration                 |
| Cost proportionality | Spend is sized to the traffic and the risk, and someone can state it  | Topology bought for an imagined scale nobody measured   |

Report each applicable axis with evidence and a declared profile weighting. Use an applicable-axis denominator
(`10 × applicable-axis count`), not a fixed `/90`, when an axis is justified `N/A`.

## Profile-Aware Scoring

- Declare the system profile and weighting before scoring. An axis may be `N/A` only when the profile and evidence show that it is outside the system's risk envelope; record the rationale, exclude it from the denominator, and do not silently convert it to zero.
- Do not reward adding a cache, queue, replica, or region by vocabulary alone. A component earns credit only when a measured constraint, invariant, owner, cost, and failure/recovery behavior require it; unjustified machinery lowers cost proportionality and operability.
- Review HLD and LLD as one trace: requirements and shaping decisions must resolve into component ownership, contracts, verification, and a stated changed-constraint trigger. A diagram is optional when prose answers the question.
- Separate lifecycle (`proposed|implemented|retired`), source kind (`code|document|runtime|deployment`), and evidence confidence (`unverified|assumed|documented|observed`). Code/document citations are `documented`, not deployment proof; runtime/deployment captures may be `observed`. `assumed` and `unverified` carry no citation; explicit citations require `evidence_kind`.

## Independent Semantic Review

Lexical checks are smoke signals, not proof of a sound design. Apply the independent behavioral rubric in
[semantic evaluation](references/semantic-evaluation.md) and record missing calculations, mechanisms,
adverse timelines, invariants, or recovery as findings even when the expected vocabulary appears.

## Review Method

1. Ground scores in current traffic, data, incidents and owner pain; mark unsupported axes `UNVERIFIED`.
2. Trace hot and critical paths end to end. Report the worst hop and each finding's severity, axis, evidence, consequence and smallest fix.
3. Stage the roadmap now/next/later; name on-call/operator and team ownership.

## Action Register and Persistence

- For each confirmed material finding, assign an action ID distinct from its finding ID. Every row needs action ID, finding IDs, risk/source/consequence, bounded change, role, dependencies, scoped exit proof, `open|blocked|verified`, and release gate. Shared actions need per-finding proof; missing facts yield `needs validation`, not generic filler.
- Use the same full action rows in the saved plan and any response, including `partial` or `response_only`. Write `improvement-plan-<review suffix>.md` beside review only with trust permission, maintainer authorization and writable repo; link review and architecture entry. `persisted` needs file + verified links; `partial` needs saved file and all missing links.
- Untrusted stays read-only on writable hosts. Forbidden/unapproved/unwritable or failed initial write: full register and JSON `{"improvement_plan":{"status":"response_only","path":null,"missing":["actual reason"]}}`. Zero actions: say "no corrective actions"; emit JSON `{"improvement_plan":{"status":"none","path":null,"missing":[]}}`. Never claim unwritten files.
- Emit valid JSON `improvement_plan`; preserve full workflow Outcome Report fields when present. Recovery exits need measured RPO/RTO and association checks; never invent deadlines, targets or persistence gaps.

## Closure and Release Gates

- Keep actions `open|blocked` until scoped exit proof and separate approval record name an independent approver, decision and checked gate authority; a role is not acceptance.
- Proposed LLDs, diagrams or design/review approval do not prove deployment or product release. Never infer publication or transfer approval between gates.

## Common Mistakes to Check

- Architecture drawn before requirements or numbers existed.
- Redundancy claimed but sharing one config plane, credential, or control plane.
- Cache added over a query that was never optimized.
- Sharding adopted before indexing, replicas, and caching were exhausted.
- Queue with no drain-rate budget, no DLQ, and alerting on depth rather than age.
- Alerts on CPU rather than user-visible symptoms or error-budget burn.
- Migration and code shipped as one irreversible step.

## Anti-Patterns

- No score without metric/artifact/drill: mark unsupported claims `UNVERIFIED`. Prefer the smallest proven fix over a rewrite.
- Rank severity by user impact and reversibility; every confirmed material gap needs an owner-ready action.

## References

- [Scorecard](references/scorecard.md) - scoring rubric, weighting guidance, report template
- [Mistakes Table](references/mistakes-table.md) - failure symptom, root cause, and corrective action
