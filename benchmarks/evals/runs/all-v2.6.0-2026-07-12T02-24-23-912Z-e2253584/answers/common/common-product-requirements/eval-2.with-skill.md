# App Performance Spec — Discovery Required

“Make the app faster” is not an actionable product requirement. Do not choose a metric or target without a baseline and a user outcome.

Please answer these questions:

1. Which experience is slow? a) App startup b) Primary screen/navigation c) Search/list loading d) Checkout or another named flow.
2. Which platform and population? a) Web b) iOS c) Android d) All; include device/browser, geography, and percentile to measure.
3. What is the business outcome? a) Reduce abandonment b) Increase task completion c) Improve retention d) Reduce support complaints; provide baseline and target.
4. What target is acceptable? a) p50 b) p95 c) Both; state a concrete threshold, such as startup p95 < 2 seconds on the supported baseline device.
5. What release constraints apply? a) No behavior change b) Feature flags and staged rollout c) Temporary degradation accepted in another flow d) Other constraints.

## Provisional requirement structure

Once answered, create a PRD with an objective such as `OBJ-PERF-001`, then stable requirements like `REQ-PERF-001` (measured user journey), `REQ-PERF-002` (performance target), and `REQ-PERF-003` (regression guardrail). Map every `AC-*` criterion to both a requirement and the objective, with owner, priority, status, and verification lane.

Example criterion, only after the target is approved: **Given** a supported device and cold start, **when** an eligible user launches the app, **then** the primary experience is interactive within the approved p95 target. Add edge/error, degraded-network, cache-miss, accessibility, analytics, and rollout criteria. The PRD must also record security/privacy, offline behavior, support readiness, out-of-scope work, and the baseline measurement method. Do not hand this to engineering until those decisions and evidence exist.

