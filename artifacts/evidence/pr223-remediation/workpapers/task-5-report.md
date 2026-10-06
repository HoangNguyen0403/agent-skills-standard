# Task 5 Report — Risk-sized implementation and verification

**Status:** `IMPLEMENTED_PENDING_VERIFICATION`

## Changed files
- `.agents/workflows/implement-feature.md` — conditions formal artifacts on governed delivery and hands off risk tier, criteria, and evidence location. 51 lines.
- `.agents/workflows/verify-work.md` — carries low-risk brief/evidence through verification; retains governed trace/walkthrough and verification gates.
- `skills/common/common-workflow-writing/evals/evals.json` — extends the eval to exercise end-to-end implementation, verification, scope-drift routing, and governed controls.

No generated copies, shared metadata/docs, host/user policies, or unrelated evals were changed.

## End-to-end source scenario traces

### Low-risk in-chat maintenance
**Scenario:** A routine API code/test-only defect has an approved in-chat brief stating expected behavior, decisions, and verification. It is not sensitive or governed. Verification finds unrelated behavior outside the brief.

1. `implement-feature` step 1 accepts the brief and does not require new BRD/PRD/SRS, task-list, REQ/AC IDs, or document updates; step 3 retains TDD and focused verification.
2. Steps 4–5 record outcomes in chat/task report and hand off the risk tier, criteria, and evidence location to `verify-work`.
3. `verify-work` steps 1–3 load the brief, run applicable test lanes, and retain before-failure/after-success proof for the defect. Missing applicable browser/mobile drivers still block their lanes; visual changes still retain the driver preflight and evidence requirements.
4. Step 4 judges against the approved criteria. Step 5 routes unrelated behavior drift to the owner instead of silently changing scope; verification resumes against the resolved contract.
5. Step 6 records checks/results/evidence in chat or task report. No new PRD/SRS, task-list, requirement-ID, trace, or walkthrough artifact is mandatory. Handoff carries that evidence location.

**Outcome:** The former unconditional verifier trace/walkthrough request is explicitly scoped to governed delivery; low-risk verification still proves the approved behavior and preserves applicable evidence lanes. Source trace only; no live agent behavior measured.

### High-risk governed/sensitive change
**Scenario:** A governed authorization change on a payment flow crosses a trust boundary.

1. `implement-feature` step 1 requires PRD/SRS trace, task-list slices, stable requirement/acceptance IDs, and decision trace; sensitive work retains at least medium risk tier, high when required. High-risk work adds architecture/security review and requires human approval and independent review.
2. Implementation retains TDD and focused verification. Its handoff carries risk tier, criteria, and governed evidence location.
3. `verify-work` preserves the inherited floor and all applicable test/driver, comparative, and evidence lanes. PASS requires approved criteria and required approval/independent-review gates.
4. Governed evidence updates BRD-to-PRD-to-SRS/FRS trace and the SRS walkthrough. Governed behavior drift requires PRD/SRS updates before PASS.

**Outcome:** The low-risk exception does not weaken governed/sensitive trace, updates, risk floors, TDD, verification, approval, independent review, or walkthrough obligations. Source trace only; no live agent behavior measured.

## Verification and limits
- Parent owns the final audit and smoke after this expanded change. No audit, tests, builds, linters, formatters, or paid model evaluations were run in this continuation.
- Earlier `rtk pnpm audit:sdlc` passed for the prior Task 5 state; it is not evidence for these later edits.
- `artifacts/security-review.md` NV3 and `.agents/sdd/pr223-remediation/task-4-5-independent-review.md` R5-1 document the original contradictions.
- The eval is an unexecuted model scenario, not a source wording test or measured behavior result.

## WCP-R1 — Worker/orchestrator dispatch boundary

**Reason:** Review R5-1 found that the conditional delegation clause in `implement-feature` step 5 contradicted the single-worker contract in `common-subagent-driven-development`: disjoint ownership and a complete task packet do not authorize an implementation worker to spawn another worker or reviewer.

**Fix:** Workers now return risk tier, approved criteria, evidence location, and blockers to the orchestrator without spawning. The orchestrator alone dispatches `verify-work` or independent review to a disjoint owner with a complete brief. The `verify-work` receiver, low-risk criteria/evidence path, and governed/sensitive controls remain unchanged.

**Handoff status:** Canonical source correction is ready for parent source tracing, actual projection-generator verification, and independent review. No generated wrappers were edited; no checks, tests, or model runs were performed.

## Permanent code-review feedback eval handoff

**Owned path:** `skills/common/common-code-review/evals/evals.json`

- **ID 14 — H1 pagination oracle boundary:** finite positive fraction (`1.5`) versus the positive-integer contract; only `0`, `-10`, and `NaN` were covered. Expected finding identifies the finite-only false acceptance, requires normalized metadata plus first-page data and a real-worker oracle regression, and labels the counterexample as unexecuted.
- **ID 15 — H2 composite provenance:** accepted partial selected-leaf map falls back to top-level v4 in composition and baseline reuse. Expected finding preserves unknown provenance, refuses unsafe composition before output creation, prevents unresolved evidence from being reused, and preserves physical map-free fallback.
- **ID 16 — WCP-R1 dispatch authority:** conditional worker delegation conflicts with the repository's no-recursive-worker contract. Expected finding reserves dispatch to the orchestrator and returns risk, criteria, evidence location, and blockers from workers without spawning.

All previous eval IDs/assertions and the existing pressure/rationalization sections were retained. These are task-grounded definitions, not source-wording tests or live eval results. No other evals, canonical skill guidance, generated files, or shared metadata were changed. No tests, builds, lint, format, or paid model evaluation were run; the parent owns later preflight/projection and review.

