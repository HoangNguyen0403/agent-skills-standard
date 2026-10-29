# Task 7 — independent spec and quality review, round 5

## FINAL verdict

**APPROVE — scoped Task 7 repository implementation and reviewed consumer behavior.** R3-1 and R3-2 are closed in the latest frozen source. The intervening late-bind guard regression is corrected without deleting its test or increasing its deadline. No remaining Blocker/Major finding identified in this review.

This does not approve root generation/adoption, host-supervisor rollout, paid model evaluation, Node 20 runtime qualification or human acceptance. Task 6 remains separately APPROVED; no Task 6 source re-review performed.

## Scope and provenance

Reviewed `task-7-review-round-5.diff`, current consumer/fixture source ranges, postclaim lookup and late lifecycle regression assertions, previous Task 7 review findings, and the published reports at both actual paths:
- `artifacts/diagnostic-prevention/implementation/attempt-01/A/task-7-route3-report.md`
- `artifacts/diagnostic-prevention/implementation/attempt-01/A/A/task-7-route3-report.md`

Both reports preserved unchanged. Latest packet is cumulative from base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`; this is a frozen workspace review boundary, not a claim of clean committed/build identity. Inspected `full-consumer-smoke-run-01.json` using read-only structured projections. Worker historical probes are not counted as acceptance evidence.

No source edits, test/check/build/probe execution, delegation, profile change, retry loop or premium call. Only this report written. Semi-trusted local worker artifacts reviewed against source; parent observations accepted as supplied execution evidence, not relabeled as reviewer-run commands. No round-4 verdict is fabricated: the supplied capacity failure produced no review verdict.

Rules: previously loaded AGENTS.md, code-review/caveman-review, repository review policy and security standards; refreshed MCP TypeScript/JavaScript, best-practices, test-quality and common-code-review rules. Current MCP audit lists common/common-best-practices, common/common-code-review, common/common-tdd, javascript/javascript-language, nextjs/nextjs-testing, typescript/typescript-language. The mounted audit session restarted since earlier reviews; its current list is not represented as the earlier full-session audit. Framework side matches do not imply a Next.js surface.

## Finding dispositions

| Finding | Disposition | Evidence / rationale |
| --- | --- | --- |
| R3-1 exceptional postacquisition lookup orphans claim | **CLOSED** | Postcreation lstat/recheck is inside try/catch; an exceptional lookup calls ownership-safe release before rethrowing original error, appending release failure if needed. Successful acquisition alone transfers the release closure to `runWithOwnedClaim`. |
| R3-2 closed state remains true after late failed close | **CLOSED** | Late readiness sets current mutable outcome to not closed; failed close stores its error and reports lateFailures/sink while retaining guards; successful terminal close updates that same exposed object to closed with null error. |
| Intervening close-before-late-readiness guard regression | **CLOSED** | Failed-phase close handler now preserves guards when `lateReadinessObserved` is false; only closure after late readiness releases them. Existing deadline/late-bind test retained and now checks actual current cleanup state. |
| R2-1 full ordinary attempt lifetime | **CLOSED**, including R3-1 acquisition remainder | `runWithOwnedClaim` encloses task validation, execution and receipt preparation/publication; attempt-internal exits are returns, main exits only after release settles. |
| R2-2 cooperating seal race | **CLOSED** | Lstat recheck remains under claim; conflicting seal preserved, own claim released, launch refused. |
| R2-3 discarded late-close failure | **CLOSED** | Resolved closeErr is inspected; failed late cleanup stays observable and guarded. |
| R2-4 unbounded initial failed-start cleanup | **CLOSED** | Finite cleanup budget reports incomplete state rather than asserting cancellation/completion; failure guards retained. |

### R3-1 source and behavioral proof

`preflightExclusiveOutput` now covers both returned conflicts and exceptional postclaim lookup. The regression invokes the actual wrapper with a narrow injected failing lstat boundary, asserts original error identity, no task launch, no leftover claim, then successfully reacquires/releases the same output claim. This catches the formerly escaping acquisition exception rather than mocking a completed RunRecord. The existing byte-matching release guard and foreign-claim preservation case remain intact; no unrelated claim is newly deleted.

The ownership comparison is a cooperative local-run safeguard, not cryptographic authentication or a hostile-filesystem atomic compare-and-unlink guarantee. Nothing in Task 7's accepted scope claims that stronger protection.

### R3-2 lifecycle and guard proof

In `registry-fixture.mjs`, failed-start cleanup remains an initial resolve-once promise exposing a live mutable lifecycle object. A later bind changes `closed` to false before its close attempt. A failed late close retains the actual error, appends late failure evidence and does not remove the protective error/close handlers. A subsequent real terminal close updates the same object to `closed: true`, `error: null` and releases the operation handlers.

The corrected late-close regression asserts a real listening owned server, non-null address, `closed: false`, retained late-close error, safe handling of an owned late error, then uses the real close in finally and verifies the final closed state. This is not merely a sink-message assertion.

The intervening bug came from treating the initial prelisten close event as terminal for a bind still scheduled to arrive. `lateReadinessObserved` now distinguishes that event from terminal closure after late readiness. The deadline test retains its 20 ms readiness bound and 40 ms delayed owned bind, waits for actual handle teardown and checks the shared current outcome. No test removal or timeout inflation used to obtain green. Retained guards while an incomplete or late bind remains possible are intentional operation ownership, not incidental total-listener-count failures.

## Spec and quality assessment

- Quota code/test remain unchanged from the prior reviewed correction. Shared quota observation stops fresh claims across lanes, allSettled waits for owned work, exact in-flight answer bytes persist, usage/count metadata is saved, and incomplete answers do not receive a new completedAt. `missingAnswerCount` exists in the same module. The injected runner is the real supported string/object promise boundary.
- Deferred construction uses `new Promise`, not Node-newer `Promise.withResolvers`. This establishes source compatibility of that primitive; it does not establish that a Node 20 runtime was actually exercised.
- Consumer preflight preserves existing output files/directories/dangling links; exclusive claim precedes launch; postclaim recheck closes the cooperating-run race. Receipt creation and normal exceptions cannot bypass wrapper release through attempt-internal process.exit.
- Release errors are surfaced and foreign claim bytes remain untouched. A failure to release is failure, not silent success. No new unowned-claim cleanup path introduced.
- Seal publication and failure sidecars remain wx-exclusive. Failure branches say blocked, retain the actual error and remove the success next-workflow; the previous ordinary rewrite of a published seal remains removed. Early diagnostic sidecars are not asserted to be canonical product RunRecords.
- Tests exercise real wrapper filesystem effects, real canary nonlaunch, owned loopback bind errors and late server lifecycle. Synthetic runner answers are isolated scheduler fixtures, not fabricated end-to-end consumer evidence.
- Initial cleanup timeout reports not closed and retains ownership guards; no timeout/cancellation equivalence or host process-control claim added. The optional cleanup sink is expected not to throw, as noted nonblocking in round 3; current production consumer passes no such sink. No new blocking consumer path identified from that unchanged limitation.

## Execution and consumer evidence

Parent supplied current results:
- Consumer regression suite: **18 PASS / 812.90275 ms**.
- Full `scripts/evals` suite: **322 PASS**, including the two quota-stop cases.
- Actual full built-product consumer command: **PASS / 7.48 s**; persisted canonical 14-field receipt validated by existing collector; fixture/children teardown clean.

The preceding revision's **18 cases / 17 PASS / 1 FAIL / approximately 2870 ms** remains genuine failed-stage evidence. The old 17 PASS result is not reused as proof for the current revision. No unchanged failure was rerun by this reviewer. Original test-first RED remains whatever was actually observed historically; no manufactured RED claim.

Directly inspected `full-consumer-smoke-run-01.json`:
- `schema_version: 1`, `feature_status: verified`.
- 13 completed evidence entries; empty `missing_evidence` and `decision_needed`.
- Real sync/verification, installed resources, SDK stdio MCP, negative configuration and Antigravity workflow entries present.
- Primary, negative and Antigravity MCP teardown entries each report `closed: true`.
- Artifact walkthrough reports `transitions_passed: true` and `outcomes_validated: true`; route commands contain real installed validator argv, expected/actual envelopes and passed assertions.
- `runrecord_validation.passed: true`.

The inspected receipt contains actual canonical-body matching, precise missing-skill/workflow-gap assertions, byte-identical Antigravity workflow checks and fixture route results; this is more than exit-zero-only success. Parent reports nine route walkthroughs and postpublication persisted-record validation. Walkthroughs explicitly retain `FIXTURE_ONLY`/`PENDING_H2` model-semantics limitations; their PASS must not be promoted into model efficacy or live decision quality. The receipt's uat-signoff recommendation does not itself provide human sign-off.

Task 6 remains closed separately. Parent's actual MCP producer SDK smoke is reported PASS with 10 assertions and clean exit/telemetry record. No false callback-overwrite explanation is adopted: the earlier parent premise was withdrawn, SDK 1.32 chains the callbacks, and the helper correction concerned lexical scope. This review makes no new Task 6 source finding.

## Boundaries and outcome

Task 7 source/spec and quality gates APPROVED for the reviewed frozen packet with the supplied parent checks and inspected consumer artifact. No outstanding blocking correction requested. Root Task 1 adoption/generation remains a distinct in-progress safety/approval gate; this report neither authorizes nor claims actual root generation. External host dispatcher/supervisor, authenticated runtime identity, model efficacy, Node 20 runtime execution and human acceptance remain outside the proof given here.

All prior reports/receipts preserved. Session compliance audited. Exact reviewer cost unavailable because host usage/rates were not supplied, not zero. FINAL denotes this report is complete; only this report changed.
