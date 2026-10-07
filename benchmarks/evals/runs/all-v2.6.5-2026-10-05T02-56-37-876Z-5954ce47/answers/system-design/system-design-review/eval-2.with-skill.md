A Go rewrite with microservices is premature. The current evidence supports “checkout is slow,” not “Go or service boundaries are the cause.” Start with the smallest proven fix; consider a strangler migration only after measurements identify a runtime or ownership constraint.

Assumptions: checkout is a revenue-critical synchronous path involving payment, inventory, pricing, and order persistence. Traffic, latency, data volume, incidents, owners, and deployment evidence are unavailable, so unsupported claims are `UNVERIFIED`.

### Provisional scorecard

Profile: revenue-critical, latency-sensitive transactional system. Requirements, capacity, redundancy, data, observability, and rollout receive priority weighting of 1.5; caching, async offload, and cost receive 1.0. No axis is N/A.

| Axis | Score | Evidence |
|---|---:|---|
| Requirements | 2/10 | Only “slow checkout”; SLO, functional requirements, NFRs, out-of-scope items, and owners are `UNVERIFIED`. |
| Capacity evidence | 0/10 | Peak QPS, concurrency, storage, bandwidth, and growth are `UNVERIFIED`. |
| Redundancy | 0/10 | Failover, RTO, and critical dependency topology are `UNVERIFIED`. |
| Data scaling | 1/10 | Transactional ownership, access patterns, indexes, and table growth are `UNVERIFIED`. |
| Caching | 0/10 | No measured hot-read path, TTL, or invalidation policy is documented. |
| Async offload | 0/10 | No queue, drain-rate budget, DLQ, or safe offload boundary is documented. |
| Observability | 0/10 | Logs, traces, user-visible alerts, and runbooks are `UNVERIFIED`. |
| Rollout | 0/10 | Canary, feature flag, rollback trigger, and reversible migration plan are `UNVERIFIED`. |
| Cost proportionality | 0/10 | Microservice count, operational cost, and measured traffic justification are `UNVERIFIED`. |

Raw score: **3/90**. This measures design evidence, not implementation quality.

The worst hop is currently **UNVERIFIED**. Trace the checkout path end to end and identify whether the constraint is database contention, an external payment/tax/shipping call, serialization, lock duration, connection-pool exhaustion, or application CPU.

### Recommended sequence

**Now**

- Define checkout SLOs: p50/p95/p99 latency, error rate, conversion impact, availability, RTO/RPO, and supported peak QPS.
- Add request tracing and metrics for traffic, errors, latency, and saturation at every hop.
- Profile database queries, indexes, locks, connection pools, serialization, and external dependency latency.
- Preserve transactional invariants: idempotency keys, order state transitions, payment authorization safety, and reconciliation.
- Optimize the measured worst hop first. Typical low-risk fixes include query/index changes, removing N+1 calls, connection-pool tuning, and parallelizing independent reads.
- Cache only proven hot reads, with an owner, TTL, invalidation behavior, failure behavior, and cost justification.
- Queue only non-critical side effects such as email, analytics, or fulfillment notifications. Define drain rate, age-based alerts, retries, and a DLQ. Keep payment authorization and order commit on the synchronous path unless their consistency model is explicitly redesigned.

**Next**

- If one bounded capability is the measured bottleneck, extract it behind a stable contract—possibly in Go.
- Use an outbox or equivalent durable event handoff where database changes must trigger asynchronous work.
- Run contract, load, failure, and recovery tests before production traffic.
- Establish canary or feature-flag rollout with a metric rollback trigger covering p95 latency, checkout conversion, payment errors, duplicate orders, and error-budget burn.

**Later**

- Migrate incrementally using a strangler pattern, one capability at a time.
- Use Go when profiling demonstrates a meaningful CPU, concurrency, runtime, or operational advantage—not merely because microservices are fashionable.
- Reassess topology and cost after real traffic measurements; avoid sharding, multiple regions, queues, replicas, or caches without a measured constraint and recovery plan.

### Findings and action register

| Action ID | Finding IDs | Risk / source / consequence | Bounded change | Role | Dependencies | Scoped exit proof | Status | Release gate |
|---|---|---|---|---|---|---|---|---|
| A1 | F1, F2, F7 | High risk / undocumented requirements and capacity / optimization may target the wrong constraint. Source: missing requirements and runtime evidence. | Define SLOs, peak QPS, dependency budget, error budget, RTO/RPO, and checkout ownership. | Product + SRE + checkout lead | Traffic and incident data | Approved requirements sheet and baseline dashboard covering two representative peak periods. | open | Independent approver accepts SLO and capacity baseline. |
| A2 | F2, F5, F6, F7 | High risk / unknown worst hop / continued customer latency and conversion loss. Source: no end-to-end telemetry. | Instrument traces and RED/saturation metrics; profile the database and external calls; fix the single worst measured hop. | Checkout engineering + SRE | A1 | p95/p99 improves against the agreed SLO without increased payment/order correctness errors. | open | Independent approver verifies dashboard and load-test results. |
| A3 | F3, F4, F6 | High risk / hidden failure or consistency risk / duplicate charges, lost orders, or stuck work. Source: undocumented failure and data ownership behavior. | Document order/payment invariants, idempotency, ownership, retry policy, queue drain rate, DLQ, and reconciliation. | Architecture + payments + data owners | A1, dependency contracts | Fault-injection tests demonstrate safe retries, recovery, DLQ handling, and reconciliation. | open | Independent approver signs the recovery and correctness gate. |
| A4 | F8, F9 | High risk / big-bang Go microservice rewrite / irreversible migration and unjustified operating cost. Source: no rollout or cost evidence. | Extract one bounded capability behind a contract, deploy behind a flag, canary it, and retain rollback. | Engineering lead + release manager | A1–A3 | Canary meets latency, error, conversion, cost, and correctness thresholds; rollback is demonstrated. | open | Independent approver authorizes production expansion. |

```text
improvement_plan: {
  status: response_only,
  path: null,
  missing: ["repository context and write authorization unavailable"]
}
```

Verdict: **Do not approve a full rewrite yet. Approve measurement, bottleneck isolation, and a reversible optimization path; approve a Go microservice only for a capability whose measured constraint justifies the extraction.**
