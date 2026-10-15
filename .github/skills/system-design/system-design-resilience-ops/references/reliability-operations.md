# Reliability Operations

## Failure Walk

Run this per component during design, before the diagram is signed off.

| Question | Design output |
| --- | --- |
| What if one instance dies? | Redundancy count and health-check behavior |
| What if the zone dies? | Multi-AZ placement, quorum size |
| What if the region dies? | DR topology, RPO/RTO, data replication mode |
| What if it is slow rather than down? | Timeout, circuit breaker, load shedding rule |
| What if it returns wrong data? | Validation, checksum, poison-message handling |
| What if it is unreachable at startup? | Startup degradation policy, no crash loop |
| Who is affected while it is broken? | Blast radius statement and containment plan |

Gray failure - slow, partial, or intermittent - causes more outages than clean crashes. Design
timeouts and shedding for the slow case first.

## Health Checks

- **Liveness**: is this process itself broken? Must not call dependencies. Failure means restart.
- **Readiness**: can this instance serve traffic right now? May check required dependencies. Failure means remove from rotation.
- **Startup**: is the process still initializing? Prevents premature restarts on slow boot.
- Anti-pattern: readiness that fails on an optional dependency removes healthy capacity during a partial outage.

## Timeouts, Retries, Shedding

- Every remote call has an explicit timeout shorter than the caller's own deadline; propagate the remaining deadline downstream.
- Retry only idempotent operations. Use exponential backoff with jitter and a total attempt budget.
- Add a retry budget per client (for example, retries capped at 10% of requests) so retries cannot double load during an incident.
- Shed load at the edge when saturated: reject cheaply and early with a retry hint rather than queueing to death.

## Disaster Recovery

- Define RPO (acceptable data loss) and RTO (acceptable time to restore) only for data and journeys whose loss or downtime matters to the declared scope.
- Specify automated, encrypted backups and separate-account/region storage when backup/restore is the selected recovery path; match retention to applicable compliance requirements.
- For a proposed design, record in-scope recovery targets, mechanism, assumptions, and planned restore/failover drill. For implementation, verify the mechanism; for an operations claim of material recovery, record a dated drill and measured result against the target. No drill is required for a justified out-of-scope stateless-recovery `N/A`.
- Runbooks for an in-scope failover identify the detection signal, decision owner, promotion steps, traffic switch, data reconciliation, and rollback if failover fails.
- Document recovery dependency order when it affects restoration; avoid prescriptive recovery steps for components outside the declared scope.

## Journey SLOs and Critical-Flow Evidence

Define objectives for a user-visible journey, not an isolated retry attempt or infrastructure metric. For each material SLO, record:

| Field | Required meaning |
| --- | --- |
| Journey and indicator | Named user operation and the success/failure or latency condition visible to that user |
| Basis and population | Request-based or time-based; identify eligible unique business operations or eligible time intervals |
| Numerator / denominator | Count successful operations over eligible operations; for time objectives use summed good eligible duration / summed eligible duration, or unweighted counts of fixed-duration intervals only |
| Window and target | Rolling or calendar window and objective; label target, estimate, or measurement with its source |
| Exclusions | Explicit, bounded exclusions; do not exclude pending, failed, or degraded outcomes merely because they are inconvenient |
| Pending / degraded | Pending is not success until the promised completion condition occurs; degraded counts as success only if it satisfies the journey contract without violating an invariant |
| Owner and action | Accountable owner, alert/burn response, and the action when the error budget is consumed or burning too quickly |

For a request-based SLO, define the denominator as eligible unique business operations entering the declared boundary during the window, and the numerator as those meeting the user-visible condition within its deadline. For a time-based SLO, use summed good eligible duration over summed eligible duration, or fixed-duration interval counts only. State eligibility and bounded exclusions before measurement; retries never add denominator entries or numerator successes. With target fraction `t`, the request error budget is at most `denominator × (1 - t)` bad operations; the time error budget is `eligible duration × (1 - t)` bad duration. State the burn/consumption trigger and owner action (for example, pause risky non-emergency rollout and prioritize reliability work); choose thresholds for the declared service, not as a universal constant.

For asynchronous work, count one user operation, not each retry or worker attempt. Completion within the promised journey deadline may satisfy the objective; a timeout, terminal failure, or unresolved outcome does not. A later background completion changes the result only if it meets the declared completion condition and deadline. State separately whether a retry returns current status, resumes the same operation, or reports an unknown outcome.

For each critical flow, assess only material concerns: durable acknowledgment and authoritative state; freshness/convergence at the consumer; ordering, deduplication, and bounded retry; backlog size/age, drain capacity, and backpressure; retention/deletion of derived copies; and recovery after loss or corruption. Link each concern to the flow invariant, adverse timeline, owner, and observable verification. A justified out-of-scope `N/A` names the scope/risk reason; it is not evidence that a material concern is safe.

Describe target, plan, implementation, and operations as prose claim categories, not schema values, evidence kinds, or confidence levels. For source citations, preserve `evidence_kind: code|document|runtime|deployment` and its applicable `evidence_confidence: unverified|assumed|documented|observed`; metrics separately label target, estimated, or measured provenance.

| Prose claim category | Typical supporting evidence |
| --- | --- |
| Target | Declared objective, such as freshness, RPO, RTO, or completion deadline; not a measured result |
| Plan | Proposed mechanism, assumptions, and planned validation, cited as documentation where applicable |
| Implementation | Evidence the mechanism exists and enforces the contract, with its source kind/confidence stated |
| Operations claim | Observed telemetry, backlog/freshness results, and a dated timed recovery drill only when material recovery is claimed and in scope |

A proposed design may state in-scope recovery targets and planned validation. Do not claim an implemented mechanism from a plan, or measured recovery from an unrun drill. Require RPO/RTO and timed drill evidence only for an in-scope recovery/restore claim; a stateless flow may record `N/A` with its scope/risk reason.

For time-based SLOs, define the numerator as the sum of good eligible time and the denominator as the sum of all eligible time in the window. Alternatively, count good versus total intervals only when every interval has the same fixed duration. Do not give unequal intervals equal weight. Calculate time error budget as `eligible duration × (1 - target fraction)` using the same duration unit as the SLO window.

## Observability Baseline

| Signal | Example metric | Alert on |
| --- | --- | --- |
| Traffic | requests/sec by route | Sudden drop as well as spike |
| Errors | 5xx rate, failed jobs | Error-budget burn rate |
| Latency | p50/p95/p99 by route | p99 breaching SLO |
| Saturation | queue depth and age, pool usage, CPU, memory | Sustained approach to a hard limit |

Logs carry the correlation id; traces carry the causal path; metrics carry the trend. Queue consumers
must propagate the trace context from the producing request or the causal chain breaks at the queue.

## Scaling Policy

- Scale on the metric that reflects the bottleneck: queue age for workers, concurrency or p95 latency for APIs, not CPU by default.
- Always set a minimum (survives a cold spike) and a maximum (caps cost and protects downstream stores).
- Add a scale-in cooldown so a spiky workload does not thrash.
- Protect the data tier: an autoscaled app fleet can exhaust the database connection pool. Use a pooler and cap connections per instance.
