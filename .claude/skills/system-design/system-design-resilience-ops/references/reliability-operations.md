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
- Classify each readiness dependency **per request class** as required or optional. Required means fail readiness; optional means keep serving that class degraded. Shared or local describes blast radius, not whether serving is safe: a shared cache is usually optional, but a shared auth or quota dependency is mandatory for protected routes.
- Mandatory enforcement is not a health state. When a protected request cannot be authenticated or authorized, reject it locally and fail closed on that route; readiness, ejection caps, and panic modes change which endpoint receives traffic, never whether a check may be skipped. Marking every replica unready still empties discovery, which is why enforcement failure needs a local rejection path rather than a fleet-wide unready signal.
- Readiness and discovery are separate from passive outlier ejection. A readiness probe fails an instance for new traffic through discovery; passive ejection removes it from a balancer's healthy set for a bounded time. Neither mechanism grants permission to serve work an instance cannot safely serve, and a panic threshold is a routing decision, not an authorization decision.
- Detection has two halves: passive observation of live traffic (error rate, timeouts, latency outliers) and active probes on an interval. Passive catches what a shallow probe misses; active recovers what passive ejected. Bound consecutive failures, ejection backoff, and the ejected fraction, and state the recovery path: probe pass, timed re-admission, or gradual traffic ramp.
- Verify a recovered host by traffic, not by probe answer. A readiness probe that passes while the data path still fails re-admits a broken instance.
- Keep probe cost below the traffic it protects: a readiness endpoint that queries the database on every scrape is a self-inflicted load generator. Probe the shallowest path that still proves the instance can serve.
- Anti-pattern: readiness that fails on an optional dependency removes healthy capacity during a partial outage.

## Failure Capacity

Availability claims need arithmetic, not replica counts. For each tier record four terms:

| Term | Source |
| --- | --- |
| Per-instance safe load | Measured load at the latency target with headroom, not the saturation point; state the unit (requests per second, or concurrent requests) |
| Largest in-scope failure | One instance (N+1) or one zone, stated once for the scope |
| Surviving capacity | Surviving instances × per-instance safe load, in that same unit |
| Admitted demand | Peak arrivals passing admission, including retry amplification, in that same unit |

If admitted demand exceeds surviving capacity, the design must name what degrades and in what order: reject new work by cost class, queue with a deadline and shed on overflow, serve stale or partial results for declared classes, or drop optional work. Without that decision one instance failure turns a latency blip into a full outage.

Recompute after every autoscaling or pool-size change, and keep units coherent. `callers × per-instance pool size` yields **connections** (or concurrent requests, for an explicitly request-concurrency pool), so compare it only to a connection or concurrency ceiling. Rate is derived, not counted: `rate ≈ concurrency / service time`, so 100 pooled connections at 10 ms per call can drive roughly 10,000 requests/s — matching that 100 to a 100 QPS ceiling proves nothing. Bound admitted rate against the rate ceiling separately, with fan-out and retries included, using the measured service time at the bottleneck ([building blocks](../../system-design-building-blocks/references/building-blocks.md#failure-capacity)).

## Draining and Termination

A deploy, scale-in, or eviction is a planned instance failure; make it look like one.

1. Fail readiness and remove from discovery. Expect stale routing briefly: caches, connection reuse, and in-flight streams keep sending traffic.
2. Keep serving in-flight work until a deadline shorter than the platform's termination grace. Kubernetes defaults grace to 30 s and runs a `preStop` hook before `SIGTERM`, so the drain budget must fit inside it.
3. At the deadline, cancel remaining work and return a retryable error instead of being killed mid-response.
4. Confirm the rest of the system already assumed this instance gone: clients retry with the remaining deadline and the balancer's failure capacity excludes it.

Long-lived connections need their own path: send a close signal with a resume cursor, keep the cursor readable for the retention window, then detach. A drain that waits for a client that never disconnects is the leak that turns a routine deploy into a partial outage. Cap concurrent streams per instance and give each a maximum lifetime so drain can always finish.

## Timeouts, Retries, Shedding

- Every remote call has an explicit timeout shorter than the caller's own deadline; propagate the remaining deadline downstream.
- Retry only idempotent operations. Use exponential backoff with jitter and a total attempt budget.
- Add a retry budget per client (for example, retries capped at 10% of requests) so retries cannot double load during an incident.
- One retrying layer per call chain where practical. A mesh retry, a gateway retry, and an application retry each with their own budget multiply work by up to `attempts^layers` and can exceed the caller deadline; pick the owner and record which layer is allowed to retry ([communication](../../system-design-communication/references/communication-selection.md)).
- Budget the whole path: `connect + queue wait + upstream work + retries ≤ caller deadline`. Queue wait counts; a request that waits 80% of its deadline in a pool then times out is a capacity problem, not a timeout problem.
- Shed load at the edge when saturated: reject cheaply and early with a retry hint rather than queueing to death. Shed in a stated order — cheap rejects first, then optional enrichment, then by cost class — so the degraded class is a decision rather than whichever request lost the race.
- Autoscaling is not admission control: it reacts in seconds to minutes, and the fleet's aggregate pool demand must still fit the downstream ceiling before you scale out.

## Streaming Backpressure

- Enforce the bound as a hard limit: reject or close when buffered bytes, items, or age exceed budget. Alert on stream age and per-instance buffered bytes, not just connection count.
- A stream that outlives its expected duration without producing is a leak — cancel it, release its subscription, and count it. Open streams per instance belong in the saturation signal set.
- Verify recovery by resumed delivery, not by a successful handshake: a reconnect that receives nothing looks healthy in metrics and is not.
- Producer-side bounds, flow control, and cursor design: [Building Blocks — Streaming Connections and Buffers](../../system-design-building-blocks/references/building-blocks.md#streaming-connections-and-buffers).

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
