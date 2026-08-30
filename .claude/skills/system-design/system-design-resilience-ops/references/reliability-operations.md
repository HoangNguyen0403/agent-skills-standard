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

- Define per data class: RPO (acceptable data loss window) and RTO (acceptable time to restore).
- Backups: automated, encrypted, stored in a separate account or region, with retention matched to compliance.
- Restore drills: scheduled, timed, and recorded. Track measured restore time against RTO as a metric.
- Runbook contents: detection signal, decision owner, promotion steps, DNS/traffic switch, data reconciliation, and the rollback path if the failover itself fails.
- Document the dependency order for recovery; a service that starts before its store simply crash-loops.

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
