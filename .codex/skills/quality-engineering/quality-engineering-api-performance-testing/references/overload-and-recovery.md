# API Overload, Stop Conditions, and Recovery Protocol

## 1. Overload Architecture and Degradation Objectives

Stress testing deliberately pushes an API beyond nominal capacity to verify two distinct behaviors:
1. **Graceful Degradation (During Peak Overload)**: The system protects core state by shedding excess requests (e.g. HTTP 429 Too Many Requests or 503 Service Unavailable with `Retry-After`) rather than failing with unhandled exceptions, crashing, or corrupting data.
2. **Autonomous Recovery (Post-Overload)**: When traffic returns to baseline or zero, the system autonomously restabilizes without human intervention, restoring baseline latency and error budgets within the approved recovery window.

## 2. Safety Bounds and Execution Preconditions (C4)

Active stress execution is forbidden unless all C4 preconditions are verified:
- **Target Authorization**: Explicit written authority to execute stress testing on the target environment.
- **Environment Isolation**: Dedicated synthetic test environment. Active stress against production, shared staging, or external dependencies is strictly banned.
- **Finite Caps**: Parameterized hard ceilings, each recorded with its own unit:
  - Maximum duration (total run time and peak overload time), seconds.
  - `maxArrivalRateRps`: offered request rate ceiling (req/s).
  - `maxInFlightRequests` (or `maxConcurrency`): concurrently outstanding request ceiling, enforced by the generator.
  - `maxPayloadBytes`: per-request body size ceiling (bytes) plus a total-bytes-emitted ceiling.
- **Rate Is Not a Concurrency Bound**: An arrival-rate ceiling limits admissions per second, not outstanding work. When an open-model target stalls, a rate-only cap still accumulates pending requests, sockets, and memory. Require a distinct finite in-flight ceiling; if it (or the payload ceiling, or the cancellation hook) is unavailable, mark execution `BLOCKED` and continue offline planning.
- **Continuous Abort Mechanism**: The execution harness must support real-time abort signals (`SIGINT`, programmatic cancellation) triggered by tripwires.

## 3. Phased Overload Profile

Execution is structured into sequential phases with distinct observation criteria:

```text
Traffic Rate
  ^
  |                   [Overload / Peak Phase: Finite Cap]
  |                   +---------------------------------+
  |                  /                                   \
  |      [Ramp-up]  /                                     \ [Cool-down / Drop]
  |         +------+                                       +------+  [Post-Overload Recovery Window]
  |        /                                                       \---------------------------------
  |       / [Baseline Load Phase]                                   [Baseline Traffic or Zero Load]
  +------+-------------------------------------------------------------------------------------------> Time
```

1. **Baseline Phase**: Run at approved nominal load to establish reference success latency, error latency, and error budget.
2. **Stepped Ramp-up**: Increment load in parameterized steps up to the authorized overload cap.
3. **Overload Phase**: Maintain peak traffic for a finite, pre-approved duration.
4. **Load Reduction / Drop**: Abruptly reduce traffic to baseline load (or zero).
5. **Post-Overload Recovery Observation Window**: Monitor system vital signs for the duration of the approved recovery window without adding new stress traffic.

## 4. Continuous Stop Conditions (Tripwires)

Tripwires protect infrastructure from catastrophic collapse during test execution. They must be evaluated continuously in real time, not at the end of the run.

Tripwire thresholds must be parameterized from approved infrastructure safety policies. The following table illustrates a synthetic fixture specification:

| Tripwire Parameter | Evaluated Condition | Action | Rationale |
| --- | --- | --- | --- |
| `maxUnexpectedErrorRate` | Non-shedding errors (500, 502, unhandled exceptions) exceed threshold over sampling window. | Immediate Abort | Prevents cascading failure, crash loops, and database corruption. |
| `maxConnectionDropRate` | Network-level socket resets (`ECONNRESET`, connection timeouts) exceed threshold. | Immediate Abort | Prevents kernel socket starvation and gateway exhaustion. |
| `maxHostSaturation` | Memory, CPU, or connection pool utilization breaches safety ceiling without stabilization. | Immediate Abort | Prevents kernel OOM-killer invocation and unrecoverable disk thrashing. |

*Note: All numeric limits in test plans must be bound to approved system specifications. If thresholds are missing, execution is BLOCKED until approved.*

## 5. Phase-Specific Oracles: Shedding vs Recovery

Pass/fail criteria must be evaluated independently per phase. Aggregating errors across phases is strictly prohibited.

### Overload Phase Oracle
- **Expected Shedding**: Responses returning approved rejection status codes (e.g. 429, 503 with `Retry-After`) confirm active backpressure and are classified as **expected shedding**. They do NOT count as unexpected system faults.
- **Unexpected Faults**: Responses returning unhandled 5xx (500, 502, 504), socket resets, or hanging requests without timeout fail the overload phase.

### Recovery Phase Oracle
Merely observing 503 or 429 status codes during overload **does not establish a pass**. The test must evaluate the post-overload recovery window:
1. **Traffic State**: Traffic reduced to approved baseline (or zero).
2. **Latency Restabilization**: Success latency ($p50, p95, p99$) and error latency return to within approved baseline SLO thresholds.
3. **Error Budget Restabilization**: Error rate returns to approved baseline budget.
4. **Resource Drain**: Queues drain, active worker threads release, and database connection pools return to nominal idle state within the approved recovery window.

## 6. Workload Shapes: Spike and Soak

- **Spike Profile**: Rapid transition from baseline to peak overload in seconds. Evaluates auto-scaler spin-up lag, surge queue limits, and initial thread allocation.
- **Soak / Endurance Profile**: Extended run at moderate load (near capacity). Evaluates cumulative effects: slow memory leaks, connection pool retention, file descriptor leaks, and table fragmentation.
- **Risk Selection**: Spike and soak are optional workload shapes selected when specific product risks warrant them; they are not mandatory for all test cycles.

## 7. Synthetic Fixture Contracts for Verification (Handoff to W6)

The following synthetic fixtures define concrete fault and control contracts for automated verification:

```json
{
  "_comment": "[ILLUSTRATIVE SYNTHETIC FIXTURE CONTRACT ONLY — NOT UNIVERSAL ORACLES]",
  "fixtureContracts": [
    {
      "fixtureId": "FIXTURE-PERF-CONTROL-001",
      "description": "Nominal overload with graceful shedding and verified post-load recovery",
      "parameters": {
        "baselineRps": 50,
        "overloadRps": 150,
        "maxArrivalRateRps": 250,
        "maxInFlightRequests": 100,
        "maxPayloadBytes": 1048576,
        "overloadDurationSec": 60,
        "recoveryWindowSec": 30,
        "approvedBaselineLatencyP95Ms": 75,
        "approvedRecoveryLatencyP95Ms": 85,
        "approvedBaselineErrorBudgetPercent": 0.05
      },
      "expectedPhaseOutcomes": {
        "baseline": { "verdict": "PASS", "maxErrorPercent": 0.05 },
        "overload": { "verdict": "PASS", "expectedSheddingObserved": true, "unexpectedFaultPercent": 0.0 },
        "recovery": { "verdict": "PASS", "restabilizedLatencyP95Ms": 72, "finalErrorPercent": 0.0, "recoveredWithinSec": 18 }
      },
      "finalVerdict": "PASS"
    },
    {
      "fixtureId": "FIXTURE-PERF-FAULT-001",
      "description": "Cascading failure during overload triggering continuous tripwire abort",
      "parameters": {
        "baselineRps": 50,
        "overloadRps": 150,
        "maxArrivalRateRps": 250,
        "maxInFlightRequests": 100,
        "maxPayloadBytes": 1048576,
        "tripwireThresholds": { "maxUnexpectedErrorRatePercent": 5.0, "windowSec": 10 }
      },
      "expectedPhaseOutcomes": {
        "baseline": { "verdict": "PASS" },
        "overload": { "verdict": "ABORTED_BY_TRIPWIRE", "reason": "Unexpected 500 errors exceeded 5.0% threshold" }
      },
      "finalVerdict": "FAIL"
    },
    {
      "fixtureId": "FIXTURE-PERF-FAULT-002",
      "description": "Service fails to recover post-overload (lingering saturation / connection exhaustion)",
      "parameters": {
        "baselineRps": 50,
        "overloadRps": 150,
        "maxArrivalRateRps": 250,
        "maxInFlightRequests": 100,
        "maxPayloadBytes": 1048576,
        "recoveryWindowSec": 30,
        "approvedRecoveryLatencyP95Ms": 85
      },
      "expectedPhaseOutcomes": {
        "baseline": { "verdict": "PASS" },
        "overload": { "verdict": "PASS", "expectedSheddingObserved": true },
        "recovery": { "verdict": "FAIL", "reason": "Latency remained at 450ms and 503 errors persisted after 30s window" }
      },
      "finalVerdict": "FAIL"
    },
    {
      "fixtureId": "FIXTURE-PERF-FAULT-003",
      "description": "Rate-only admission: wrapper enforces arrival rate, duration and memory but no in-flight or payload ceiling",
      "parameters": {
        "baselineRps": 50,
        "overloadRps": 150,
        "maxArrivalRateRps": 250,
        "maxInFlightRequests": null,
        "maxPayloadBytes": null,
        "abortSignalSupported": true
      },
      "expectedPhaseOutcomes": {
        "readinessGate": {
          "verdict": "BLOCKED",
          "reason": "Missing required execution safety controls: In-Flight Bound, Payload Bound. An arrival-rate ceiling is not a concurrency or payload bound."
        },
        "execution": { "verdict": "NOT_RUN" }
      },
      "finalVerdict": "BLOCKED"
    }
  ]
}
```
