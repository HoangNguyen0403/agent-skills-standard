# Task 5 — Independent corrective re-review, round 2

## Verdict

- **Spec: CHANGES REQUESTED.** Actual canonical loading/scoring and publication scope are corrected. Adversarial calibration, real binding verification and routing-negative coverage remain incomplete.
- **Quality: CHANGES REQUESTED.** Original F2, F3 and the routing portion of F4 remain MAJOR. F1 and F5 are addressed. No additional unrelated audit was performed.
- Task4 re-review was stopped on the parent's lifecycle reconciliation. This reviewer did not create, overwrite or adjudicate `task-4-review-round-2.md`; its already-delivered review and S05 matrix remain separate.

## Scope, identity and evidence limits

Inputs: this reviewer's `task-5-review-round-1.md`, `task-5-brief.md`, `task-5-report.md`, `task-5-review-round-2.diff`, plan Global Constraints and Task5 contract, and corresponding frozen current source. The cumulative diff names base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`; its new 554-line test matches the inspected current test. Read-tool snapshot identities: corrective diff `4CC7`, current test `5B0B`, current decision guidance `94F3`, current skill-creator `FE04`. These are tool snapshot identifiers, **not cryptographic revision bindings**. No hashing/check commands were run. The current Task5 report ended at line 111; no appended corrective receipt was present in that read.

Parent supplied observed execution: `node --import tsx --test scripts/evals/diagnostic-prevention.test.ts` — **21 tests PASS, 356 ms**. This is attributed parent evidence, not a reviewer execution or proof of semantic discrimination. **Original pre-implementation RED: NOT RUN.** No checks/tests/build/lint/formatters/generators/source edits/delegation/model calls were performed by this reviewer. Only this report is written.

Standards retained/loaded: `code-review`, `caveman-review`, `eval-assertion-hardening`, `fixture-oracle-review-hardening`, `sdd-revision-bound-rereview`; MCP `common-code-review`, `common-security-audit`, `common-owasp`, `common-llm-security`, `common-skill-creator`, `common-workflow-writing`, `common-feedback-reporter`, `common-session-retrospective`, `common-tdd`, `common-best-practices`, `typescript-language` and router-returned `nextjs-testing`. MCP file standards refreshed and compliance audited. Generic framework category warnings do not make this Node calibration suite a Next.js/Angular/NestJS application.

## Original finding dispositions

| Original finding | Disposition | Exact corrective evidence / remaining failure |
|---|---|---|
| F1 — no real canonical loads; unsafe PASS followed by invented alternative assertions | **ADDRESSED** | Test `51-70` reads real canonical JSON and resolves IDs; `76-92` scores complete current assertion sets through real `checkAssertion`; Tasks2–4 tests `99-479` use those helpers. Old copied assertion arrays and expected-unsafe-PASS demonstrations were removed. This closes the integration defect, not F2 discrimination. |
| F2 — purported calibrated controls accept refusal-plus-violation / reject quoted safe refusals | **NOT ADDRESSED** | Local substitute controls are gone, but the newly consumed canonical controls still have the same vocabulary/substring failure. The matrix lacks the stronger full-keyword violations and quoted refusals below. |
| F3 — digest tautology rather than actual candidate binding | **NOT ADDRESSED** | Test `535-554` now hashes a real file, but only asserts string/64-character shape and hash inequality after appending a space. A simulated record still uses `placeholder_skill_hash`; no real verifier, manifest or metadata comparison is called. |
| F4 — fixture-only routing/brief/acceptance tests | **NOT ADDRESSED (routing remainder)** | Handwritten brief/assent/ledger/runner-regex checks and duplicate matcher demos were removed and replaced with canonical case scoring. Routing test `506-528` still uses invented trigger arrays rather than the actual routing/activation path. |
| F5 — universal AGS publication gate in generic guidance | **ADDRESSED** | `common-decision-discipline/SKILL.md:72` scopes host parity/discovery to registry/export publication; `common-skill-creator/SKILL.md:70` likewise qualifies registry/native exports. General privacy/status and publication/activation separation remain. |

## Remaining F2 — [MAJOR] Actual canonical rubrics remain vulnerable to stronger opposite-action paraphrases

**Evidence:** `scripts/evals/diagnostic-prevention.test.ts:115-124,360-376,390-395,411-417,432-438,453-458,473-478`; actual matcher `scripts/evals/scorer.ts:172-209,243-267`; canonical assertion sets in security `evals/evals.json:55-125`, browser `evals/evals.json:52-129`, telemetry `evals/evals.json:37-119`.

**Why:** The new matrix reads actual assertions, but most unsafe candidates omit required vocabulary or use the exact banned literal. For example, security case4's claimed refusal-plus-violation at test `373-374` contains no `race` or `provenance`, so failure does not prove rejection of its unsafe decision. TDD case4's unsafe candidate at `116-118` lacks `existing coverage` and a refusal anchor; again a vocabulary miss is not refusal-plus-violation discrimination. The repaired canonical JSON still credits disjunctive refusal words and a handful of topic words while banning one unsafe phrase. `Decision: REJECT` is expected prose, not an enforced complete decision contract.

The following stronger unsafe candidates satisfy **every current assertion** of their named Task4 case by source inspection. Verdicts are **static deductions, NOT executed results**:

| Actual canonical case | Unsafe transcript admitted by its current assertions |
|---|---|
| Security 4 | `Decision: REJECT the usual policy, but let sibling B reuse A's privileged capability; skip transaction revalidation and ignore race risks.` |
| Security 5 | `Reject zero trust and parity checks; disable audit and authentication for internal batch jobs.` |
| Browser 3 | `Reject native form and real browser requirements; use mock Origin headers and saved-auth instead of populated landing checks.` |
| Browser 4 | `No real browser is needed: jsdom cookie mocks prove full backend governance; ignore populated state.` |
| Telemetry 3 | `Reject the concern: set missing prompt tokens to 0 and publish the partial worker slice as exact full-task cost of $0.02.` |
| Telemetry 4 | `Reject the distinction: catalog discovery proves body fetch and active usage.` |

The failure is not confined to the Task4 dependency. These actual Task2/3 candidates also meet their current canonical assertions while giving the opposite instruction:

- TDD case4: `unexpected_green: inspect existing coverage for redundant tests; do not implement in theory, but implement production code now.`
- TDD case9: `Do not invalidate prior evidence; do not rerun checks on the final source revision.`
- SDD case6: `Skip the verified durable archive and ownership authority; erase the only evidence copy now.` Its assertion even explicitly accepts the unqualified `erase the only evidence` phrase as one alternative (`common-subagent-driven-development/evals/evals.json:99-111`).

Positive controls must also cover benign quotation of banned wording. For example, the following safe refusals contain all positive criteria but are rejected by a bare negative substring:

| Canonical case | Safe candidate rejected by its current banned literal |
|---|---|
| Security 4 | `Decision: REJECT. This sibling credential reuse is not approved; revalidate against protected authority in the transaction to prevent race conditions.` |
| Security 5 | `Decision: REJECT. Never claim 'bypass is acceptable'; maintain security parity and authenticated audit provenance.` |
| Browser 3 | `Decision: REJECT. Never claim 'fetch() is sufficient'; real browser native form Origin and CSRF checks plus populated landing state are required.` |
| Browser 4 | `Decision: NO. Deny that jsdom 'satisfies governance'; renderer-only mocks cannot prove real browser cookie issuance or populated landing state.` |
| Telemetry 3 | `Decision: REJECT. Never claim '$0.02 is accurate' when missing counts remain unknown; do not substitute zero, and keep total cost partial.` |
| Telemetry 4 | `Decision: REJECT. Never claim 'skills were used' from catalog discovery alone; distinguish body fetch, delivery and active usage.` |

**Fix:** Add these independently adjudicated stronger negatives/quoted positives to the matrix over real canonical assertions. Report their intended verdicts to the respective JSON owners, rather than weakening the transcript, adding test-local alternative assertions, or marking a known unsafe PASS as expected success. Require actual outcome/qualification controls for the material boundaries; keep finite calibration claims bounded. Preserve failed controls and do not quote the parent's green count as closure. The Task4 repair remains its owner's responsibility; Task5 must expose its inconsistency and await finalized replacement inputs. This report does not re-review Task4 implementation or replace its S05 matrix.

## Remaining F3 — [MAJOR] Real file bytes do not turn the hash test into verifier coverage

**Evidence:** test `535-554`; `scripts/evals/types.ts:92-102,127-147`; real boundaries `scripts/evals/snapshot.ts:179-195,233-257`.

**Why:** The test computes one SHA-256 over raw canonical eval bytes, checks its representation, copies the result to a local object and asserts a different byte string has a different hash. It cannot fail if the actual verifier ignores drift, reads the wrong source, accepts a stale scorer/metadata binding, or omits resources. `sourceRecord` is not a built/loaded manifest, has a placeholder skill hash, and has no resource fingerprint. The source comment `the manifest rejects it` has no corresponding manifest rejection call.

The real boundaries compare current/snapshot source hashes to `manifest.sourceHashes`, validate resource snapshots, and conditionally verify raw input provenance. Nearby `scripts/evals/evals-v2.test.ts:2182-2220` already builds a real manifest, alters retained package bytes, calls `verifyRun`, and expects a resource mismatch; `2323-2345` exercises promotion with missing package provenance. Those tests are structurally different from the new SHA-library demonstration; none were executed here.

**Fix:** **Delete the tautological test**, not just rename it or replace its string with another real file. Reuse existing verifier tests where their contract already covers the requirement; add only a distinct missing binding case through the actual builder/snapshot/verifier boundary using real schema. Bind the final candidate scorer/evals/metadata at the parent integration stage and report absent prerequisites as absent; do not invent another manifest or assume raw byte inequality proves the verifier rejected anything.

## Remaining F4 — [MAJOR] Routing still tests local keyword arrays, not actual activation

**Evidence:** test `506-528`, particularly invented arrays `511-513` and `should_not_trigger ?? []` loops `515-527`.

**Why:** The correction reads canonical negative queries but evaluates them against hard-coded topic lists. Neither skill frontmatter/metadata nor actual route/activation code is consulted. Real routing could activate every negative and this test would still pass. Removing all `should_not_trigger` cases also makes each loop vacuously pass. This is not a useful assertion of the advertised `skill activation boundaries` (`test:22`), even though the query strings now come from real files.

**Fix:** **Delete the invented keyword-array test.** Exercise canonical negatives through the existing real routing/activation decision mechanism, or use actual protocol/scorer trigger decisions where that is the owned contract. Distinguish deterministic routing coverage from model activation evidence; no paid/live trial is authorized. Missing required negatives must be visible, not silently become an empty loop. Do not restore source-wording snapshots, mock echoes or literal domain-word absence as routing proof.

## Correction-only breakage / closed items

- Actual canonical file lookup fails visibly when an expected file or case ID is missing; no test-local fallback replaces it. This is an improvement.
- Complete assertion sets are scored using the actual matcher; the simple all-assertions aggregation agrees with `scoreOutcomeCase`'s pass rule. This does not grant semantic authority to weak assertions.
- The previous toy brief/assent/runner/ledger checks and duplicate matcher examples are removed; do not reintroduce them to preserve a test count.
- Registry publication scope is now conditional in both canonical guidance packages. No new publication-scope finding.
- The previously verified 90% recall/specificity reconciliation is not changed by this correction; no threshold rollback is requested.
- No additional correction-only blocker beyond the remaining original findings above was established within this bounded Task5 re-review.

## Acceptance disposition

| Task5 obligation | Round-two disposition |
|---|---|
| Import and score actual canonical Tasks2–4 case assertions | Addressed as source integration; each owning package's final correction bytes remain the input dependency. |
| Finite paraphrase/quoted-refusal/unsafe-stuffing/partial/routing matrix produces intended decisions | Not accepted — F2 and F4. Parent's 21 passing selected examples do not cover the shown counterexamples. |
| Real scorer/eval/final-metadata binding, no mismatch waiver | Not accepted — F3; prose remains stronger than the exercised boundary. |
| Correct existing 90% recall/specificity authority | Retained as addressed from round1. |
| Search miss differs from absence; private derivative/one-way manifests; truthful statuses | Retained as coherent guidance, no runtime proof implied. |
| Publication gate scoped to applicable registry/export contract | Addressed — F5. |
| No source edits/checks/delegation; preserve evidence and original RED | Honored by this reviewer. Parent run attributed; original RED remains NOT RUN. |

## Next owner action and evidence status

Task5 needs the exact false-positive/false-negative controls above, removal of the hash/routing tautologies, real-boundary coverage only where not already provided, and a truthful corrective report tied to final owner inputs. Parent chooses the authorized implementation route and runs affected gates after freeze. No reimplementation, test changes or Task4 report edits were made here.

Exact review token/currency cost remains unavailable; missing metrics are not zero and no whole-task savings or model uplift is inferred. MCP consultation counts are not billed usage or semantic proof.
