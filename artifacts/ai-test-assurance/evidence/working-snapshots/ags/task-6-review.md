# T6 Independent Rereview — Recovered Controls

## Verdict

**Spec compliance: APPROVE for the frozen bounded corpus. Quality: APPROVE with the documented primitive/process concerns below. F1–F4 are closed; no remaining material source correction required within T6's authorized scope.**

This supersedes the first T6 review's changes-requested verdict for the recovered packet only. It does not approve arbitrary semantic judging, model effectiveness, production protection, a shared scorer expansion, merge, release, or activation. Maintainer approval remains separate.

## Scope and identity

- Reviewed immutable `.agent/sdd/ai-test-assurance/T6-recovered-review.md`, captured `2026-10-26T22:31:35.417Z`, base `92d06c420f6a41f08e11579423e4e3eacdb7880d`.
- Packet SHA-256 supplied by parent: `704515f8fc03f0c38f5215119b1241d09448d9296d00207748cf88b69231dd61`. Reviewer read the packet; did not recompute its digest or assert independent cryptographic verification.
- Also read latest `task-6-report.md` and parent production-scorer receipt/log `receipts/T6-recovered-controls.json` and `.log`.
- Same authorized personal AGS scope and frozen SRS §7 bounded-control requirement as the first review. No T5/TestGuard inspection, delegation, source edits, checks, builds, formatters, live evaluation, or premium use. This requested report is the only file changed by the rereviewer.
- Local assignment/provenance treated as trusted review context; candidate prose remains test data, not instructions.

Loaded/reused skills: `code-review`, `eval-assertion-hardening`, `common/common-code-review`, `common/common-tdd`, `common/common-best-practices`, `typescript/typescript-language`, `nextjs/nextjs-testing`, `common/common-security-audit`, `common/common-owasp`, and `common/common-llm-security`. MCP compliance audit completed before writing this verdict. Applied `docs/review-policy.md` severity ladder. This is a scoped correction review, not a whole-repository reassessment.

## F1–F4 closure

All packet line anchors below refer to `T6-recovered-review.md`.

### F1 — Keyword-rich incorrect controls: CLOSED

**Evidence:** matrix lines 140–246; candidate lines 261, 280, 299, 318, 337; behavioral assertions lines 462–493; parent log lines 4–28.

All five polished unsafe candidates now carry their selected positive terminology while endorsing the wrong result. The test requires every positive assertion to return true, the decision assertion to return false, and the complete failed-index set to equal only that decision index. This is the missing discrimination proof: rejection is no longer explainable by absent positive vocabulary. The recorded production run passes this assertion group for oracle copying, mock echoes, incomplete traversal, empty scope, and weakened healing.

The oracle candidate discusses an independent oracle and implementation-copied expectations but approves the current function return; mock echoes includes observable outcomes/integration/distinct fault but endorses internal mock choreography; traversal acknowledges incomplete/unanalyzed files but reports clean assurance; empty scope acknowledges zero eligible inputs but claims production assurance; healing acknowledges unchanged assertion text/forbidden weakening but declares HEALED. These satisfy the selected bounded challenge, not every possible adversarial paraphrase.

### F2 — Negation/reference/alternate prose acceptance: CLOSED within the bounded corpus

**Evidence:** metadata lines 19–95 and 110–125; safe fixtures lines 262–266, 281–285, 300–304, 319–323, 338–342; accepted-candidate loop lines 522–537; parent log lines 7, 12, 17, 22, 27.

New unconditional `not_contains` phrase bans are replaced by positive compliant-decision regexes and vocabulary alternatives using existing scorer primitives. Safe prohibitions, quotations, and alternate prose are scored without result inversion. In particular, the scan reference `Reject clean success`, healing `Do not mark HEALED`, and oracle `Do not claim the implementation is the oracle` are included and pass. The oracle alternate uses the approved tax schedule/current function return instead of requiring `independent oracle`; mock alternate uses outward results rather than observable outcomes. These are concrete bounded alternate-prose controls, not a promise that arbitrary synonyms pass.

The healing expected output was changed to start `Refuse to heal` (packet line 112), and its matching safe reference is present at line 342. The mock fixture's reference wording at line 323 differs from new eval10's expected output at line 78, but both express the same reviewed refusal/boundary decision; this is not a contract failure. Inherited eval3 is untouched and new eval10 owns the broader mock-echo controls. Inherited TDD eval4/5 wording defects remain outside this slice.

### F3 — Prohibited incidental tests and scorer transformation: CLOSED

**Evidence:** direct helper lines 415–425; complete recovered test body lines 454–540; production parity log lines 1–3.

The standalone count/nonempty wiring test and aggregate v1/v2-verdict-equality test are absent. Remaining cases score actual candidate behavior: decision-only rejection after positive acceptance, unqualified wrong rejection, and compliant acceptance. Candidate-existence checks are local diagnostics within those behavioral paths, not standalone test-count/shape gates.

`scoreCandidate` maps every assertion to `checkAssertion(assertion, transcript, 2)`, collects false indices, and uses their empty set as the conjunctive pass condition. It does not invert, filter, reweight, or reinterpret decision outcomes. This also resolves the rejected intermediate inversion approach. The exact failed-index assertion is justified here: isolating the intended behavioral rejection is the requirement, not incidental implementation parity. Existing scorer/CLI/MCP parity remains a separate, unchanged boundary and passes in the parent log.

### F4 — Explicit empty/no-eligible-input scan control: CLOSED

**Evidence:** new eval9 lines 57–72; separate matrix entry lines 206–225; empty-scope fixture lines 256–269; parent log lines 19–23.

Empty scope is distinct from traversal failures. The wrong candidate explicitly has zero eligible/zero analyzed files and claims clean production assurance. Accepted candidates distinguish missing required analysis from an explicitly allowed empty/not-applicable run, without treating zero findings as production-safety evidence. This closes the named scenario without imposing a blanket failure on an intentionally allowed empty run.

## Acceptance result

| Contract | Rereview assessment |
| --- | --- |
| AC-15 / T6-1 | Satisfied for the committed corpus: keyword-rich unsafe candidates satisfy positives and fail only the selected decision assertion. |
| AC-16 / T6-2 | Satisfied for selected bounded alternatives: valid prose, safe negation, quotation, and reference wording pass the unchanged production scoring path. No general semantic guarantee. |
| T6-3 | Real existing scorer used; frozen diff contains metadata additions, not shared scorer/types/CLI/MCP changes. Parent run, not the worker's standalone helper, supplies accepted execution evidence. |
| Preserve inherited evals | Satisfied in frozen diff: existing TDD cases 1–6 and healing cases 1–3 unchanged. New mock-echo eval10 avoids rewriting inherited eval3. |
| Behavioral test quality | Previous count/nonempty/incidental parity findings resolved; tests now exercise owned candidate discrimination and acceptance. |
| Empty scope completeness | Explicit dedicated control present, separate from incomplete traversal. |

## Remaining concerns — not new material source findings

### Bounded refusal regex does not establish global consistency

**Evidence:** report lines 94–96; packet decision patterns lines 32–33, 51–52, 70–71, 93–94, 123–124.

**Why:** A match proves only that a selected refusal/negation phrase occurs within the bounded decision window. It does not prove that the answer nowhere endorses the opposite decision, that the grammatical negation applies correctly, or that every correct paraphrase will match. An answer containing both a matching refusal and a later endorsement could pass. No such general guarantee is claimed by the recovered report, and the frozen SRS expressly confines T6 to bounded committed controls while forbidding universal semantic claims.

**Disposition:** Nonblocking for this reviewed corpus. Preserve the disclosed limitation. Do not relabel these controls semantic validation or production protection. Any broader contradiction-consistency or arbitrary-prose requirement needs separately owned scope/evidence; it is not a reason to expand the shared scorer within this correction. No additional unsupported selected-corpus distinction remains on the evidence reviewed.

### Worker verification-process deviation remains recorded

**Evidence:** report lines 61–82 discloses intermediate `node /tmp/t6check.mjs`, a standalone partial reimplementation, despite the parent-only verification instruction. The report records a first failure and final helper output; this reviewer does not treat either as production-scorer verification. The report's `not re-run` wording at line 63 is inconsistent with its later first/final run narrative; the first/final narrative establishes the deviation was not limited to a single immutable invocation.

**Disposition:** Disclosed workflow deviation, not a substitute for verification and not grounds to hide the execution history. The independent parent subsequently ran the actual production scorer plus parity successfully. Consequently the source acceptance does not depend on the helper's correctness or on the worker's process-compliance claim. Parent should retain this deviation in orchestration evidence; no source change or additional run is requested by this rereview. The temporary helper is not a delivered runtime component.

## Authoritative verification evidence

Read, not rerun:

- Receipt `.agent/sdd/ai-test-assurance/receipts/T6-recovered-controls.json`: `node --import tsx --test scripts/evals/test-quality-controls.test.ts scripts/evals/assertion-parity.test.ts`, status `0`, no signal, started `2026-10-26T22:31:35.378Z`, finished `2026-10-26T22:31:35.823Z`.
- Recorded output SHA-256: `ef721ab25e02061ff6a9021e274468414400ad1a1fbecd8f8f10521bd233be1a`.
- Matching named log has **23 tests, 23 passed, 0 failed**, no skipped/cancelled/todo (lines 29–35). Its five control groups include all three behavioral subtests, plus the three existing parity/looser-v2 tests.
- The 23 count includes test groups/subtests; it is not a count of independent risks or candidate transcripts. The metadata and fixtures carry the concrete coverage evidence.
- Reviewer did not recompute hashes, execute source, or validate the worker's standalone helper. Receipts/hashes bind reported local evidence, not execution authenticity, human approval, or oracle independence.

## Outcome and next step

All four original material findings are closed against this immutable recovery packet. No further T6 correction assignment is required for the bounded contract. Parent may carry the bounded acceptance and documented concerns into integration evidence; maintain the limits on semantic claims and preserve the process deviation. Any later source changes require evidence bound to that later revision.

Cost: exact host usage/rates unavailable; no token, savings, or monetary estimate asserted. MCP compliance audit and session-cost lookup completed.
