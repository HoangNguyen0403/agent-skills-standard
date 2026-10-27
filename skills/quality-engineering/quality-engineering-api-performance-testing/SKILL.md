---
name: quality-engineering-api-performance-testing
description: Specify tool-neutral API load, stress, and recovery testing with parameterized workload models, SLO percentiles, and finite overload bounds. Use when evaluating API latency, throughput, saturation, or recovery behavior under concurrent traffic.
metadata:
  triggers:
    files:
      - "tests/perf/**/*.json"
      - "tests/load/**/*"
    keywords:
      - api load testing
      - api performance testing
      - stress testing
      - api recovery testing
      - arrival rate
      - p95 latency
      - p99 latency
---

# API Performance, Load, and Recovery Testing

## **Priority: P1 (HIGH)**

## Workflow

1. **Parameterize Workload**: Source arrival rate vs concurrency, request mix, duration, and SLO percentiles from approved requirements/SLOs. Missing approvals block execution, not offline planning.
2. **Preflight & Bound (C4)**: Verify explicit target authorization and synthetic isolation. Enforce distinct finite ceilings, each with its own unit — `maxArrivalRateRps`, `maxInFlightRequests`/`maxConcurrency`, `maxPayloadBytes`, duration — plus cancellation hooks and continuous stop tripwires. A rate ceiling is not a concurrency bound.
3. **Establish Phase-Specific Baseline**: Exclude warmup. Measure baseline throughput, success latency, error latency ($p50, p95, p99$), and baseline error budget.
4. **Evaluate Overload & Degradation**: Apply stepped ramp up to authorized stress cap. Distinguish expected shedding (e.g. 429/503) from unexpected system faults; abort if tripwires fire.
5. **Verify Post-Overload Recovery**: Drop traffic to baseline/zero. In a dedicated post-stress window, verify return to baseline latency, error budget restabilization, and resource release against approved recovery SLO.
6. **Capture Evidence (C3)**: Emit complete C2 scenario and C3 evidence records; record unexecuted runs as BLOCKED/NOT RUN with explicit missing prerequisites.

## Workload Specification (AC-11)

- **Model Selection**: Select **open model** (constant arrival rate) for uncoordinated/public traffic; **closed model** (virtual users) for coordinated/batch workers.
- **Request Mix**: Proportions of endpoints, read/write ratio, and data variance parameterized from production profiles or approved requirements.
- **Warmup & Measurement**: Explicit warmup window (metrics discarded from SLOs) preceding steady-state observation.
- **SLO Metrics (Success & Error)**: Record both successful and error response latencies ($p50, p95, p99$), throughput (RPS), error budget, and resource saturation.
- **Approval Gate**: Operational targets must originate from approved specifications. If unapproved, mark execution `BLOCKED: Missing approved SLO threshold for <metric>`; continue offline planning. Numeric examples in references are synthetic fixture contracts only.

## Overload, Tripwires, and Recovery (AC-12)

- **Ramp & Bounds**: Define stepped ramp with finite duration, arrival-rate, in-flight concurrency and payload ceilings, plus explicit abort signals (C4). Each ceiling is checked and reported separately; an approved rate without an approved in-flight ceiling keeps execution `BLOCKED`.
- **Continuous Tripwires**: Abort immediately if unexpected faults (e.g. unhandled 5xx, socket drops) or critical saturation breach approved safety limits.
- **Phase-Specific Oracles**:
  - *Overload Phase*: Expected shedding (429/503 with Retry-After) does not fail the run; unexpected 5xx crashes and hangs fail.
  - *Recovery Phase*: Post-stress observation window evaluates return to baseline latency, error budget reset, and queue/connection release against approved recovery SLO. Merely observing 503 shedding is not a pass.

## Tool-Neutral Execution & Readiness

- Core procedures are runner-agnostic. Check for installed drivers (e.g. k6, autocannon).
- **Execution Readiness**: Driver presence alone does not authorize execution. Unless the harness supports target authorization, continuous tripwire aborts, phase separation, and post-load recovery observation, mark execution as `BLOCKED: Missing execution safety/recovery controls`.

## Anti-Patterns

- **No unapproved numeric defaults**: Never invent universal latencies, error percentages, tripwires, or recovery windows.
- **No whole-run error pooling**: Do not fail healthy overload shedding against steady-state error budgets.
- **No success-only latency filtering**: Record both success and error response latencies.
- **No unverified recovery**: Rejection status codes under peak load do not prove post-load recovery.
- **No unauthorized execution**: Missing target authorization or safety controls blocks live execution.

## References

- [Workload Modeling & SLOs](references/workload-modeling.md) — Open vs closed models, phase separation, success/error latencies, and approval gates.
- [Overload, Stop Conditions & Recovery](references/overload-and-recovery.md) — Phase-specific oracles, parameterized tripwires, recovery evaluation, and synthetic fixtures.
- [Driver Execution & Integration](references/driver-execution.md) — Readiness gates, partial runner sketches, complete C2/C3 schemas, and BLOCKED records.
