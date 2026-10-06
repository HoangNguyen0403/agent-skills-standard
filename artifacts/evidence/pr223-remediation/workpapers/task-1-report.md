# Task 1 Regression Phase Report

**Status: IMPLEMENTED_PENDING_VERIFICATION**

Implementation is complete within Task 1 ownership. No tests, builds, lint, formatting, or CLI checks were run by me, per the execution boundary; parent owns integrated verification and smoke.

## Changed files

- `scripts/evals/task-runner.ts`
- `scripts/evals/task-types.ts`
- `scripts/evals/task-index.ts`
- `scripts/evals/task-runner.test.ts`
- `benchmarks/tasks/pilot.json`
- `benchmarks/tasks/verifiers/verify-authorization.js`
- `benchmarks/tasks/verifiers/verify-pagination.js`
- `guidance/authorization.minimal.md`
- `guidance/authorization.current.md`
- `guidance/authorization.candidate.md`
- `.agents/sdd/pr223-remediation/task-1-report.md`

## Test Intent Records

| Contract | Distinct fault | Layer / cases | Focused command |
| --- | --- | --- | --- |
| A worker that writes `process.exit(0)` cannot produce a successful run without completed verifier evidence. | Candidate code exits the trusted verifier process before assertions; the outer run incorrectly trusts exit zero. | Real worker and trusted verifier child process; candidate writes early-exit implementation. | `rtk node --import tsx --test --test-name-pattern='does not count a candidate' scripts/evals/task-runner.test.ts` |
| A normal leader exit cannot leave a non-detached ignored-stdio helper alive after runner resolution. | `close` resolves and cancels cleanup while an owned helper survives. | Real POSIX child-process tree; helper is explicitly `unref()`ed so the leader can exit normally. Checks helper state at resolution; 6-second self-exit backstop and `finally` cleanup identity-check the recorded PID. | `rtk node --import tsx --test --test-name-pattern='does not resolve normally' scripts/evals/task-runner.test.ts` |
| Valid `__proto__` task IDs remain own keys in suite aggregation and `results.json`. | Ordinary object assignment routes the task key to the prototype setter, dropping per-task output. | Real three-arm `runTaskSuite`; checks returned and JSON-persisted task summary plus run count. | `rtk node --import tsx --test --test-name-pattern='preserves valid __proto__' scripts/evals/task-runner.test.ts` |
| Creation semantics reject caller-supplied tenant spoofing consistently across treatments. | Guidance permits a different spoof response than the shared contract. | Alignment is reviewed across guidance scenarios; no wording/regex test is used. | Source scenario review only; no behavioral command. |
| Foreign-ID create collision is rejected without overwriting foreign state. | Verifier accepts a service that blindly overwrites a foreign tenant's existing ID. | Nested named subtest runs a secure baseline and a separate collision-vulnerable implementation through the actual verifier/API; asserts outward run outcomes. | `rtk node --import tsx --test --test-name-pattern='authorization foreign-ID collision rejected' scripts/evals/task-runner.test.ts` |
| Restricted viewer listing omits restricted documents. | Verifier accepts a service that exposes same-tenant restricted records to viewers. | Nested named subtest runs a separate viewer-listing-vulnerable implementation through the actual verifier/API; asserts outward run outcomes. | `rtk node --import tsx --test --test-name-pattern='authorization viewer listing omits restricted documents' scripts/evals/task-runner.test.ts` |
| Editors and admins can list the complete own-tenant set, including restricted documents. | Oracle accepts an implementation that hides restricted documents from every role. | Test-local all-role filtering implementation runs through the trusted verifier; it must be an evaluated failure with failed-check evidence. | `rtk pnpm dlx node@20 --import tsx --test --test-name-pattern='authorization behavior regressions' scripts/evals/task-runner.test.ts` |
| Rejected foreign-ID creation preserves the entire foreign document. | Oracle accepts mutation of an unchecked field before the create collision is rejected. | Test-local implementation changes `existing.restricted` before throwing; it runs through the public service API and trusted verifier, which must report an evaluated failure with evidence. | `rtk pnpm dlx node@20 --import tsx --test --test-name-pattern='authorization behavior regressions' scripts/evals/task-runner.test.ts` |
| A verifier cannot pass without a complete, unique-ID receipt whose counts and exit status agree. | A zero exit code without usable evidence, duplicate IDs, missing evidence fields, or mismatched counts appears successful. | Synthetic trusted verifier exercises missing, malformed, duplicate, incomplete, and mismatched-count receipts; the outer run must report infrastructure failure. | `rtk node --import tsx --test --test-name-pattern='rejects missing, malformed' scripts/evals/task-runner.test.ts` |
| Positive fractional pages normalize to page 1 and return the first page. | Oracle accepts a finite-only page predicate that preserves positive fractions. | A real worker writes the correct pagination implementation with only `Number.isInteger(options.page)` mutated to `Number.isFinite(options.page)` while preserving `options.page > 0`; the trusted verifier must produce a completed failed receipt and product failure. | `rtk pnpm dlx node@20 --import tsx --test --test-name-pattern='rejects a finite-only positive pagination page predicate' scripts/evals/task-runner.test.ts` |


## Implementation handoff

- Verifiers now write a structured completion receipt containing a completed status, unique check IDs, explicit pass/fail outcomes, nonempty evidence, and counts. The runner validates the receipt independently of process exit status; missing, malformed, duplicate, incomplete, count-mismatched, and exit-status-inconsistent receipts are infrastructure failures. Valid failed checks remain evaluated failures with their evidence retained.
- The receipt is passed to the verifier through `TASK_EVAL_VERIFICATION_RESULT_PATH` and persisted in run evidence. The pilot manifest does not contain a static verifier hash: manifest loading hashes the current verifier script dynamically, so no stale hash needed refreshing.
- Normal POSIX process close now terminates and observes any remaining members of the owned process group before resolving. Cleanup escalates from TERM to KILL with bounded waits and fails closed if quiescence cannot be established. Windows remains outside this process-group behavior.
- `byTask` uses a null-prototype record so `__proto__` is preserved as an ordinary task ID. The CLI notice and pilot description state that completion receipts are not an OS sandbox against hostile same-UID code.
- All three authorization treatments require spoofed tenant IDs to be ignored/overridden, foreign-ID collisions to preserve the original document, viewers to omit restricted records, and editors/admins to receive the complete own-tenant set including restricted records. Authorization oracle regressions include a secure baseline, original collision/listing mutations, all-role restricted-list filtering, and mutation-before-rejection.
- Replaced `Promise.withResolvers` in the bounded process runner with standard Promise construction; Node 20.20.2 lacks `Promise.withResolvers`, and the supported runtime floor was not raised. Both `settled` and `cleanupError` lifecycle locals are declared before the settlement/cleanup closures.
- Parent owns GREEN verification and CLI smoke; no implementation checks were run by me.

## Parent evidence and current handoff

- Parent observed the Phase B RED selector `rtk pnpm dlx node@20 --import tsx --test --test-name-pattern='authorization behavior regressions' scripts/evals/task-runner.test.ts`: exit 1 in 1.28 seconds. The secure baseline and prior collision/viewer-listing cases passed; both new mutants were accepted by the verifier (exit 0 where the tests expected 1). This established T1-R1 and T1-R2. The RED selector was not rerun.
- Parent previously observed the combined Node 20 evaluation lane at 108/108 passing in 9.32 seconds, before these two new oracle mutants were added. The four-mode deterministic Node 20.20.2 CLI smoke passed (12 attempts, 8.79 seconds); focused F2/F3/F4 passed 3/3 in 0.52 seconds; the supplemental nine-case receipt/exit-status smoke passed in 1.82 seconds. These are parent-reported, not run by me, and do not verify the current Phase B changes.
- The affected strict-compiler closure passed after `fs.readdir(currentDir, { encoding: "utf8" })` selected the string-name overload without casts or runtime traversal/hash changes. Node 20 compatibility uses ordinary Promise construction; `Promise.withResolvers` is not available in Node 20.20.2. No compiler or runtime check was run after the current verifier/guidance edits.
- Phase B changed only the authorization verifier, all three authorization guidance arms, and this report. The verifier now requires the exact seeded tenant-1 ID set for both editors and admins, while preserving viewer omission and prior isolation assertions. It snapshots the foreign document through the public API before collision and deep-compares the entire document after rejection, including `id` and `restricted`.
- Current status: `IMPLEMENTED_PENDING_VERIFICATION`; parent owns the authorization GREEN selector, actual CLI smoke, and combined Node 20 eval lane. No tests, build, lint, format, or checks were run by me.

## Parent RED diagnosis and concerns

- Parent reported the authorization baseline's `listDocuments` fixture omitted `return results`, invalidating its RED. Restored the outward list result.
- Secure baseline and the original collision/viewer-listing regressions remain named nested cases. The authorization parent test now covers those plus separate all-role restricted-list filtering and mutation-before-rejection implementations; each invokes the real worker and trusted verifier.
- No source wording, regex, or verifier-output-label assertions remain. Spoof-policy alignment is source-scenario review; the contract is not tested by pinning text.
- The process-lifetime scenario is POSIX-only; Windows behavior remains covered by the documented limitation.
- MCP compliance audit loaded `common/common-best-practices`, `common/common-tdd`, `nextjs/nextjs-testing`, and `typescript/typescript-language`. The router also reported generic `.ts` Angular/NestJS/React coverage gaps; this test file is Node integration code, not those frameworks.

## H1 Pagination Oracle Follow-Up

- Parent observed RED with `rtk pnpm dlx node@20 --import tsx --test --test-name-pattern='rejects a finite-only positive pagination page predicate' scripts/evals/task-runner.test.ts`: exit 1 in 1.04 seconds, 0 passed / 1 failed / 25 skipped. The finite-only mutant completed verification with verifier exit 0 where the regression expected exit 1. This confirmed H1; the RED selector was not rerun.
- Phase B adds `page: 1.5` with 12 items and `pageSize: 10` to the existing normalization check. The trusted verifier asserts metadata normalizes to page 1 and data equals the first ten items. Existing zero, negative, and NaN assertions remain; the check inventory and completion-receipt protocol are unchanged. The intentionally faulty starting fixture was not modified.
- The passing pagination implementation is shared with the retained baseline. The new test mutates only `Number.isInteger(options.page)` to `Number.isFinite(options.page)`, preserving the `options.page > 0` condition, then requires a completed receipt with failed-check evidence, verifier exit 1, no infrastructure error, and product failure.
- No checks were run by me after this change. Current status remains `IMPLEMENTED_PENDING_VERIFICATION`; parent owns GREEN verification and actual CLI smoke. Existing parent-reported Node 20 lane and strict-compiler evidence above predate this H1 correction and are not represented as post-correction verification.
