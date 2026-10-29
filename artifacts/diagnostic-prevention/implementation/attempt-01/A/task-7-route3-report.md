# Task 7 Route 3 Correction Report

**Status:** FINAL — source correction complete; parent verification pending  
**Route:** Personal · Delivery (Route 3), authorized Personal AGS workspace  
**Scope:** R3-1 and R3-2 from `task-7-review-round-3.md` only

## Changes

- `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs`: enclosed the post-claim lstat/recheck path in ownership cleanup. An exceptional lookup releases only the byte-matching claim, preserves the original error, and appends a cleanup failure if release cannot complete. Added a narrow injected lstat seam for the regression; the normal call continues to use `fs.lstatSync`.
- `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs`: late readiness now marks cleanup state open while the owned handle is being closed, retains close failure in the exposed cleanup result, and marks it closed only after close completion or an observed terminal `close` event. Late failed-close error/listening guards remain attached until terminal closure.
- `scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs`: added post-acquisition lookup-failure coverage for original error identity, no task launch, claim removal, and successful subsequent claim acquisition; strengthened late-bind coverage to observe a live server and truthful cleanup failure state, then close the real handle and assert terminal state.

No edits to the quota implementation/test or other Task 7 components.

## Acceptance and evidence

- R3-1: source correction and behavioral regression authored; **NOT RUN**.
- R3-2: source correction and behavioral regression authored; **NOT RUN**.
- Focused tests, probes, syntax checks, builds, lint, formatters, and full product consumer smoke: **NOT RUN** per parent instruction. Parent owns the settled verification gates.
- This report makes no claim of test pass, product consumer pass, host-supervisor integration, or rollout acceptance.

## Remaining risks / handoff

- If claim release itself fails, the original post-acquisition error remains primary and the release failure is appended; an owned claim may remain for safe manual diagnosis.
- The cleanup object is a live mutable lifecycle result. A later actual close event updates the same object returned through `error.cleanup`.
- Full installed-product consumer smoke remains parent-owned and pending the final CLI build. External host supervisor/process control remains outside this source scope.
