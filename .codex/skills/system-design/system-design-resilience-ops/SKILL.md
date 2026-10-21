---
name: system-design-resilience-ops
description: "Design failure behavior and operability for a declared scope: evaluate journey SLOs, resilience, recovery, and rollout evidence. Use when reviewing availability, planning recovery, or deciding rollout mechanics."
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

| Topology | Recovery characteristics | Cost | Fits |
| --- | --- | --- | --- |
| Single region, multi-AZ | Zone recovery depends on health detection and failover behavior | Low | In-region availability objective |
| Active-passive across regions | Promotion, data reconciliation, and traffic switch determine recovery | Medium | Cross-region recovery when the objective warrants it |
| Active-active across regions | Conflict handling and regional independence determine continuity | High | Regional latency or failover objective justifies the added complexity |

- Set recovery objectives only for data and journeys whose loss or downtime matters to the declared scope. Record RPO (tolerable data loss) and RTO (tolerable restoration time) as targets before selecting a recovery mechanism; do not invent objectives to justify a topology.
- A proposed design may state an in-scope recovery target, mechanism, and planned drill. An implementation claim needs implementation evidence; an operations claim about recovery needs a dated drill and measured result against the target.
- Backups and restore tests are required when the flow's recovery contract depends on backup/restore; otherwise state the applicable recovery path and why a backup is not material.

## Observability

- Instrument the four signals per service: traffic, error rate, latency percentiles, saturation.
- Alert on user-visible symptoms and on error-budget burn rate, not on raw CPU.
- Propagate a trace and correlation id across every hop, including queue messages.
- Every alert needs an owner, a runbook link, and a defined next action; an alert nobody acts on is noise.
- Define user-journey SLOs and evaluate data-flow correctness, durability, freshness, backlog, and recovery per critical flow; use [Reliability Operations](references/reliability-operations.md) for scope-qualified evidence.

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

- **No unsupported recovery claim**: match RPO/RTO targets, recovery plans, implementation evidence, and observed drills to the declared scope; a plan is not a measured result.
- **No unbounded retry**: retries need budget, backoff with jitter, and a stop condition, or they amplify an outage.
- **No liveness probe on dependencies**: a downstream outage must not restart the fleet.
- **No deploy without rollback**: irreversible releases are outages waiting for a bad build.
- **No autoscaling without a floor and ceiling**: unbounded scaling turns a bug into a bill.

## References

- [Reliability Operations](references/reliability-operations.md) - failure drills, health check design, DR runbook shape, scaling policy notes
