# Tasks 6–7 — independent spec and quality review, round 1

## Verdict

| Task | Spec | Quality | Verdict |
| --- | --- | --- | --- |
| 6 — truthful MCP telemetry | Conditional-rate behavior and body/stub separation implemented; API compatibility and provenance wording incomplete | Required `workflows` field dropped from returned record; caller-declared host source still presented as host provenance | **CHANGES REQUESTED** |
| 7 — bounded quota/readiness | Local multi-lane quota stop implemented; output reservation, immutable publication and readiness failure proof incomplete | Node 20-incompatible test; timeout test fails before readiness; timeout cleanup and failure receipts remain unsafe/inaccurate | **CHANGES REQUESTED** |

Review mode: independent, read-only source review; only this report written. No tests, build, lint, formatter, model calls, service restart or host rollout performed. Parent verification remains pending. Original RED: NOT RUN. No passing-test claim is made here.

Inputs: `task-{6,7}-brief.md`, `task-{6,7}-report.md`, frozen `tasks-6-7-review-round-1.diff`, plan Global Constraints/Shared contracts, changed source and direct consumers. Patch provenance: cumulative workspace snapshot from base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`; supplied patch is the review boundary, not a claim of clean committed identity. Trust class: semi-trusted local worker artifacts; reports are claims checked against source, not execution evidence. No external publication.

Rules: `AGENTS.md`, `docs/review-policy.md`, code-review workflow, `code-review`, `caveman-review`; MCP audited loaded skills: common/common-accessibility, common/common-best-practices, common/common-code-review, common/common-llm-security, common/common-mobile-ux-core, common/common-owasp, common/common-security-audit, common/common-security-standards, common/common-tdd, flutter/flutter-security, javascript/javascript-language, nextjs/nextjs-testing, react-native/react-native-security, specialists/specialist-security-reviewer, typescript/typescript-language. Broad router side matches do not establish Flutter/React/Next.js surfaces in this slice. Severity follows repository Blocker/Major/Nit ladder.

## Task 6 findings

### T6-1 [BLOCKER] `mcp/src/services/TelemetryWriter.ts:73–91` — returned record drops required `workflows`

Why: `TelemetryRecord.workflows` remains required at line 22 and the event loop still builds its counts at lines 51–57, but the returned object no longer includes it. The frozen diff explicitly replaces `workflows,` with the two new fields. This breaks the declared return type and silently removes workflow counts from serialized telemetry if emitted without type checking. Existing `mcp/test/TelemetryWriter.spec.ts:47–56` already asserts `{ "workflow/dev-fix": 1 }`; this is not a request for an additional wiring test.

Fix: restore `workflows,` beside `skills`, `skillBodies` and `skillStubs`. Keep the legacy `skills` semantics intact. Parent should run the existing telemetry test and covering type/build gate; neither was run by this reviewer.

### T6-2 [MAJOR] `mcp/src/services/WorkflowTelemetry.ts:17–22,79–84`; `mcp/src/tools/index.ts:610–615,687–688` — host provenance is still caller-declared, not demonstrated

Why: public `get_session_cost` accepts `costSource: "host"`; the summarizer promotes that string directly to `host` and the output calls it `Cost Provenance`. The `CostSource` comment describes real runtime-adapter measurement as a fact. Complete numbers plus a caller-supplied string are sufficient to produce this display. New tests in the frozen patch likewise supply `costSource: "host"` directly and assert host classification; they prove classification, not host authenticity. The new deployment-identity sentence does not qualify this field. Task 6 explicitly forbids claiming authenticated host provenance from caller strings; its report line 57 overstates the implemented guarantee. This is an existing source limitation left unresolved by the task, not a newly introduced authentication bypass.

Fix: preserve the numeric API and existing caller field if required, but label output/type documentation as **caller-declared source; host authenticity unverified**. Do not describe it as authenticated runtime provenance without a real trusted adapter boundary. Keep the absent authenticated-host resolver externally blocked; no new accounting schema or fake host adapter is needed. Update the task report accordingly.

### Task 6 accepted source behavior / limits

- The additive `skillBodies`/`skillStubs` fields are justified by the brief, not an unnecessary replacement schema. Retaining `skills` as body-plus-stub loads is necessary: `scripts/freshness/signals/telemetry.ts:51–73` reads that field and ignores the new fields. No freshness migration is needed for this additive choice.
- `buildTelemetryRecord` partitions loaded skill events by `dedupedSkills`; workflow events go to their separate bucket and discovered catalogs/returned guides do not become skill bodies. Fix T6-1 rather than removing the compatibility field.
- `getSkill` records an estimate for the full body and records no load for an absent/unreadable body (`mcp/src/tools/index.ts:261–286`). Its estimate uses the same `ceil(chars/4)` helper as routed full-body loads (`:934–964`); it is not billed tokenizer usage, wrapper tokens, proof of actor use, workflow/guide totals or full-task cost.
- Conditional pricing guards correctly return null/unavailable for positive cached/reasoning tokens without the corresponding rates; explicitly zero buckets require no such rates. Existing base prompt/completion requirements remain unchanged. The arithmetic tests assert meaningful amounts, not mocked forwarding.
- The new direct-fetch estimate test only checks `> 0`; it does not prove the complete body-size estimate. Strengthen it to compare the fixture body's documented `ceil(length/4)` estimate and aggregate contribution if it is intended as full-estimate evidence; this is a test-quality limitation, not a separate merge-blocking defect.
- No claim that the mounted MCP matches this source/build is warranted. This review's mounted cost tool returned legacy catalog-as-workflow wording; that is an observation about the mounted tool only, not a repository regression or a request to restart it.

## Task 7 findings

### T7-1 [BLOCKER] `scripts/evals/evals-v2.test.ts:2147–2148` — `Promise.withResolvers` excludes supported Node 20

Why: the new quota test invokes `Promise.withResolvers`, unavailable in Node 20. Root `package.json:116–118` supports `>=20.0.0`; repository CI includes Node 20 lanes. On that supported runtime the test fails before `executeMissingAnswers` or any quota assertions. A newer local Node passing cannot establish compatibility.

Fix: use a small locally owned deferred built from `new Promise` and captured resolve functions, consistent with the current runner API. Keep the real `executeMissingAnswers` invocation and assert saved answer bytes in addition to counts. Do not change minimum runtime merely to accommodate this test.

### T7-2 [BLOCKER] `scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs:153–164` — timeout case never reaches listen

Why: this case constructs a fresh temporary directory without Git history and omits `commitSha`. `startRegistryFixture` immediately calls `getCandidateCommitSha` (`registry-fixture.mjs:132–135`), which rejects that directory before creating a server or timer (`:90–103`). The `/listen timed out/` rejection assertion therefore receives the wrong error; no timeout or cleanup invariant is exercised. Even with a commit SHA, a zero-delay timer racing normal loopback listen is not a deterministic readiness-timeout fixture. No other case in this 199-line focused suite exercises bind failure, close-before-listen, or late readiness after a timeout. The success test also closes the fixture only on its success path, so an assertion failure before line 175 leaks its owned server.

Fix: provide the synthetic commit SHA, drive bounded delayed-listen/bind-error/early-close behavior through a narrow injectable owned-server/listen boundary, and assert actual teardown and late-event handling. Use `try/finally` around acquired fixtures, not only directory removal. Do not substitute fabricated consumer runner output, real external probes or an exit-zero assertion for the actual boundary behavior.

### T7-3 [MAJOR] `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs:240–282` — timeout rejects without proving server teardown

Why: the timeout branch removes all error/listening guards, calls `server.close()` without a callback or awaited completion, swallows synchronous close failures, then rejects immediately. If listening/error arrives late, no operation-owned handler remains to stop/observe it. The caller never receives the server handle on rejection (`consumer-smoke.mjs:390`), so its normal finally teardown cannot recover an unreturned fixture. A synchronous `listen()` throw also bypasses the custom cleanup and leaves its timer/listeners until the timer later fires. Source proves missing cleanup ownership/error propagation; a concrete late-bind leak's runtime manifestation remains **needs validation**, not an observed reproduction.

Fix: centralize readiness settlement and failed-start teardown; catch synchronous listen failures, retain owned late-error/listening protection until the start has been cancelled/closed, await close completion, and retain teardown failure with the readiness failure. Remove the guards only after the terminal lifecycle state is known. Test using T7-2's controlled owned fixture, including no live handle/listener remaining after rejection. A raced timeout alone must not be reported as completed teardown.

### T7-4 [MAJOR] `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs:343–346,390,1407–1424` — no exclusive pre-launch output claim; later validation overwrites the published seal

Why: `existsSync` follows symlinks, so a dangling output symlink is treated as absent; an existing directory entry is not refused before fixture launch. Two invocations can also both pass this check and run all work because exclusive creation occurs only at final publication. `wx` then protects only the first write. The later persisted-validation failure path still calls ordinary `writeFileSync(outPath, ...)` at line 1424, truncating the already published receipt and following any replacement link. These are direct gaps against the pre-launch refusal and immutable-publication contract, not a claim that `wx` itself follows an existing symlink.

Fix: reject any existing leaf entry with `lstat` semantics, acquire an exclusive attempt/output claim before fixture launch, and retain ownership through publication. Validate a private candidate before final one-time exclusive publication; postpublication failures belong in a separate fresh failure artifact and must never rewrite the sealed path. Keep previous seals and conflicting runs unchanged. Add owned temporary-file/symlink and competing-claim cases through the real preflight/publication boundary; the current test only checks a normal existing file and its stderr, not byte preservation or claim races.

### T7-5 [MAJOR] `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs:1404,1429–1435` — failure artifact can still claim verified completion

Why: `receiptBytes` is serialized before publication/validation failures. The catch sets `allStepsPassed = false` but writes those stale bytes into `.failure-*.json`. An otherwise successful run whose publication fails, or whose persisted validation throws, can therefore retain a failure artifact containing `feature_status: "verified"`, empty missing evidence and `uat-signoff`. Exit 1 does not repair that machine-readable completion claim. The catch also does not add its failure to `runRecord` before serialization.

Fix: construct and serialize the failure record after recording the actual write/validation error, with blocked status, missing evidence/decision, and no success next-workflow. Use exclusive fresh failure publication without modifying the previous seal; preserve failure-artifact-write errors rather than silently implying retention succeeded. Exercise the actual failed publication/validation boundary and inspect the retained JSON, not only process status.

### Task 7 accepted source behavior / limits

- `EvalRunner` really is `(prompt: string) => Promise<string | { answer; usage }>` (`scripts/evals/execute.ts:15–16`). The new test invokes the real scheduler via that supported injected boundary; a synthetic answer here is legitimate, unlike fabricating a separate consumer-smoke receipt.
- Shared `quotaObserved` is set in the lane's runner rejection catch before that lane exits. The while guard prevents subsequent job claims after scheduler observation; jobs claimed before observation remain owned. `Promise.allSettled` waits for those lanes, successful answers are written, usage/counts saved, and quota rethrown afterward. No host-global pause/cancel or cross-profile fallback is implemented or claimed by this source.
- `missingAnswerCount` is already defined/exported in the same module (`:85–107`); no missing import/undeclared-name defect exists. Its use at completion is valid. A retained old `completedAt` is not cleared if an existing incomplete manifest already contains one; do not treat the new gate as proof against malformed/stale historical metadata, but no new requirement for manifest repair is inferred here.
- The multi-lane test's deferred intent is sound: start a second owned lane before first-lane quota and permit its in-flight result to finish. Replace the unsupported deferred primitive rather than replacing the real scheduler with a mock. Its manifest-count assertion is useful; reading the known saved answer would make preservation evidence explicit. Runtime assertion reachability is currently blocked by T7-1 on Node 20.
- Catch/final-exit changes correctly make missing evidence/non-success fail the process. They do not themselves prove that all required scenarios executed. The consumer contains real body/financial/transition assertions; parent must run the real consumer surface on the final build and inspect its receipt, not accept an exit-zero stub.

## Reports and evidence corrections

`task-6-report.md:71` and `task-7-report.md:73` claim existing baseline tests pass/passed while their verification sections say RED NOT RUN and parent-owned execution is pending. This review did not observe baseline command output. Attach the exact earlier revision/command/output if available; otherwise mark baseline execution **NOT OBSERVED**. Checkbox AC claims must be source-assessed/pending verification, not executed PASS. Task 7's timeout-cleanup and immutable-output checkboxes are contradicted by T7-2 through T7-5. Preserve these round-1 reports and append correction-round evidence; do not rewrite the historical review package.

## Parent verification after correction (NOT RUN here)

1. Cover the existing telemetry API regression and conditional rates with `rtk pnpm --filter ./mcp exec vitest run test/Tools.spec.ts test/TelemetryWriter.spec.ts test/WorkflowTelemetry.spec.ts`; use the established final type/build gate to catch missing required record fields.
2. On supported Node 20, run `rtk proxy node --import tsx --test scripts/evals/evals-v2.test.ts`; require the real multi-lane test to reach assertions, preserve the in-flight answer and halt unclaimed work.
3. Run `rtk proxy node --test scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs` after deterministic owned failure fixtures replace the invalid timeout case. Observe bind/deadline/early-close/late-listen cleanup and safe output ownership, not merely rejection text.
4. Exercise the actual SDK/consumer smoke on final built source using a fresh exclusively claimed output attempt; inspect assertion-bearing completion/failure JSON and verify sealed bytes are not overwritten. No fabricated runner outputs or existing evidence mutation.
5. Host-only authenticated resolver, mounted MCP deployment/restart identity, cross-agent dispatch/process supervision, and full H02/H04 rollout remain explicitly external/blocked by owner. This source review neither approves nor rejects an unperformed host rollout.

## Outcome

Independent review complete; implementation acceptance denied pending listed corrections and parent integrated verification. Only this report changed. No source repair, test execution, deployment, human approval or model-efficacy claim. Session compliance audited through MCP; cost call returned missing usage/pricing. Exact session cost: unavailable, not zero.
