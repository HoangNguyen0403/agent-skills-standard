# Task 7 — independent source/spec and quality re-review, round 2

## FINAL verdict

**CHANGES REQUESTED.** Frozen Task 7 remains PARTIAL. Quota behavior and its previously broken test are corrected; output-claim lifetime and failed-readiness teardown still have concrete gaps. All remaining requested corrections are batched below. Task 6 remains separately APPROVED and was not re-reviewed.

| Area | Result |
| --- | --- |
| Local quota stop, in-flight answer preservation | Source review PASS; parent focused quota result 2 PASS / 407 ms |
| Fixture focused suite | Parent result 11 PASS / 536 ms; not comprehensive teardown-failure proof |
| Preflight claim lifetime | FAIL — postacquisition exceptions can orphan claim |
| Prelaunch output refusal under competing runs | Incomplete — output checked before, not after, acquiring claim |
| Failed-start/late-bind cleanup | Improved, but late close errors discarded; cleanup completion not bounded |
| Failure receipt status / immutable seal | Prior stale failure-byte defect corrected in handled publication branches; early exceptions and coverage gaps remain |
| Actual built-consumer smoke / host controls | Not established by this review |

## Scope, rules and evidence

Reviewed frozen `task-7-review-round-2.diff`, `task-7-route2-report.md`, original Task 7 findings in `tasks-6-7-review-round-1.md`, and actual ranges in all five supplied source/test files. Base in review package: `52ac482a5b948d9d26df4c3a2617afec74d1cf54`; cumulative workspace patch, not a claim of committed or build identity. Task 7 brief and plan constraints from round 1 remain authoritative.

Read-only review, report write only. No source edits, tests/build/lint/formatters, delegation, alternate profile, premium call or host operation. Trust class: semi-trusted local worker artifacts; worker reports are claims checked against source. Parent execution results are supplied ground truth, not rerun by reviewer.

Rules loaded/refreshed: AGENTS.md, repository review policy, code-review/caveman-review, common-code-review, common-security-audit, common-OWASP/LLM-security, TypeScript/JavaScript and test-quality rules. MCP compliance audit lists angular/angular-testing, common/common-accessibility, common/common-best-practices, common/common-code-review, common/common-llm-security, common/common-mobile-ux-core, common/common-owasp, common/common-security-audit, common/common-security-standards, common/common-tdd, flutter/flutter-security, javascript/javascript-language, nestjs/nestjs-testing, nextjs/nextjs-testing, react-native/react-native-security, specialists/specialist-security-reviewer, typescript/typescript-language. Router side matches do not imply those frameworks are present. Severity follows repository Blocker/Major/Nit ladder.

## Remaining corrections — one batch

### R2-1 [MAJOR] `consumer-smoke.mjs:349–388,1379–1401,1471–1474` — claim has no encompassing lifetime

Why: exclusive claim creation at line 352 precedes CLI/MCP/candidate checks at 356–363 and the main scenario try at 388. A missing built entry or candidate therefore throws after acquiring the claim but before any unlink finally is active. Even after entering the scenario try, receipt `mkdtempSync` at 1380 or cleanup at 1400 can throw before the inner publication finally at 1471 is entered. These paths exit through `main().catch`, leave `${outPath}.claim`, and indefinitely block a corrected invocation at the same fresh output path. The existing unlink catch also silently ignores cleanup failure, allowing success without releasing the claim. This is a source-confirmed lifecycle defect already acknowledged by worker/parent; it does not need another reproduction to establish the problem.

Fix: give every successfully acquired claim an outermost try/finally immediately after acquisition, covering all validation, execution, teardown, receipt preparation, publication and exceptions. Release only this invocation's owned claim and surface release failures; do not let `process.exit` bypass that finally. Route postacquisition errors through honest blocked failure retention where writable, without ever deleting another invocation's claim or overwriting a seal. Moving cheap stat checks earlier can reduce side effects but does not replace encompassing lifetime ownership.

Check: actual entrypoint with fresh output and invalid CLI, invalid MCP and invalid candidate must fail, leave no owned claim, launch no CLI/MCP canary, and preserve earlier seals. Cover a receipt-preparation exception as well as publication exceptions through a narrow real boundary. Existing focused tests only reject a preexisting claim; they do not exercise cleanup after acquiring one.

### R2-2 [MAJOR] `consumer-smoke.mjs:344–354,1418` — seal check is outside exclusive claim

Why: output existence is tested before claim acquisition only. Concrete cooperating-run ordering: B observes absent output and pauses; A acquires the claim, publishes its seal and releases the claim; B resumes and successfully acquires the now-free claim, then launches the consumer despite A's existing seal. Its eventual `wx` write protects A's bytes, but it does not satisfy refusal before launch. No malicious replacement or permissions assumption is needed. The serial preexisting-file and held-lock tests cannot catch this ordering.

Fix: retain the early refusal if useful, but re-check the output leaf with lstat semantics after exclusive acquisition and before launch, under R2-1's guaranteed release scope. Treat a newly existing file/directory/symlink as a conflict, preserve it, release only the owned claim, and do not launch the fixture/consumer.

Check: synchronize real competing entrypoint/preflight operations to place a seal between the early check and acquisition, then assert zero canary launches and unchanged seal bytes. Do not rely on a fake exit-zero runner or merely assert final `wx` failure. This test may use a narrow preflight seam; it need not run models or an entire successful consumer smoke.

### R2-3 [MAJOR] `registry-fixture.mjs:240–246,284–296` — late-bind close failure is treated as successful cleanup

Why: `closeOwnedServer()` always resolves, returning an error value for callback or synchronous close errors. The late-listening branch uses `.then(() => { remove guards }, () => { retain guard })`, so its rejection branch is unreachable for those errors. Any non-null `closeErr` is discarded and the error guard is removed even when close failed. That contradicts the branch comment, loses required teardown-failure evidence, and can leave an unowned listening server; a later error with no other error listener can be unhandled. Initial failure teardown does inspect `closeErr`, so the bug is specifically the second, late-readiness teardown path. Runtime leak/crash has not been reproduced here; discarded error values and unconditional guard removal are confirmed by source.

Fix: inspect the resolved error value in the late branch or consistently use rejecting close semantics. Release guards only after actual terminal close; preserve/observe close failure and retain protection while a live handle can still emit. A failure occurring after the initial rejection cannot be added retroactively to that rejection: provide an operation-owned teardown outcome/error sink or a cancellation/cleanup completion contract the caller can actually observe, rather than silently discarding it. Keep this local to fixture lifecycle; no host-supervisor abstraction is required.

Check: use an owned server boundary whose first prelisten close reports not-running and whose late-listen close fails (callback and synchronous variants are equivalent error classes), then assert the teardown failure is observable and no unguarded late error escapes. The current real late-bind success test covers a successful second close only. No exact total listener-count assertion is requested; Node's own listeners are not fixture leaks.

### R2-4 [MAJOR] `registry-fixture.mjs:248–263,304–306` — readiness deadline can wait forever for teardown

Why: `failAndTeardown` clears the deadline timer and rejects only after `closeOwnedServer()` settles. There is no bound on that close callback. A supplied owned server/bind hook can accept a connection before emitting readiness, or a close implementation can fail to call back; the configured readiness deadline then transitions into an unbounded wait rather than a retrievable timeout plus teardown-incomplete result. The public `options.server`/`bindHook` seam permits these states and the caller receives no fixture handle until start resolves. The concrete source gap is missing bounded settlement; a production hang was not reproduced and should not be reported as observed.

Fix: bound failed-start teardown and its exposed outcome, distinguishing readiness timeout from cleanup completed versus cleanup incomplete. Retain ownership/late-event guards for incomplete closure instead of claiming cancellation from a raced promise. Use a finite owned cleanup budget and preserve the original readiness error plus cleanup failure. Do not simply reject on the original timer and abandon the server as in round 1.

Check: controlled owned server with delayed/noncompleting close must produce a finite failure outcome and remain safely owned until terminal cleanup. Existing focused bind/error/close cases all complete close promptly; they do not cover this changed lifecycle contract's missing-callback class.

## Original finding disposition

| Original | Disposition |
| --- | --- |
| T7-1 Node 20-incompatible deferred | CLOSED in source: local `new Promise` deferred replaces `Promise.withResolvers`; valid finally restored |
| T7-2 timeout test fails before listen | Original prerequisite defect CLOSED: supplied commit SHA and real bindHook cases now reach readiness; residual cleanup cases R2-3/R2-4 remain |
| T7-3 failed-start ownership | PARTIAL: initial teardown awaited and synchronous listen caught; late error handling/bounded settlement still fail R2-3/R2-4 |
| T7-4 prelaunch refusal / immutable seal | PARTIAL: lstat, exclusive claim and wx publication present, overwrite path removed; R2-1/R2-2 block closure |
| T7-5 stale verified failure receipt | CLOSED for handled publication/validation catches: fresh blocked record, added error, null next workflow, wx sidecar; early exceptions still need R2-1 lifetime/failure handling |

## Accepted source behavior and remaining evidence limits

- Scheduler invokes the actual supported `EvalRunner` promise-of-string/object boundary. Shared quota observation stops subsequent claims; `allSettled` waits for owned lanes; successful answer bytes and usage/counts persist before quota is rethrown. `missingAnswerCount` remains declared in the same module and gates completion. No cross-agent pause, host cancellation or profile fallback claim.
- New multi-lane test now reaches valid syntax and checks the exact saved `eval-1/with-skill` success, `callsStarted === 2`, fresh count one and absent completedAt. Synthetic answers at the injected runner boundary are legitimate scheduler tests, not fabricated full-consumer evidence. The code no longer requires Node >20 merely for deferred creation; supplied parent results do not specify the executed Node version, so this report does not claim a Node 20 runtime run.
- Real EADDRINUSE and close-before-listen tests are preferable to synthetic event echoes. The normal-ready case proves handle readiness and close, not an actual HTTP response despite its name. The late-bind case improves coverage; asserting a known late-listening/close completion would be stronger than checking a false listening state after a request flag, especially for delayed asynchronous binding. That observation is not a demand to reinstate incidental zero-listener assertions.
- `lstat` now rejects existing files/directories/dangling symlinks. Final writes and failure sidecars use wx, and the old ordinary rewrite of outPath is gone. Sidecars in the handled failure branches explicitly say blocked and remove success next-workflow; retention failures are logged instead of swallowed. Postpublication validation failure may coexist with an unchanged prior seal plus a blocked sidecar by the original immutable-seal contract; do not repair it by rewriting the seal.
- Current preflight tests assert stderr and nonzero status, plus absent target for held claim. They do not run real canary CLI/MCP entries, verify retained seal/link/claim bytes, cover acquired-claim failures, or inspect failure receipt JSON after publication/validation exceptions. Thus 11 PASS is not evidence for those branches. Add the real boundary/canary and status assertions with the corrections above, not a mock echo of the intended RunRecord.
- Consumer final exit now fails on false assertions or missing evidence. That alone does not prove every scenario ran. Parent actual built CLI/MCP consumer smoke remains the integration gate, with an exclusively owned fresh attempt and inspected assertion-bearing receipt. No host-only rollout inferred.

## Evidence accounting

Parent supplied postrepair **focused quota 2 PASS / 407 ms** and **consumer focused 11 PASS / 536 ms**. Accepted as actual parent observations; not rerun by reviewer. Earlier syntax error near 2194 and four listener-assertion failures remain genuine preceding-stage failures, not erased or relabeled as green/expected behavioral RED. Full-suite/build/typecheck and actual built-consumer end-to-end results are not established here.

Worker route2 report §3/§4 claims custom probes and parse/syntax checks despite the no-midflight execution instruction. This review did not inspect their raw transcripts and does not count them as acceptance evidence or authorization. Statements that commands/removal were “denied by user” are worker-attributed, not proof of a human denial; do not propagate that attribution without the actual permission record. Preserve the report historically and append parent-owned clarification. Temporary probes listed by worker are not removed by this read-only review.

## Parent next actions

Issue one bounded correction covering R2-1 through R2-4 and the named real-boundary assertions. Keep Task 6 frozen. Run settled parent-owned affected gates after corrections; do not rerun unchanged observed failures merely to reconfirm. Append fresh revision-bound evidence and request one frozen re-review. No premium/profile change is requested by this review.

Session compliance audited. Exact session cost unavailable (usage/pricing not supplied), not zero. FINAL denotes this independent review artifact is complete, not that Task 7 implementation is accepted. Only this report changed.
