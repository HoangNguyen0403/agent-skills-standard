# Review — Payment Gateway Redundancy (N+2, 8 active / 2 spares, 2 AZs)

## Verdict

**Reject the reviewer's finding.** "N+1" in the proposal denotes *N active nodes + 1 hot spare*: a compute high-availability pattern, an explicit negative control for N+1 query amplification. No statement count, trace, or plan inspection supports any database finding, so the claim "severe database performance risk that will amplify query volume" is misclassified and `unverified`.

**The architecture is still not design-ready** — for different reasons. The two-AZ/N+2 variant makes one non-compensable correctness risk and one capacity gap load-bearing.

## Why the classification is wrong (both configurations)

Amplification is *per-request fan-out that scales with parent row count*: `1 + N` lazy loads in a loop, serializer traversal, per-record `COUNT(*)`, resolver fan-out. Node count is not a parent-row count.

Aggregate database load is a capacity quantity, not amplification:

$$Q_{total} = \mathrm{QPS} \times q_{req}, \qquad q_{req} = \text{constant per request}$$

Doubling active nodes changes concurrency, connections, and failover blast radius — **not** `q_req`. Evidence tier for the reviewer's claim: `assumed` at best; `docs/design risk`; requires a statement counter or trace listener before it can be `observed`. `EXPLAIN` would not settle it either — a plan is an access path for one statement, not a request counter.

## Real findings under 8 active / 2 spares / 2 AZs

**[P0 — Correctness gate] Payment state authority across AZs.** Hot-spare promotion is only safe if (a) idempotency keys live in a store reachable from the surviving AZ with read-after-write consistency, (b) in-flight authorizations are durable and discoverable, (c) settlement has exactly one writer. If the idempotency/session store is single-AZ or asynchronously replicated, failover produces duplicate charges or orphaned authorizations. *Adverse timeline:* node dies → spare promotes → client retry arrives at a node with no idempotency row → second charge. *Smallest fix:* put idempotency authority in a surviving-AZ-replicated store, propagate the request key through retries, and gate promotion on that store being reachable.

**[P1 — Redundancy] Zone-loss headroom is not shown to be sufficient.** 8 active over 2 AZs is 4 per AZ. Losing one AZ leaves 4 active + 1 spare = 5 nodes carrying 8 nodes of traffic, i.e. **1.6× per-node load**. Zone survival therefore requires steady-state utilization $\\le 62.5\\%$ of node capacity — provisioned capacity $\ge 8/5$ of the active requirement — and requires the spare to be promotable *at capacity*, not merely process-alive. N+2 sized for node failure alone ($10/8 = 1.25\times$) cannot absorb an AZ loss. The proposal states neither number.

**[P2 — Capacity] Connection budget.** Each active node opens `P` pooled connections; spares connect at boot. `8 × P` (e.g. `P=50` → 400) plus failover reconnection bursts must fit `max_connections` with headroom, or sit behind a pooler. A concrete ceiling, not an amplification defect.

**[P2 — Cost] 20% idle capacity and a second AZ** are unpaired with a measured ceiling or a stated zone-failure objective; either justify with the drill target or drop to what the objective requires.

## Scorecard (profile: payment take-path, proposal-level evidence)

| Axis | Score | Evidence |
| --- | --- | --- |
| Requirements | 4/10 | "High availability" only; no RTO/RPO, no target failure domain |
| Capacity evidence | 2/10 | No QPS, no per-node headroom, no connection arithmetic |
| Redundancy | 4/10 | AZ spread is a genuine improvement over single-AZ; no promotion owner, no drill, spare capacity unstated, zone math fails at 1.25× |
| Data scaling | 6/10 | No amplification defect evidenced; idempotency-store topology unknown |
| Caching | N/A | No hot read path declared |
| Async offload | N/A | No slow/bursty work declared |
| Observability | 3/10 | No failover signal, no payment success-rate or node-saturation alert, no drill record |
| Rollout | 3/10 | Promotion untested until drilled; no flag/canary for topology change |
| Cost proportionality | 4/10 | 20% idle + second AZ without a measured ceiling |

Applicable denominator: 7 axes → 26/70 ≈ **37%**. Combined with the correctness gate, the verdict stays *not sound*.

## Rederived classification

- Original "N+1, 4 active + 1 spare": **no database finding**; the defect claim is a false positive (`design risk` mislabeled `observed`).
- Variant "N+2, 8 active + 2 spares, 2 AZs": **still no amplification finding** — node count is not query fan-out. Classification changes only on the availability axes: AZ spread earns credit in principle, but zone-loss headroom (needs $\\le62.5\\%$ steady-state utilization), cross-AZ idempotency authority, and connection ceilings must be specified and drilled. Fix order: idempotency/settlement authority → headroom + promotion runbook → connection pool ceiling; do not add a cache, replica, or shard to answer a query-amplification finding that does not exist.
