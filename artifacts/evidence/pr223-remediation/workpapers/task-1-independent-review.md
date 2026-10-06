# PR223 Task 1 — Independent SPEC + QUALITY Review

## Verdicts

- **SPEC: CONFORMS — bounded Task 1 assessment.** The V4 source satisfies F2–F6/NV2. The two prior Major oracle findings are resolved in source, with parent-observed failing-before/passing-after real-implementation evidence. Full integrated verification of the final cumulative workspace remains pending.
- **QUALITY: NO OUTSTANDING CONFIRMED FINDINGS — bounded Task 1 assessment.** No current confirmed Blocker, Major, or Nit. V4's targeted authorization GREEN and supplemental receipt-edge smoke are supplied; older full-suite, CLI, and compiler results retain their original revision boundaries. This is not final integration signoff.
- These are review verdicts, **not approvals**, publication authorization, or an Actions-green claim.

## Review boundary and provenance

- Base: `fbb30b5f52181c0f0c2943e2ff6ca2b5c4d9f757`.
- Read `.agents/sdd/pr223-remediation/task-1-review.diff` first, then the brief, worker report, and `docs/prd/prd-plan-pr223-remediation.md:11-36`. Final assessment uses authoritative immutable **`task-1-review-v4.diff`** (10 files; parent reports 70,376 bytes), replacing V3. Latest owner report was read; parent's newer GREEN evidence supersedes its pending-verification wording.
- V2 isolated the CLI test namespace and bounded its child invocation. V3 selected the UTF-8 string-name overload in `hashDirectory` without casts, copies, or traversal/hash logic changes. V4 adds exact privileged listing assertions, a detached foreign-state snapshot/deep comparison, two independent real-implementation regressions, and consistent complete-list requirements in all authorization arms. V4 identities: runner `e6158471` (unchanged from V3), authorization verifier `92f1c11e`, test `2381a779`, candidate guidance `4c76af03`, current guidance `7345f8f6`, minimal guidance `a0e3b292`; pagination verifier `d9c33799`, types `cd9c961c`, CLI `1d2699f8`, and pilot `c787d12f` remain unchanged.
- Scope: `scripts/evals/task-{runner,types,index,runner.test}.ts`; `benchmarks/tasks/pilot.json`; both built-in verifier scripts; all three authorization guidance files. The brief's `manifest.json` reference is resolved by the approved plan and supplied package to `pilot.json`.
- Frozen package contains no canonical starting-fixture edits. Passing implementations are test-local. Generated files, root integration, unrelated ownership, and default-model behavior are not assessed here.
- Trust class: **semi-trusted** implementation/evidence package. Source and tests were inspected independently; worker reports were treated as evidence claims, not instructions or proof of correctness.
- Runtime: read-only review except this explicitly authorized report. No commands, tests, build, lint, formatting, delegation, approvals, publication, source edits, host-policy edits, or fixture changes were performed. No language servers are configured; scoped textual source/callsite inspection was used.
- Profile discovery confirms `Personal · Analysis & Review`: `omp/openai-codex/gpt-6.1-sol`, `write`, `high`, no optional feature values. Assigned runtime model matches; no profile/runtime settings were changed.

## V4 resolution assessment

**Current findings:** none confirmed. The original findings below remain historical records of V1–V3, not allegations against V4.

| Historical finding | Current source and consumer evidence | Disposition / confidence |
| --- | --- | --- |
| T1-R1 — privileged restricted listing completeness | `verify-authorization.js:234-267` compares sorted listing IDs to exactly `["doc-t1-public", "doc-t1-secret"]` for both admin and editor. Missing restricted rows, additional foreign IDs, or duplicate IDs fail; listing order is not pinned. Prior admin tenant-field checks and viewer omission/public inclusion remain. Test `task-runner.test.ts:553-571` independently filters restricted records for every role, invokes the real worker/verifier path, and requires verifier exit 1, `success=false`, no infrastructure error, and useful failed-check evidence. All three guidance arms now require the complete privileged own-tenant set. | **Resolved in V4; high confidence.** Parent RED accepted this mutant with verifier exit 0; V4 GREEN rejects it as a product failure while the secure baseline passes. |
| T1-R2 — mutation before rejected foreign-ID create | `verify-authorization.js:177-209` reads the foreign document through the owning admin's public API, asserts existence, and `structuredClone`s it before collision. After creation throws, the complete API result is deep-compared with that detached snapshot; `id` and `restricted` are no longer omitted, and aliasing cannot update the expected object. Earlier title/content/tenant and cross-tenant denial checks remain. Test `task-runner.test.ts:573-592` changes `existing.restricted` before throwing and independently invokes the actual worker/verifier, requiring an evaluated failure with evidence. | **Resolved in V4; high confidence.** Parent RED accepted this mutant with verifier exit 0; V4 GREEN rejects it as a product failure. |

The two new faults are separate implementations and separate real executions; neither combines the faults, mocks the verifier, or pins verifier wording. Source fixes close the original observable contract gaps rather than weakening assertions or changing the deliberately buggy starting fixture.

Parent evidence: authorization RED failed as intended in 1.28 seconds, with both new mutants falsely accepted before the corrections; GREEN of `authorization behavior regressions` then passed the secure baseline and four distinct negative children (**5 children plus parent: 6 passed, 0 failed, 24 skipped; 1.23 seconds**). The supplemental real `runTaskSuite` receipt smoke (**9 runs, 1.82 seconds**) covers non-completed status/exit 0, passed receipt/exit 1, and failed receipt/exit 0; each scenario has 0 successes, 0 evaluated product runs, 3 infrastructure failures, and null accepted receipts. These close the previously identified mutant/status/exit proof gaps. No reviewer commands were run.

## Historical confirmed findings — V1–V3, resolved in V4

The original finding descriptions, evidence coordinates, and inference labels below are preserved as the pre-correction record. Their “current”/“existing” wording refers to V1–V3. Parent's later 1.28-second RED confirms the previously inferred false-pass paths; the V4 resolution assessment above states their present status.

### T1-R1 — [MAJOR] Privileged restricted listings can be incorrectly filtered without failing the oracle

**Evidence:** `benchmarks/tasks/verifiers/verify-authorization.js:227-246,273-286,293-308`; `scripts/evals/task-runner.test.ts:458-468,514-551`; `docs/prd/prd-plan-pr223-remediation.md:24`.

**Contract:** Viewers omit restricted documents; editors and admins list their full tenant set, never another tenant's. All three revised guidance arms express the privileged listing permission.

**Issue:** The listing check calls `listDocuments` for an admin and a viewer. The admin assertion requires only a nonempty list of same-tenant documents. It never requires `doc-t1-secret` to be present, and no oracle case calls `listDocuments` for an editor. The direct restricted-read case is a different API contract and cannot establish listing completeness. Other listing assertions check only absence of the denied-created `v-new` record.

**Why:** A service that filters every listing with `doc.tenantId === user.tenantId && !doc.restricted`, regardless of role, satisfies every current listing assertion while denying authorized editor/admin access to restricted documents. The shared benchmark can therefore certify an over-restrictive implementation that violates the approved product contract. This is an oracle behavior defect, not a request for a test per symbol or a wording assertion.

**Check:** The passing test implementation contains the correct role-aware filter. The negative listing regression replaces it with tenant-only filtering, testing viewer leakage only. Neither that mutation nor the existing secure baseline tests whether the oracle rejects filtering restricted documents for all roles. Inspection of every oracle `listDocuments` call confirms the gap.

**Fix:** Assert the complete seeded own-tenant ID set for both editor and admin using `listDocuments`, including the restricted record and excluding foreign records. Keep the viewer assertions. Add a distinct implementation variant that hides restricted records from every role and require an evaluated product failure with preserved failed-check evidence.

**Confidence:** High; missing positive assertions and the API path are confirmed by source. **[INFERENCE]** Acceptance of the described mutant follows from the inspected assertions; that mutant was not executed in this review.

### T1-R2 — [MAJOR] Rejected foreign-ID creation can mutate unchecked foreign fields

**Evidence:** `benchmarks/tasks/verifiers/verify-authorization.js:46-78,177-201`; `scripts/evals/task-runner.test.ts:411-415,509-533`; `docs/prd/prd-plan-pr223-remediation.md:24`; Task 1 brief lines 7–8.

**Contract:** A foreign-ID creation collision must be rejected without changing the existing foreign document; collision corruption must fail the oracle.

**Issue:** After the rejected collision, the verifier checks only `title`, `content`, and `tenantId`, followed by cross-tenant read denial. It does not compare the foreign document's `id` or `restricted` state with its pre-collision value. Each oracle case creates a fresh seeded service, so the other cases cannot observe corruption caused in this case.

**Why:** In the compliant implementation's foreign-ID guard, changing `existing.restricted = true` before throwing still meets every assertion in this collision case. The owning admin can read the document, all three asserted fields remain unchanged, and the colliding tenant remains denied. The foreign public document nevertheless becomes restricted, changing subsequent legitimate consumer access. Corruption followed by rejection is explicitly prohibited; testing only blind overwrites leaves that requirement incomplete.

**Check:** The existing negative collision variant removes the collision guard entirely, which tests successful foreign overwrite. It does not test mutation-before-rejection. No nearby oracle case compares the entire foreign document before and after this collision.

**Fix:** Capture a detached public-API snapshot of the foreign document before creation and deep-compare the post-rejection document, including `id` and `restricted`. Add a variant that changes an unchecked field and then throws; require a product failure, not an infrastructure classification.

**Confidence:** High; the incomplete preservation check is source-confirmed. **[INFERENCE]** The described mutation escapes the current assertions; it was not executed here.

## SPEC traceability — all brief criteria

“Conforms” below means source review plus the stated parent evidence for existing scenarios, not independent command execution by this reviewer.

| Brief / acceptance criterion | Assessment | Evidence / consumer path |
| --- | --- | --- |
| Regression: candidate `process.exit(0)` never succeeds | Conforms | Test `task-runner.test.ts:185-223`; missing receipt becomes infrastructure failure at runner `1008-1022`; success requires a validated receipt at `1093-1101`. Parent early-exit CLI: exit 1, evaluated 0, infrastructure 3. |
| Explicit structured completed result, independently checked rather than exit-only | Conforms | Runner `420-492` validates object, schema, completed status, nonempty checks, IDs, outcomes, nonempty evidence, uniqueness, recomputed counts, and exit agreement. Both built-ins write receipts only after their synchronous check loop. |
| Reject missing/malformed/duplicate/incomplete/count/status-inconsistent evidence | Conforms; prior status/exit smoke gap closed | Runner `424-478`; current five-mode receipt regression `1112-1226`. Supplemental parent Node 20 `runTaskSuite` smoke observes non-completed status/exit 0, passed receipt/exit 1, and failed receipt/exit 0 across three arms each, all infrastructure-only with null receipts. No permanent wiring/tautological test is required for this smoke proof. |
| Preserve counts and useful evidence for genuine assertion failures | Conforms for exercised failures | Current authorization receipt loop `388-437`, pagination `194-243`; runner persists validated receipt at `1120-1145`. All four authorization mutants require verifier exit 1, no infrastructure error, and useful failure evidence. Parent unchanged-reject CLI: exit 1, evaluated 3, product failures 3 (earlier revision). |
| Update every owned verifier and manifest hash; no legacy exit-only shim | Conforms | Both built-ins and synthetic test verifier emit the protocol. Manifest has no static hash to refresh: `validateManifest` hashes verifier bytes at runner `360-371`; execution rechecks before/after. Missing receipt has no fallback to exit-only success. |
| Receipt is integrity evidence, not hostile same-UID isolation | Conforms | CLI `task-index.ts:131-134`, manifest description, type comment `task-types.ts:91-95`. Worker/verifier execute with host privileges; readable environment/receipt and mutable Node intrinsics are not treated as security boundaries. |
| Normal leader/non-detached ignored-stdio helper regression | Conforms for POSIX tested path | Test `226-279` launches an unref'ed same-group ignored-stdio helper and observes process state after resolution. Runner `637-724` awaits normal group settlement. Parent focused regression and combined suite pass. |
| Bounded POSIX termination/quiescence before normal resolution; fail closed | Source conforms | TERM, 1.5-second observation, KILL, up-to-5-second observation; non-ESRCH inspection/signaling errors are recorded. `executeTaskRun` does not start the verifier if worker cleanup reports infrastructure failure (`958-990`). Cleanup failure is retained in `infrastructureError` (`610-634`), not converted to success. |
| Preserve timeout/output/error behavior and Windows limits | Source conforms within existing platform contract | Per-stream 5 MiB caps remain at `553-579`; timeout escalation/owned-group inspection and pipe destruction remain at `619-623,726-789`. Spawn/error paths retain infrastructure errors. POSIX behavior is guarded by `isPosix`; Windows still uses direct-child signaling, with no new descendant-cleanup guarantee. No Windows runtime proof is claimed. |
| Null-prototype task records; all accepted IDs persist without blacklist | Conforms | Existing ID validation accepts `__proto__` (`225-235`); `byTask = Object.create(null)` at `1299`; own-key updates, `Object.values`, JSON serialization, and CLI `Object.entries` preserve it. Current regression `1228-1259` checks returned and persisted records across three arms; earlier runtime evidence remains applicable to this unchanged source path. |
| Forced authenticated tenant override in every arm | Conforms | Minimal lines 12–14, current 18–19 and 35–36, candidate 11–13 agree on ignoring spoofed tenant, rejecting foreign collisions, and viewer omission. Actual create API check at oracle `143-175` requires creation to succeed under the authenticated tenant in returned and stored state. No wording/source-string tests are used as proof. |
| Foreign-ID collision rejected and foreign state preserved through public API | Conforms — T1-R2 resolved | Detached public-API pre-collision snapshot and entire post-rejection deep comparison at oracle `177-209`; test `573-592` observes product rejection of mutation-before-throw. Parent RED/GREEN establishes the regression. |
| Viewer restricted listing omitted; editor/admin restricted access preserved | Conforms — T1-R1 resolved | Oracle `234-267` checks exact own-tenant IDs for both privileged roles and preserves viewer omission/public inclusion. Direct restricted viewer denial/editor access remains at `313-329`. Parent GREEN passes baseline and rejects both viewer leakage and all-role over-filtering variants. |
| Ordinary compliant implementations pass | Conforms for exercised implementations | Secure authorization baseline is one of V4's five passing behavior children. Prior pagination/full Node 20 suite and deterministic CLI pass evidence predates final oracle edits and is not relabeled as final integration proof. |
| Treatment behavior identical for F5/F6/NV2 contract | Guidance and shared oracle conform | Every authorization arm requires forced authenticated tenant override, foreign-state preservation, complete editor/admin own-tenant listing, and viewer restricted omission. The same updated verifier serves every arm. No paid/live-model treatment comparison is claimed. |
| Starting buggy fixture unchanged; no generated/integration ownership | Conforms to frozen package scope | No fixture/generated file is in the 10-file V4 package. Compliant and faulty solutions remain test-local. No unrelated edits by this reviewer. |
| Required test command, built-in CLI smoke, bounded helper observation, worker report | Focused V4 and prior unchanged-path evidence supplied; final integration pending | V4 authorization selector GREEN and receipt-edge suite smoke supplied. Prior combined Node 20, deterministic built-in CLI, helper regression, and V3 affected compiler evidence retain their revision labels. Owner report was read; it predates parent's GREEN notification and does not supersede it. Full integrated/current CLI evidence remains the parent's separate lane. |

## QUALITY assessment

- **Correctness / silent failure:** Valid receipt failures remain product failures, invalid/missing receipts become infrastructure errors, and suite/arm/task denominators exclude infrastructure failures. CLI exits nonzero for product failures, timeouts, or infrastructure errors. Inspection followed both `executeTaskRun` and `runTaskSuite`, persisted JSON, and the CLI—not just worker assertions.
- **Process lifecycle:** Normal POSIX completion awaits cleanup before verifier execution; timeout cleanup remains bounded even when a separately detached helper holds capture pipes. Detached sessions are outside ownership. Cleanup errors are not hidden behind a zero leader exit. Restored `settled` and `cleanupError` declarations are present in final source.
- **Types / compatibility:** `VerificationReceipt` is explicit structured data; `verificationResult` is nullable for unavailable evidence. Shared result construction supplies the new fields; discovered consumers are the task runner, CLI, tests, and package script. Node 20-compatible Promise construction replaces `Promise.withResolvers`; the supported runtime floor was not raised. V3 explicitly requests UTF-8 string directory names at runner `88-90`, resolving the parent-observed `string | NonSharedBuffer` argument error at `path.join`. This matches the prior runtime defaults (UTF-8 names, no Dirents); file-content hashing, sorting, symlink rejection, and recursion remain unchanged. Parent's affected strict-compiler closure passed after this correction; no new defect identified in this delta.
- **Tests:** Real child processes, outward JSON/exit outcomes, public service APIs, and separate faulty implementations are used. V2 unique output basename isolation remains in V4. New V4 regressions independently detect all-role restricted-list filtering and mutation-before-rejection; parent RED established both false passes, and GREEN proves corrected product classification while retaining the compliant baseline. Neither was weakened to a source-string, verifier-label, mock, or bare-not-throw assertion.
- **Security / AI safety:** No new network or paid-model execution surface. Hashes/receipts remain integrity signals; nothing establishes a hostile same-UID sandbox. Authorization review is bounded to the local fixture/oracle contract, not a claim of production service deployment security.
- **Nits:** None reported. Historical worker-report imprecision and unrelated integration documentation are not promoted to code defects.

## Runtime evidence and historical failures

All execution evidence below is **parent-observed and authoritative**, not reviewer-run:

| Evidence | Result |
| --- | --- |
| Combined actual Node 20 command on V2: `rtk pnpm dlx node@20 --import tsx --test scripts/evals/*.test.ts` | Exit 0; **108/108 passed, 0 failed, 0 skipped; 9.32 seconds**. Includes entire Task 1, text suite, assertions, and worker parity. This result predates V3's explicit UTF-8 directory-name option; it is not relabeled as a post-V3 runtime run. Parent references `artifact://91` footer. |
| Affected strict-compiler closure after V3 correction | **Passed; 1.11 seconds**, parent-observed. Root settings: NodeNext/ES2022 with `--ignoreConfig --noEmit --strict --skipLibCheck`. Parent first observed `string | NonSharedBuffer` at `path.join`; explicit UTF-8 encoding corrected the overload without casts/copies/new logic. Exact compiler invocation was not supplied; no root-wide compiler claim is made. |
| Pre-correction authorization RED: `rtk pnpm dlx node@20 --import tsx --test --test-name-pattern='authorization behavior regressions' scripts/evals/task-runner.test.ts` | Exit 1; **1.28 seconds**. Secure baseline and prior negative cases passed; both newly introduced faulty implementations had verifier exit 0 where exit 1 was required. Valid RED for T1-R1/T1-R2; not rerun by this reviewer. |
| V4 targeted authorization GREEN, same selector | **6 passed, 0 failed, 24 skipped; 1.23 seconds**: 5 behavior children plus parent. Includes secure baseline, foreign overwrite, viewer leakage, all-role restricted-list omission, and mutation-before-rejection. Parent-observed, not a full-suite claim. |
| Supplemental Node 20 real `runTaskSuite` receipt/status/exit smoke | **9 runs passed; 1.82 seconds**. Non-completed status/exit 0, passed receipt/exit 1, and failed receipt/exit 0, each across all three arms. Each scenario: 0 successes, 0 evaluated runs, 3 infrastructure failures, null accepted receipts. Throwaway behavioral smoke, no permanent wiring/tautological test added. |
| Focused amended CLI isolation case | 1 pass, 24 skipped; 1.30 seconds. |
| Focused three original harness regressions | 3/3 passed; 0.52 seconds. |
| Actual Node 20.20.2 built-in CLI deterministic smoke, four modes × three arms | 12 attempts; 8.79 seconds total. Pass: exit 0/evaluated 3/pass 3. Early exit: exit 1/evaluated 0/infrastructure 3. Unchanged reject: exit 1/evaluated 3/product failures 3. Timeout: exit 1/timed out 3. No real models. |
| Pre-amendment whole Task 1 | 32 passed / 1 failed; 8.80 seconds. Sole failure inspected a generic `cli-results` snapshot prefix and found historical `NvvbG9` left by an earlier interrupted 180-second run. Parent identified this as test namespace contamination, not a current production leak. V2 uses a unique basename. |
| Earlier Promise rewrite failure | Parent observed omitted `settled` and then `cleanupError` causing ReferenceErrors. Corrected before V1/V2 snapshots. Final source declares both; this history is retained, not relabeled as valid RED or erased by later passes. |
| Earlier authorization RED fixture problem | Worker report records missing `return results` in the passing test implementation; that RED was invalid. Corrected test-local implementation returns the list. |

Attempted read of `artifact://91` returned `No artifacts directory found` in this reviewer session. Parent results remain authoritative under the review contract; that raw artifact is not independently readable here. No rerun was attempted. Full V2 suite and affected V3 compiler evidence are retained as historical proof, not post-V4 integration runs. V4 targeted authorization proof and supplemental receipt-edge proof are supplied; final integrated runtime/compiler/generated evidence remains pending.

## Remaining validation boundaries — no additional confirmed Task 1 defects

1. **Closed former proof gaps:** T1-R1/T1-R2 mutant execution is now demonstrated by parent RED/GREEN; receipt status/exit disagreement is now observed through nine real suite runs. These are no longer outstanding validation requests.
2. **Final cumulative integration:** The previous 108/108 Node 20 result predates the V4 oracle/guidance/test corrections. Full integrated/current CLI checks and final cumulative compiler/generated checks remain pending. The earlier affected strict-compiler closure is not a root-wide compiler pass. No root-suite or Actions-green claim is made.
3. **Explicit out-of-scope unknowns:** Windows descendant behavior and forced owned-group cleanup-error runtime probes remain unexercised. Source retains fail-closed POSIX error handling and the limited Windows/direct-child contract; no host isolation, escaped-session ownership, or Windows parity is inferred. Copy/doc-source-unchanged probes are not claimed as newly observed here.
4. **Other task ownership:** Task 3 collector D/F RED and Task 6 generated integration are outside Task 1. They neither establish a new Task 1 defect nor supply final integration proof. They remain the parent's separate lanes.

## Audit, telemetry, and correction handling

MCP `audit_session_compliance` was called before handoff. Loaded skills:

- `common/common-best-practices`
- `common/common-code-review`
- `common/common-learning-log`
- `common/common-llm-security`
- `common/common-owasp`
- `common/common-security-audit`
- `common/common-session-retrospective`
- `common/common-tdd`
- `javascript/javascript-language`
- `nextjs/nextjs-testing`
- `typescript/typescript-language`

Also read runtime `using-superpowers`, `code-review`, and `verification-before-completion`, repository review/trust policies, and test quality-contract references. MCP `code-review` workflow loaded. The report extension has no routed file skill; the already loaded review rules govern its content. MCP flags generic `.ts` Angular/NestJS/React coverage gaps; the reviewed files are Node CLI/process code, not those frameworks. Advisories are recorded rather than suppressed.

`get_session_cost(workflow="code-review", model="openai-codex/gpt-6.1-sol")` returned MCP-observed telemetry: 11 MCP calls, 11 loaded skills, 1 file-router no-match, 221 elapsed seconds at collection. Its 35 “workflows loaded” entries include discovery results, not 35 executed workflows. Host prompt/cache/completion/reasoning token usage and price/rate fields are unavailable; **dollar cost is unavailable**, not zero or estimated. The server's 3,428 skill-context-token figure is a chars/4 estimate, not measured model usage.

Correction handling: historical namespace contamination, invalid authorization-fixture RED, missing lifecycle-state ReferenceErrors, and V3 type-overload failure are preserved rather than erased by later success. V4 source corrections and parent RED/GREEN resolve both independent Major findings without relabeling the prior 108-test run. Review/feedback and test quality skills were consulted; no registry change, learning-log mutation, instruction-policy change, or promotion is performed. Skill maintenance remains proposal-only absent a distinct authorized task.

## Handoff

T1-R1 and T1-R2 are resolved in V4; no additional confirmed Task 1 finding remains. Parent owns final cumulative integration and evidence recording before any delivery/signoff decision. Preserve the bounded targeted results and all earlier failures; do not relabel them as full post-V4 verification. This review grants no approval.
