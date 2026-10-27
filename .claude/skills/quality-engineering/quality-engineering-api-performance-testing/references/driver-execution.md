# Tool-Neutral Driver Execution, Readiness Gates, and Evidence Records

## 1. Complete C2 API Scenario Record

Performance evaluation scenarios must adhere to Shared Contract C2. All fields must be explicitly populated or marked with justified `N/A`:

```json
{
  "_comment": "[ILLUSTRATIVE SYNTHETIC FIXTURE CONTRACT ONLY — NOT UNIVERSAL ORACLES]",
  "scenarioId": "PERF-ORDER-001",
  "requirementId": "REQ-04",
  "acceptanceCriteria": ["AC-11", "AC-12"],
  "operation": "CreateSyntheticOrder",
  "purpose": ["load", "stress"],
  "lane": "api",
  "method": "POST",
  "path": "/api/v1/orders",
  "principal": {
    "role": "authenticated-consumer",
    "tenantId": "synthetic-tenant-perf-01",
    "authHeader": "Bearer synthetic-test-token"
  },
  "inputs": {
    "contentType": "application/json",
    "bodySchema": "fixtures/schemas/synthetic-order.json",
    "seedData": "fixtures/data/perf-orders.json"
  },
  "fixturesAndReset": {
    "setupFixture": "scripts/fixtures/seed-perf-catalog.ts",
    "teardownReset": "scripts/fixtures/purge-perf-tenant.ts",
    "preExecutionState": "catalog-populated-cart-empty",
    "postExecutionReset": "purge-all-created-orders"
  },
  "dependencyMode": "stubbed-payment-virtual-inventory",
  "expectedStatus": {
    "baseline": [201],
    "overloadExpectedShedding": [429, 503],
    "recovery": [201]
  },
  "expectedHeaders": {
    "overloadShedding": { "Retry-After": "^[0-9]+$" }
  },
  "expectedBody": {
    "baseline": { "status": "CONFIRMED", "orderId": "uuid-v4" },
    "overloadShedding": { "error": "RATE_LIMIT_EXCEEDED" }
  },
  "observableState": "persisted-orders-match-successful-responses",
  "forbiddenEffects": [
    "duplicate-order-records-on-retry",
    "unhandled-500-internal-server-error",
    "orphaned-database-connection-leak"
  ],
  "executionCommand": "tsx scripts/perf/run-scenario.ts --config perf-order-001.json",
  "environment": "isolated-synthetic-perf-runner",
  "resourceLimits": {
    "maxDurationSec": 300,
    "maxArrivalRateRps": 250,
    "maxInFlightRequests": 100,
    "maxPayloadBytes": 1048576,
    "abortSignalSupported": true
  },
  "evidence": null,
  "disposition": "PLANNED"
}
```

## 2. Execution Readiness Gates and Missing Controls

Driver presence in `package.json` or system PATH alone **does not** constitute authorization or capability to execute live performance tests.

Before executing any active load or stress commands, the harness must pass the following readiness verification:

```text
Execution Readiness Checklist:
[ ] Target Authorization: Explicit written approval to stress target environment (C4).
[ ] Synthetic Isolation: Target is dedicated synthetic sandbox; no production/shared data.
[ ] Duration Bound: Finite total run time and peak-overload duration configured (C4).
[ ] Arrival-Rate Bound: Finite `maxArrivalRateRps` (req/s) configured.
[ ] In-Flight Bound: Finite `maxInFlightRequests` (or `maxConcurrency`) enforced per generator
    (VU pool / connection pool / worker count), so stalled responses cannot accumulate unbounded
    outstanding requests or sockets. An arrival-rate cap MUST NOT be accepted as this bound.
[ ] Payload Bound: Finite `maxPayloadBytes` per request plus a total-bytes ceiling configured.
[ ] Continuous Tripwires: Active runner samples approved error-burst, socket-drop, and resource
    thresholds in real time (not end-of-run summaries) and evaluates them continuously.
[ ] Tripwire-to-Abort Wiring: A tripwire breach triggers immediate cancellation or stop-drain of
    in-flight load. A monitor that records a breach without aborting does not satisfy this item.
[ ] Cancellation Capability: Programmatic abort signal reachable while requests are in flight.
[ ] Phase Separation: Runner records warmup, baseline, overload, and recovery independently.
[ ] Recovery Observation: Runner monitors post-overload window after load drops to baseline.

GATE OUTCOME:
- All checks PASS -> Proceed to execute scenario with approved driver.
- Any check FAILS or MISSING -> Mark execution as BLOCKED naming every absent item:
  "BLOCKED: Missing required execution safety/recovery controls: <missing-item>[, ...]."
  A configured arrival rate satisfies only the Arrival-Rate Bound; without a distinct finite
  in-flight bound and payload bound, execution stays BLOCKED regardless of rate/duration settings.
  Likewise, a callable abort with no live tripwire monitor, or a monitor whose breach is not wired
  to cancellation, leaves Continuous Tripwires / Tripwire-to-Abort Wiring missing and blocks execution.
  Do not download runners or execute unmonitored scripts.
```

## 3. Tool Adapters: Partial Non-Executable Sketches

The following snippets illustrate driver syntax. They are **partial sketches** because raw driver scripts lack continuous tripwire aborts, phase separation, and post-load recovery observation. Execution remains `BLOCKED` until wrapped in a project harness that supplies those controls.

### A. k6 Adapter Sketch

```javascript
// [NON-EXECUTABLE PARTIAL SKETCH — ILLUSTRATIVE ADAPTER SYNTAX ONLY]
// Note: k6 thresholds below are end-of-run summaries. A complete harness must inject
// continuous tripwire cancellation and separate phase metrics.
// Note: maxVUs is a generator pool ceiling, not a universal in-flight cap. Each selected
// harness must map maxInFlightRequests/maxConcurrency and maxPayloadBytes explicitly;
// the arrival-rate stages alone bound rate, never outstanding requests.
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    baseline_and_overload: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { duration: '30s', target: 50 },  // Baseline ramp
        { duration: '1m', target: 50 },   // Baseline steady-state
        { duration: '30s', target: 150 }, // Overload peak
        { duration: '30s', target: 50 }   // Return to baseline
      ],
    },
  },
  // Note: Standard k6 thresholds evaluate across the whole run and fail healthy shedding
  // unless partitioned into custom metrics per phase.
};

export default function () {
  const res = http.get('http://127.0.0.1:8080/api/v1/products');
  check(res, { 'status is valid': (r) => r.status === 200 || r.status === 429 });
}
```

### B. Autocannon Adapter Sketch

```typescript
// [NON-EXECUTABLE PARTIAL SKETCH — ILLUSTRATIVE ADAPTER SYNTAX ONLY]
// Note: Autocannon runs fixed concurrency for a duration. It does not provide stepped ramp,
// tripwire aborts, or post-stress recovery observations without external orchestration.
// Note: `connections` is a closed-model in-flight ceiling, not an arrival-rate cap. Payload
// size and total emitted bytes must be bounded separately (maxPayloadBytes).
import autocannon from 'autocannon';

async function runAutocannonSketch() {
  const instance = autocannon({
    url: 'http://127.0.0.1:8080/api/v1/orders',
    connections: 50,
    duration: 60,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ syntheticOrder: true })
  });

  // Tripwire monitoring would require intercepting instance.on('response', ...)
  const result = await instance;
  return result;
}
```

## 4. Complete C3 Evidence Records

Performance evidence must conform to Shared Contract C3. Below are two examples: an unexecuted run (BLOCKED) and an executed run (synthetic fixture).

### A. BLOCKED / NOT RUN Evidence Record (Missing Driver / Controls)

```json
{
  "_comment": "[CANONICAL C3 BLOCKED RECORD — NO OBSERVED METRICS]",
  "evidenceRecord": {
    "sourceRevision": "92d06c420f6a41f08e11579423e4e3eacdb7880d",
    "command": "NOT RUN (Execution blocked by missing prerequisites)",
    "environment": {
      "host": "local-worktree",
      "os": "darwin-arm64",
      "driver": "NONE_DETECTED"
    },
    "scenarioId": "PERF-ORDER-001",
    "acMapping": ["AC-11", "AC-12"],
    "observedResult": {
      "verdict": "BLOCKED",
      "reason": "Missing installed performance runner (k6/autocannon) and missing target environment authorization",
      "phaseMetrics": null
    },
    "artifactLocation": null,
    "limits": {
      "maxDurationSec": 300,
      "maxArrivalRateRps": 250,
      "maxInFlightRequests": 100,
      "maxPayloadBytes": 1048576
    },
    "reviewer": "W8-reviewer",
    "evidenceKind": "fixture"
  }
}
```

### B. Illustrative Executed Evidence Record (Synthetic Fixture Run)

```json
{
  "_comment": "[ILLUSTRATIVE SYNTHETIC FIXTURE CONTRACT ONLY — NOT ACTUAL EXECUTION]",
  "evidenceRecord": {
    "sourceRevision": "92d06c420f6a41f08e11579423e4e3eacdb7880d",
    "command": "rtk tsx scripts/perf/run-scenario.ts --config perf-order-001.json",
    "environment": {
      "host": "synthetic-test-container",
      "os": "linux-arm64",
      "driver": "synthetic-harness-v1"
    },
    "scenarioId": "PERF-ORDER-001",
    "acMapping": ["AC-11", "AC-12"],
    "observedResult": {
      "verdict": "PASS",
      "phaseMetrics": {
        "warmup": { "durationSec": 30, "excludedFromSlo": true },
        "baseline": {
          "durationSec": 60,
          "achievedRps": 50.1,
          "successLatencyMs": { "p50": 38.2, "p95": 68.4, "p99": 112.1 },
          "errorLatencyMs": { "p50": null, "p95": null, "p99": null },
          "errorRatePercent": 0.0
        },
        "overload": {
          "durationSec": 60,
          "achievedRps": 148.9,
          "expectedSheddingRatePercent": 14.2,
          "unexpectedFaultRatePercent": 0.0,
          "successLatencyMs": { "p50": 52.4, "p95": 94.6, "p99": 185.0 },
          "errorLatencyMs": { "p50": 12.1, "p95": 15.4, "p99": 22.0 }
        },
        "recovery": {
          "observationWindowSec": 30,
          "recoveredWithinSec": 16.5,
          "finalRps": 50.0,
          "finalSuccessLatencyMs": { "p50": 39.0, "p95": 69.1, "p99": 114.2 },
          "finalErrorRatePercent": 0.0,
          "resourcesReleased": true
        }
      }
    },
    "artifactLocation": "reports/perf/PERF-ORDER-001-fixture-run.json",
    "limits": {
      "maxDurationSec": 300,
      "maxArrivalRateRps": 250,
      "maxInFlightRequests": 100,
      "maxPayloadBytes": 1048576
    },
    "reviewer": "W8-reviewer",
    "evidenceKind": "fixture"
  }
}
```
