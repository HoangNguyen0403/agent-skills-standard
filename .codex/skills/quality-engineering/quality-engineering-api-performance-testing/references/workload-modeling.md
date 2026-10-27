# Workload Modeling, Phase Separation, and SLO Specifications

## 1. Concurrency vs Arrival-Rate Models

Selecting the appropriate load generation model is critical to obtaining valid latency percentiles and preventing coordinated omission:

| Model | Generator Mechanism | Primary Applicability | Coordinated Omission Risk |
| --- | --- | --- | --- |
| **Open Model (Arrival Rate)** | New requests arrive at schedule $\lambda$ (req/sec) regardless of system latency. | Public APIs, microservice mesh, uncoordinated web/mobile clients. | If target stalls, runner must track un-emitted requests or abort; prevents artificial throttling. |
| **Closed Model (Virtual Users)** | Fixed pool of $N$ workers dispatches request, waits for response, then loops. | Internal batch processes, queue consumers, coordinated synchronous workers. | **High**: As server latency degrades, generation rate slows, masking queueing delay and tail latency. |

**Selection Rule**: Use Open Model (constant arrival rate) for uncoordinated external traffic. Use Closed Model only when client concurrency is physically constrained by a fixed worker pool.

**Pairing Rule**: An arrival rate bounds admissions per second only. Declare a separate finite `maxInFlightRequests` (or `maxConcurrency`) alongside the rate; if the target stalls, an unbounded or rate-derived generator pipeline accumulates pending requests and sockets before cancellation can act.

## 2. Request Mix Specification

Request distributions must reflect approved operational profiles or production telemetry. Endpoints, methods, weights, and payload distributions are parameterized per scenario.

The following structure illustrates a synthetic fixture definition:

```json
{
  "_comment": "[ILLUSTRATIVE SYNTHETIC FIXTURE CONTRACT ONLY — NOT UNIVERSAL ORACLES]",
  "fixtureId": "FIXTURE-PERF-MODEL-001",
  "concurrencyModel": "open",
  "targetArrivalRate": 150,
  "rateUnit": "req/s",
  "maxInFlightRequests": 100,
  "maxPayloadBytes": 1048576,
  "requestMix": [
    {
      "name": "browse-catalog",
      "method": "GET",
      "path": "/api/v1/products",
      "weightPercent": 65,
      "payload": null
    },
    {
      "name": "view-product-detail",
      "method": "GET",
      "path": "/api/v1/products/{id}",
      "weightPercent": 25,
      "payload": null
    },
    {
      "name": "create-order",
      "method": "POST",
      "path": "/api/v1/orders",
      "weightPercent": 10,
      "payload": "synthetic-order-payload-schema"
    }
  ]
}
```

## 3. Phase Separation and Metric Boundaries

Performance evaluations must partition execution into distinct temporal phases. Aggregating whole-run metrics across phases is prohibited.

1. **Warmup Phase**:
   - Parameterized duration to prime JIT compilers, connection pools, and caches.
   - **Exclusion Rule**: Warmup measurements MUST be excluded from baseline, overload, and recovery compliance checks.
2. **Steady-State Baseline Phase**:
   - Evaluates system under approved representative load.
   - Evaluated against approved baseline SLOs (throughput, success latency, error latency, baseline error budget).
3. **Overload Phase**:
   - Evaluates system under traffic exceeding rated capacity up to authorized stress cap.
   - Evaluated against degradation criteria: acceptable shedding (429/503) vs unexpected system faults (500s/crashes).
4. **Post-Overload Recovery Phase**:
   - Evaluates system in a dedicated post-drop window with traffic returned to baseline or zero.
   - Evaluated against approved recovery SLOs (latency return, error rate restabilization, resource release).

## 4. Latency Percentiles: Success and Error Separation

Evaluating arithmetic averages alone is strictly prohibited. Furthermore, latency observations must be separated by response status:

- **Percentile Requirements**: Record $p50$, $p95$, and $p99$ percentiles.
- **Success Latency**: Latency of responses meeting expected success status (e.g. 2xx).
- **Error Latency**: Latency of responses resulting in errors (e.g. 4xx, 5xx) or timeouts.
  - *Rationale*: Systems often fail fast (immediate connection drop) or fail slow (prolonged gateway timeout). Success-only views obscure catastrophic tail latency on error paths.

## 5. Policy for Missing or Unapproved SLO Thresholds

When planning or evaluating load tests, adhere strictly to the following resolution sequence:

1. **Parameter Source Requirement**: All numeric operational targets (latency percentiles, throughput targets, error budgets, tripwire ceilings, and recovery windows) must be sourced from approved PRD, SLA, or system design documentation.
2. **Approval Gate**: If an expected metric or threshold is missing or unapproved:
   - **Do NOT invent default numbers** (e.g. do not assume a 200ms latency target, a 0.1% error budget, or a 30s recovery window).
   - **Record Disposition**: Mark execution as `BLOCKED: Missing approved SLO threshold for <metric>`.
   - **Continue Offline Planning**: Authoring scenario contracts, request mixes, and test fixtures proceeds safely offline; missing approvals block active execution and compliance assertion only.
