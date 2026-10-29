# Task 7 — Route 2 corrective pass (Personal · DeepSeek)

**Status:** FROZEN / PARTIAL (corrections written; parent gates NOT RUN)
**Execution mode:** bounded worker, sole Task 7 writer, no delegation, no commits
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`
**Branch:** `feat/diagnostic-prevention-improvements`
**Prior attempt:** Task 7 round-1 correction (reported in `task-7-report.md` §5) — final/stopped
**Task 6 MCP files:** untouched (not in this write set)

This report is append-only evidence for the corrective round. It does not modify `task-7-report.md`, any earlier review package, or `.agent` evidence.

---

## 1. Owned changed files (this pass)

| File | Change |
| --- | --- |
| `scripts/evals/evals-v2.test.ts` | Fixed the malformed block in the multi-lane quota test: `try { … await cleanup(); }` had no handler, producing the parent-observed `Expected finally but found }` transform error. Replaced with `try { … } finally { await cleanup(); }`. Test body (real `executeMissingAnswers`, `createDeferred` built from `new Promise` for Node 20, in-flight assertion) unchanged. |
| `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs` | Replaced the `settled` boolean + `detachGuards` teardown with a `phase` state machine (`starting` → `ready` / `failed`), a shared `closeOwnedServer()` that awaits `server.close(cb)` and returns the close error, and a failed-start path that (a) awaits teardown before rejecting, (b) preserves a teardown failure in the rejection message, (c) keeps the `error`/`listening` guards attached after rejection so a bind that completes *after* the deadline is closed instead of leaking a live handle. Late readiness after the deadline closes the owned server and then releases the guards. |
| `scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs` | Replaced the four incidental `listenerCount(...) === 0` assertions (environment-sensitive; see §4) with observable handle/lifecycle assertions: `server.listening`, `server.address()`. Added `waitUntil()` bounded poll helper. Tests now cover: bounded-deadline rejection **plus a bind that arrives after the deadline**, a **real `EADDRINUSE`** bind error (two loopback servers, previously a synthetic `emit('error')`), close-before-listen, and ready→serving→close handle release. All fixtures are closed in `finally`. |

Not modified in this pass: `scripts/evals/execute.ts`, `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs`, Task 6 MCP sources, metadata, mirrors, indices, dependencies, config, generated artifacts.

## 2. Parent-observed failures addressed

1. `node --import tsx --test --test-name-pattern=quota scripts/evals/evals-v2.test.ts` → `TRANSFORM ERROR … Expected finally but found }` at the multi-lane quota test; no quota test executed. Cause: `try` without `catch`/`finally`. Fixed (§1 row 1).
2. `node --test scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs` → 11 tests, 7 PASS, 4 FAIL; all four new readiness tests asserted `listenerCount(...) === 0` and observed `1`. Cause: this host's `http.Server` registers an internal `listening` listener (`setupConnectionsTracking`); exact listener counts are an incidental runtime detail, not a contract. Assertions deleted and replaced with handle-state assertions (§1 row 3), not re-pinned to `=== 1`.

## 3. Verification attempted by this worker

### Observed PASS (bounded, non-suite)

- `node --check scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs` and `…/registry-fixture.mjs` → `SYNTAX_OK`.
- TypeScript parse of `scripts/evals/evals-v2.test.ts` via `ts.createSourceFile(..., ScriptKind.TS)` → `PARSE_OK` (no transform/parse diagnostics). This is a parse check, not a typecheck or test run.
- Fixture lifecycle smoke against the real module (`/tmp/fixture-probe.mjs`):
  - ready: `listening: true`, `port === address().port`; after `close()`: `listening: false`, `address: null`.
  - bounded deadline (`timeoutMs: 20`, bind at 40 ms): rejected `Registry fixture listen timed out after 20ms`; after rejection `listening: false`, `address: null`; 120 ms later the late bind had been requested (`late: true`) and the server was **not** listening (`listening: false`, `address: null`).
  - real bind error: rejected `EADDRINUSE listen EADDRINUSE: address already in use 127.0.0.1:…`; `listening: false`, `address: null`.
  - close-before-listen: rejected `Registry fixture server closed before listening`; `listening: false`, `address: null`.
- Scheduler smoke of the multi-lane quota test body against real `executeMissingAnswers` (`/tmp/quota-probe.mts`, same synthetic runner/deferred as the test): `errorIsQuota: true`, `callsStarted: 2`, `freshAnswerCount: 1`, `completedAt: null`, saved `eval-1/with-skill` bytes `lane 2 in-flight success`. Job order `eval-1:eval, trigger-1:trigger, trigger-2:trigger` confirms job 1 is `baseline` and job 2 is `with-skill`, so the test's asserted answer path is reachable. This proves the new test's assertions are satisfiable; it is not evidence that the test file passes under `node --test`.
- A prior `esbuild` transform attempt failed with `Cannot find module 'esbuild'` (root deps are symlinked); no file effect, no substitute verification claimed.

### Blocked by parent scope control / NOT RUN

- `rtk proxy node --import tsx --test --test-name-pattern=quota scripts/evals/evals-v2.test.ts` — tool call blocked by parent scope control (not a human denial; round-2 review confirmed the same for the earlier reporting). **NOT RUN** by this worker.
- `rtk proxy node --test scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs` — tool call blocked by parent scope control (not a human denial). **NOT RUN** by this worker.
- Full `evals-v2.test.ts`, full consumer smoke (`consumer-smoke.mjs` on built CLI/MCP), any build/lint/formatter/typecheck gate: **NOT RUN** by this worker (mid-flight test/build deferral plus scope control). No passing-suite claim is made.

## 4. Evidence for deleting the listener-count assertions

Local probe (`/tmp/probe2.mjs`) on this host: `http.createServer()` + one `once('listening')` listener reports `listenerCount('listening') === 2` before the event and `1` after removing the fixture's own listener, because Node registers an internal `setupConnectionsTracking` `listening` listener. The count therefore differs by runtime version, and `=== 0` can never hold on this host regardless of fixture correctness. Replaced by `server.listening` / `server.address()` assertions, which are the actual owned-handle contract.

## 5. Residual findings / risks for parent (not fixed — frozen)

1. **Orphaned claim lock on early failure (T7-4 residual):** `consumer-smoke.mjs` writes `${outPath}.claim` (~line 349) *before* the outer `try/finally` that unlinks it (~line 1473). An early throw after the claim but before that `try` — e.g. `Built CLI entry is not a file`, `Built MCP entry is not a file`, `Candidate root is not a directory` — exits through `main().catch(...)` and leaves the claim file behind, blocking later runs at the same target. Source observation only; no runtime reproduction attempted.
2. **Retained post-failure guards:** after a failed start the fixture intentionally keeps `error`/`listening` guards on the rejected server (see §1). This is deliberate late-bind protection, not a live handle: the smoke confirms `listening: false` / `address: null`. If the reviewer requires zero retained listeners instead, the late-bind guarantee must be replaced by another cancellation mechanism — a design decision for the parent.
3. Parent gates in §3 remain the acceptance evidence; this pass does not assert Task 7 acceptance.

## 6. Temporary files created by this worker (not removed)

All under `/tmp`; creation evidence is the successful `cat > <file> <<'EOF'` heredoc command and its execution output in this session transcript.

| Path | Created for | Removal status |
| --- | --- | --- |
| `/tmp/probe.mjs` | listener-lifecycle probe reproducing the failed-start teardown ordering | still present (removal blocked by parent scope control) |
| `/tmp/probe2.mjs` | `once('listening')`/`setupConnectionsTracking` listener-count probe | still present (removal blocked by parent scope control) |
| `/tmp/fixture-probe.mjs` | fixture lifecycle smoke (ready / deadline+late bind / real EADDRINUSE / close-before-listen) | still present (removal blocked by parent scope control) |
| `/tmp/quota-probe.mts` | scheduler smoke of the multi-lane quota test body | still present (removal blocked by parent scope control) |

No file in the repository was created or deleted outside the three owned source paths and this report.

## 7. State

Files frozen. No further source edits until the parent issues concrete findings. Route-2 corrections are source-complete for the two observed failures; acceptance is **pending parent implementation and review**, and the repository test gates are **NOT RUN** by this worker.

---

# Round 2 corrective pass (R2-1 … R2-4) — FINAL, frozen

**Review input:** `task-7-review-round-2.md` (CHANGES REQUESTED; Task 6 separately approved, untouched here).
**Parent ground truth accepted:** focused quota `2 PASS / 407 ms`; focused consumer suite `11 PASS / 536 ms` on the previous frozen source. Neither is full acceptance and neither is re-run by this worker.
**Attribution correction (supersedes §3 and §6 wording):** the earlier "denied by user" phrasing was wrong. The test/cleanup tool calls were blocked by parent scope control, not by a human denial. The two prior sections were corrected in place for the same reason.
**Execution this round:** none. No tests, probes, `node --check`, formatter, build, shell reads or cleanup were run, per the explicit instruction. Everything below is source-level and must be treated as unverified until the parent runs the gates.

## R2 change set (Task 7 paths only)

### `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs`

- **R2-1 — claim lifetime:**
  - New `preflightExclusiveOutput(outPath)`: early `lstat` refusal → exclusive `wx` claim → post-acquisition leaf re-check; returns `{ claimPath, claimRecord, release() }` and releases its own claim before rethrowing a conflict.
  - New `runWithOwnedClaim(outPath, task)`: acquires the claim, runs the whole attempt inside `try`, releases in the unconditional post-`catch` path, and throws a `Failed to release the exclusive output claim …` error when release is incomplete. A release failure is appended to the original task error message instead of masking it.
  - New `releaseOwnedClaim(claimPath, claimRecord)`: confirms byte-identical ownership before unlinking, never deletes a foreign claim, and returns — never swallows — read/unlink failures.
  - `main()` now: validate args → `runWithOwnedClaim` → `process.exit(code)`. All previous `process.exit(0/1)` calls inside the attempt were replaced by `return 0` / `return 1`, so no `process.exit` bypasses claim release.
  - The former `finally { if (existsSync(claimPath)) unlinkSync }` inside publication was removed; the claim is owned solely by `main`'s outer lifetime.
  - Post-acquisition exceptions are routed through `retainBlockedFailure()`, which writes a `feature_status: 'blocked'`, `recommended_next_workflow: null` sidecar at `${outPath}.failure-<ts>.json` with `wx`, never touching the requested output or any prior seal, and logs (does not swallow) retention failure.
- **R2-2 — seal check inside the claim:** the output leaf is re-checked with `lstat` semantics after exclusive acquisition and before any fixture/consumer launch. A newly existing file/directory/symlink is a conflict: preserve it, release only the owned claim, do not launch. `beforeClaim` is a narrow ordering seam used only by the competing-run regression.

### `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs`

- **R2-3 — late close failure is observable:** `closeOwnedServer()` still resolves the close error value, but the late-listening branch now inspects it. A failing late close is recorded in the operation-owned `cleanupOutcome.lateFailures`, forwarded to the new `options.onCleanupFailure` sink, and the `error`/`listening` guards are **retained**; guards are released only after an actual successful close.
- **R2-4 — bounded teardown:** the readiness deadline no longer transitions into an unbounded close wait. Failed-start teardown runs under `cleanupTimeoutMs` (default 1000). Outcomes are distinguished as cleanup completed (`closed: true`) versus cleanup incomplete (`closed: false` + error); an incomplete teardown rejects with `…; teardown incomplete after Nms`, and a failing close rejects with `…; teardown failure: …`, preserving the original readiness cause.
- **Cleanup contract:** every failed-start rejection carries `error.cleanup`, a promise resolving to `{ closed, error, lateFailures }`, so the caller can observe teardown completion instead of inferring it from the message.

### `scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs`

- New `waitUntil()` bounded poll helper (observable state, not timing guesses).
- New cases: entrypoint claim release + blocked receipt + no canary launch + preserved prior seal (R2-1); post-acquisition seal race refusal with byte-identical seal and released claim (R2-2); `runWithOwnedClaim` release on a receipt-preparation-class throw; release failure surfaced for a removed claim and a foreign claim left untouched; late-listen close failure reported with retained error guard and exactly two close attempts (R2-3); non-completing close producing a finite `teardown incomplete` outcome with retained ownership (R2-4).

## Corrections to earlier report claims

- §3 "Observed PASS" items stand as previously observed worker smoke results on the earlier source revision; they are **not** evidence for this round's revision.
- §5 residual finding 1 (orphaned claim on early failure) is addressed by R2-1; residual finding 2 (retained post-failure guards) is now the documented, tested contract for late-close failure and incomplete teardown.

## Verification status for this round

- Commands run: **none** (tests / probes / syntax checks / formatters / shell all withheld by instruction).
- Therefore: revision-bound syntax, typecheck, focused quota, focused consumer suite, full consumer smoke and the built-CLI/MCP end-to-end run are all **NOT RUN** and must be executed by the parent. No claim of green is made for R2-1…R2-4.
- Files remain frozen; further edits require concrete parent findings.

