A Go rewrite with microservices is not yet justified. “Checkout is slow” does not identify the bottleneck; a rewrite may preserve the slow database query while adding network hops, distributed transactions, retries, and operational cost.

Assumption: checkout is a latency-sensitive, revenue-critical synchronous workflow. No traffic, traces, data-volume, incident, or cost evidence was supplied, so every claim is `UNVERIFIED`.

### Provisional scorecard

Declared weighting: requirements 15%, capacity 20%, redundancy 15%, data scaling 15%, caching 5%, async offload 10%, observability 10%, rollout 5%, cost proportionality 5%. All nine axes are applicable.

| Axis | Score | Missing evidence |
|---|---:|---|
| Requirements | 0/10 | Functional/NFR targets, latency SLO, owners, and out-of-scope items |
| Capacity evidence | 0/10 | Peak QPS, p95/p99 latency, storage, bandwidth, concurrency |
| Redundancy | 0/10 | SPOF analysis, measured RTO, and failover drill |
| Data scaling | 0/10 | Access patterns, ownership, indexes, growth plan |
| Caching | 0/10 | Proven hot reads, TTL, invalidation, and consistency requirements |
| Async offload | 0/10 | Slow/bursty work, queue drain rate, age alert, and DLQ |
| Observability | 0/10 | Traces, traffic/error/latency/saturation metrics, owned alerts, runbooks |
| Rollout | 0/10 | Canary/feature flag, rollback trigger, and reversible migrations |
| Cost proportionality | 0/10 | Traffic-sized topology, operating cost, and risk justification |

**Provisional result: 0/90.** This evaluates the proposal evidence, not the existing implementation’s actual quality.

### Recommended path

1. Establish ground truth first:
   - Trace checkout end-to-end and identify the worst hop.
   - Capture p50/p95/p99 latency, error rate, peak QPS, concurrency, database timings, lock time, external-call time, payload sizes, and saturation.
   - Review data volume, incident history, and the top user-visible failure.
   - Define a checkout latency SLO and error budget.

2. Apply the smallest fix to the proven constraint:
   - Optimize queries and indexes before sharding.
   - Reduce payloads and unnecessary serialization.
   - Add bounded connection pools and timeouts.
   - Cache only measured hot reads, with explicit TTL and invalidation.
   - Move non-critical work—emails, analytics, fulfillment notifications—behind a queue with a drain-rate budget, age-based alerting, retries, and a DLQ.
   - Keep payment, inventory reservation, and order creation transactional where their invariants require it.

3. Consider Go only if profiling shows CPU, allocation, or runtime overhead is material. Benchmark the current service against an optimized implementation before committing.

4. Consider service decomposition only where ownership, scaling, deployment, or failure isolation requires it. Define contracts, data ownership, idempotency keys, timeout/retry policy, consistency behavior, and compensation for every cross-service operation. Do not introduce distributed transactions by default.

5. Roll out with a canary or feature flag, measured rollback triggers, dual-read or expand/contract migrations, and a reversible migration plan. A design approval does not prove deployment or release.

### Prioritized findings and actions

- **High — capacity/observability — UNVERIFIED:** The bottleneck is unknown; rewriting may not improve user latency.  
  **Smallest fix:** instrument and trace the current checkout; exit proof is a measured reduction in p95/p99 at representative peak load.

- **High — data scaling — UNVERIFIED:** The proposal does not show query plans, lock contention, or access patterns.  
  **Smallest fix:** capture slow-query data and optimize indexes, transactions, and connection usage before changing architecture.

- **High — rollout — UNVERIFIED:** A rewrite implies migration risk on a revenue-critical path.  
  **Smallest fix:** implement a strangler/canary path with rollback triggers and reversible schema changes.

- **Medium — async offload — UNVERIFIED:** Synchronous ancillary work may be extending checkout latency.  
  **Smallest fix:** queue only non-critical work, with drain rate, queue-age alerts, retries, and DLQ.

- **Medium — cost/operability — UNVERIFIED:** Microservices add deployment, networking, tracing, and on-call burden.  
  **Smallest fix:** name service owners, 3 a.m. runbooks, failure modes, and expected operating cost before decomposition.

Action register status: `open`; independent approver and release-gate authority must be named before closure. Persistence: `response_only`; no improvement-plan file was created.
