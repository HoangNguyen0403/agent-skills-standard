# Task 7 — independent source/spec and quality re-review, round 3

## FINAL verdict

**CHANGES REQUESTED — two remaining bounded corrections.** The ordinary early-validation/receipt exceptions, competing-seal ordering, late-close error reporting, and finite failed-start budget are substantially corrected. One acquisition exception still escapes claim ownership, and the exposed cleanup state can still say closed after a late server becomes live and its close fails.

Task 6 stays independently APPROVED and was not re-reviewed. Full installed-product consumer smoke remains pending the actual final CLI build. No host-supervisor or runtime-rollout acceptance is implied.

## Scope and evidence

Inputs: frozen `task-7-review-round-3.diff` (cumulative workspace patch from base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`), appended `task-7-route2-report.md:78–118`, prior Task 7 findings/reports, actual corrected consumer/fixture source, and all supplied test/execute diff sections.

Parent evidence accepted without rerunning:
- Corrected consumer focused suite: **17 PASS / 836.785792 ms**.
- Quota focused cases: **2 PASS / 407 ms**, retained for unchanged quota source/test code from the previous frozen revision.
- Earlier syntax and four listener-assertion failures remain preceding-stage failures; no fabricated historical RED.

No source edits, checks, probes, builds, tests, delegation, alternate profile or premium call. Only this report written. Worker raw probes are not counted. Parent separately reports MCP full suite/build PASS, but SDK helper setup/scoping failed and is being repaired; none of that is treated as Task 6 SDK smoke PASS or Task 7 product smoke PASS.

Review rules: AGENTS.md, repository review-policy severity ladder, code-review/caveman-review, previously loaded common-code-review/security-audit/OWASP/LLM-security, TypeScript/JavaScript and test-quality rules; MCP file rules refreshed for all five scoped files. Compliance audit loaded list: angular/angular-testing, common/common-accessibility, common/common-best-practices, common/common-code-review, common/common-llm-security, common/common-mobile-ux-core, common/common-owasp, common/common-security-audit, common/common-security-standards, common/common-tdd, flutter/flutter-security, javascript/javascript-language, nestjs/nestjs-testing, nextjs/nextjs-testing, react-native/react-native-security, specialists/specialist-security-reviewer, typescript/typescript-language. Router side matches do not establish those framework surfaces here. Trust class: semi-trusted local worker artifacts; parent observations are supplied evidence, source claims independently inspected.

## Remaining findings — one batch

### R3-1 [MAJOR] `consumer-smoke.mjs:366–382` — postacquisition lstat can still orphan the claim

Why: `preflightExclusiveOutput` writes the claim at line 366, then performs its second `fs.lstatSync` at line 370 outside any cleanup catch/finally. `runWithOwnedClaim` cannot release the claim if that call throws because its try/finally begins only after `preflightExclusiveOutput` returns. `throwIfNoEntry: false` suppresses absence, not other filesystem failures (for example EACCES/EIO during the postacquisition lookup). The ordinary conflict branch explicitly releases, but an exceptional lookup does not. This is the same all-postacquisition-exceptions ownership requirement from R2-1, narrowed to acquisition's own second check; not a request to add retry logic. Filesystem-failure runtime reproduction was not run here.

Fix: immediately after successful exclusive creation, wrap the remaining acquisition/check operations in a cleanup-on-error scope. Release only the byte-matching owned claim; append release failure without masking the original lookup error. Transfer ownership to `runWithOwnedClaim` only on successful return. Keep the existing after-acquisition seal recheck.

Check: drive an actual postcreation lookup failure through a narrow filesystem boundary and assert the original error, attempted ownership-safe release, no launch, no seal mutation, and no leftover owned claim when cleanup is possible. Current 17-case suite covers a returned conflicting lstat and task-body throws, not an exception from this acquisition lookup. It should not require invoking full consumer scenarios or models.

### R3-2 [MAJOR] `registry-fixture.mjs:250–255,303–307,329–338`; new late-close test — cleanup result can claim closed while the late server is live

Why: initial prelisten `ERR_SERVER_NOT_RUNNING` settles `cleanupOutcome` with `closed: true`, `error: null` at line 303. A subsequent late listening event starts a new close; if that close fails, `reportLateFailure` only appends an error and invokes the sink. It never changes `cleanupOutcome.closed` or `cleanupOutcome.error`. The returned `error.cleanup` therefore continues exposing `{ closed: true, error: null }` while the late server remains listening after its failed close. The new test itself explicitly asserts `outcome.closed === true` before observing `late close failure`, and never asserts the final closed/error state. The late failure is now observable, which fixes the previously discarded-error defect, but the same operation's completion flag is still misleading. This is source-confirmed state inconsistency; no crash/leak reproduction was executed by this reviewer.

Fix: make the exposed state truthful when late readiness reacquires a live handle: mark not closed while closing, preserve the late close error on failure, and only report closed after terminal close. If the intended object is instead exclusively an initial-close snapshot, name/document that narrower meaning and expose the current operation lifecycle separately; do not call that snapshot the operation's cleanup-completed state. The existing mutable outcome/lateFailures design can be corrected directly without a new resource framework. Retain the error guard on failed/incomplete close.

Check: extend the real owned late-bind failure case to assert the server is still live and its exposed cleanup state is not closed, with the late error retained; use the actual close in finally to release the test handle. Also distinguish a later successful close from the original incomplete snapshot. Merely asserting the sink received the expected message does not prove lifecycle truth.

## R2-1 through R2-4 dispositions

| Finding | Disposition | Evidence |
| --- | --- | --- |
| R2-1 encompassing claim lifetime | PARTIAL — ordinary task paths corrected; acquisition's own postcreation lookup still escapes (R3-1) | `runWithOwnedClaim:381–400`; `main:443–457`; acquisition `:366–377` |
| R2-2 output recheck under claim | CLOSED | `preflightExclusiveOutput:370–375`; ordered cooperating-seal test checks byte preservation and released losing claim |
| R2-3 late close errors discarded | Original error-discard/unguarded-close defect CLOSED; cleanup-state truth remains R3-2 | late branch inspects resolved closeErr, appends lateFailures, calls sink and retains error guard on failure |
| R2-4 unbounded failed-start close | CLOSED for bounded rejection requirement | finite cleanupTimeoutMs budget, rejection with teardown-incomplete detail, `closed: false` outcome on budget exhaustion, guards retained |

## Accepted changes / quality assessment

- `runWithOwnedClaim` now covers all ordinary attempt execution, built-entry checks, receipt preparation/publication and their exceptions after acquisition returns. Attempt-internal exit calls became return values. Only help exits before acquisition; main exits after the owned-claim promise settles. Thus the prior process.exit bypass is removed.
- Release compares claim bytes before unlinking and reports missing/unreadable/foreign claims instead of deleting them silently. This is cooperative invocation ownership, not a cryptographic identity or hostile-filesystem atomicity guarantee. The foreign-claim test exercises the intended conservative behavior.
- The postacquisition seal check implements the real two-run ordering fix rather than just relying on final wx. Existing symlink refusal stays lstat-based; final seal and sidecar writes remain exclusive. No ordinary outPath overwrite reintroduced.
- The early validation entrypoint test uses a real temporary canary CLI and missing MCP. It proves no canary launch, absent new seal, released owned claim, preserved unrelated prior seal bytes and blocked sidecar JSON. This is meaningful ingress evidence, not a fake runner success. It does not prove every CLI/MCP/product scenario.
- The task-body receipt-preparation-class exception test exercises the actual wrapper's outward filesystem cleanup. It does not claim a full product RunRecord passed a collector.
- Handled early failure sidecars explicitly say blocked with missing evidence and null next-workflow; writes use wx and retention errors are logged. These short early-failure diagnostic sidecars are not asserted to be canonical 14-field product RunRecords. Handled publication-failure branches preserve the fuller record and never rewrite an existing seal.
- Late cleanup errors are no longer thrown away by a mistakenly unreachable promise rejection branch. Initial cleanup now has a finite budget; `closed: false` accurately represents cleanup timeout rather than cancellation proof. Guards retained after failure are intentional ownership protection, not failed incidental zero-listener assertions. R3-2 concerns the state after later readiness, not the bounded initial-timeout behavior.
- Scheduler/Node 20 deferred code is unchanged from the reviewed correction: shared quota flag, allSettled and exact saved-answer assertions retained. No re-pinning, mock echo or new unsupported Promise primitive introduced.
- The new cleanup sink is caller code; if it throws, `reportLateFailure` currently lets that propagate from a void promise chain. No production sink is passed by the current consumer. This is a nonblocking boundary limitation, not an observed unhandled rejection or a third blocking finding; document nonthrowing sink expectations or contain sink exceptions when touching this branch.

## Evidence status and next gate

The 17 PASS result supports the added claim/race/release/late-close/budget cases that actually ran. It does not cover R3-1 or final lifecycle state after late close failure. Quota 2 PASS remains valid for unchanged code, not for unrelated fixtures. No full eval suite, Node 20 runtime execution, final CLI installed-consumer smoke, remote cancellation, host global pause or authenticated host identity is inferred.

The appended route2 report corrects human-denial attribution to parent scope control. Its earlier worker probes remain historical worker claims, not acceptance evidence for this frozen revision. Preserve failed-stage and correction-round history; do not overwrite prior reports.

Batch the two fixes above, run only settled affected parent gates, then request a frozen focused re-review. Full built-product smoke remains parent-owned and pending; Task 6's approval is unchanged. No profile or premium escalation requested.

Session compliance audited; exact cost unavailable because usage/pricing were not supplied, not zero. FINAL means this review artifact is complete. Task 7 source acceptance remains CHANGES REQUESTED. Only this report changed.
