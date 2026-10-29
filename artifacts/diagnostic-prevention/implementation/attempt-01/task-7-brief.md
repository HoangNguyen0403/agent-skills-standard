### Task 7: Bounded eval quota and readiness (H02/H04 reachable source)

**Files:** `scripts/evals/execute.ts`, `scripts/evals/evals-v2.test.ts` or focused new execute test, `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs`, `consumer-smoke.mjs` and their existing tests.
**Inputs:** injected eval runner, existing child ownership/teardown, loopback fixture. **Outputs:** no fresh dispatch after observed quota within one run, preserved in-flight successes; retrievable readiness errors and immutable fresh output.
- [ ] On quota observation stop all lanes claiming new jobs; await already-owned in-flight promises, preserve their successes; no completedAt until all required answers. No cross-profile fallback or remote writer/cancel claim.
- [ ] Fixture readiness handles bind error/close-before-listen and bounded deadline; listeners attached before listen. Cleanup only own server/child, preserve teardown failures. Existing timeout without cancellation must not be reported completed.
- [ ] Consumer smoke refuses existing output before launching or deleting fixture state; use fresh attempts and exclusive final publication, retain failure result when possible without overwriting previous seal. Preserve real asserted completion, no exit0-only PASS.
- [ ] Tests use deferred synthetic runner and owned loopback/child fixtures, never real model calls or original journals. Ensure no orphan children/listeners in test errors.
**Verification owner:** parent `rtk proxy node --import tsx --test scripts/evals/evals-v2.test.ts` and `rtk proxy node --test scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs`. **Report:** task-7-report.md FINAL. **Correction route:** host ladder.

