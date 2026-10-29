# Task 7 Route 3 Lifecycle Follow-up

**Status:** Source correction complete; parent verification pending  
**Finding:** Parent reported 17 PASS / 1 FAIL in the 18-case consumer revision. The failing late-bind case waited for the real server to stop listening and timed out. No rerun was performed.

## Correction

- `registry-fixture.mjs`: a `close` event before late readiness no longer removes the readiness/error guards or disowns a still-pending bind. Once late readiness is observed, the fixture remains responsible for the live handle; the close event and close callback update the mutable current cleanup result only when terminal closure is observed.
- `consumer-smoke.test.mjs`: the late-bind deadline regression now retains the rejection cleanup result and asserts it reports terminal closure after the real handle stops listening.

The initial cleanup promise remains resolve-once; later lifecycle transitions update the same current-state object without re-resolving the promise. No timeout was increased and no test was removed.

## Evidence and limitations

- Parent-reported 17 PASS / 1 FAIL is accepted as supplied; failure was not rerun.
- Focused tests, probes, syntax checks, builds, lint, and formatters: **NOT RUN** per instruction.
- Prior post-acquisition lookup-error and late-close-failure regressions remain in the source but were not rerun here.
- Product consumer smoke remains pending parent-owned verification; no host-supervisor or rollout claim is made.
