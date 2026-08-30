---
name: system-design-resilience-ops
description: "Make a design survivable and operable: eliminate single points of failure, pick failover topology, set RPO/RTO, define readiness signals and observability, choose a deployment and rollback strategy. Use when reviewing availability, planning DR, or deciding rollout mechanics."
metadata:
  triggers:
    keywords:
      - single point of failure
      - failover
      - disaster recovery
      - rpo
      - rto
      - multi-region
      - autoscaling
      - deployment strategy
      - blue-green
      - canary
---

# Resilience and Operations

## **Priority: P1 (HIGH)**

A design is not done until its failure and its rollout are designed.

## SPOF Elimination

- Walk every component and ask what happens when exactly one instance dies, then when the whole zone dies.
- Any component with one instance, one writer, or one shared config plane is a single point of failure. Name it or remove it.
- Redundancy only helps when failure modes are independent: shared credentials, shared config, and a shared control plane cancel the benefit.
- Blast radius: state which users or flows are affected per component failure, and cap it with cells, bulkheads, or per-tenant quotas.

## Failover and Recovery

| Topology | Recovery time | Cost | Fits |
| --- | --- | --- | --- |
| Single region, multi-AZ | Minutes, automatic | Low | Most products |
| Active-passive across regions | Minutes to hours, drill-dependent | Medium | Regulated or high-value flows |
| Active-active across regions | Seconds | High | Global low-latency, conflict-tolerant data |

- Set **RPO** (tolerable data loss) and **RTO** (tolerable downtime) as numbers before choosing a topology; the numbers pick the topology, not the reverse.
- Untested failover is a hypothesis. Schedule a drill and record the measured RTO against the target.
- Backups need a restore test. A backup that has never been restored is not a backup.

## Observability

- Instrument the four signals per service: traffic, error rate, latency percentiles, saturation.
- Alert on user-visible symptoms and on error-budget burn rate, not on raw CPU.
- Propagate a trace and correlation id across every hop, including queue messages.
- Every alert needs an owner, a runbook link, and a defined next action; an alert nobody acts on is noise.

## Rollout

| Strategy | Blast radius | Rollback | Cost |
| --- | --- | --- | --- |
| Rolling | Grows during the roll | Roll forward or back, slow | Low |
| Blue-green | Full switch at cutover | Instant switch back | Double capacity |
| Canary | Small cohort first | Stop and drain the cohort | Needs routing plus metrics |
| Feature flag | Per user or tenant | Instant, no redeploy | Flag lifecycle debt |

- Schema and code deploy separately: expand, migrate, contract. Never ship a migration that only the new code can read.
- Define the rollback trigger as a metric threshold and a time box before the deploy starts.

## Anti-Patterns

- **No untested failover**: no DR claim without a drill date and a measured RTO.
- **No unbounded retry**: retries need budget, backoff with jitter, and a stop condition, or they amplify an outage.
- **No liveness probe on dependencies**: a downstream outage must not restart the fleet.
- **No deploy without rollback**: irreversible releases are outages waiting for a bad build.
- **No autoscaling without a floor and ceiling**: unbounded scaling turns a bug into a bill.

## References

- [Reliability Operations](references/reliability-operations.md) - failure drills, health check design, DR runbook shape, scaling policy notes
