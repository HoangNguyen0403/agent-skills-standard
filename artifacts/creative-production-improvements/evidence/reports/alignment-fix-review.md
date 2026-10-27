# Alignment verifier repair — independent review

## Verdict: CHANGES REQUESTED

**Spec axis: not accepted** — independent-document semantics are implemented, but valid empty regex/document behavior was changed outside the ruling. **Quality axis: not accepted pending that correction**; duplicate regex compilation and one masked test are also identified below.

Scope: only `scripts/check-alignment.ts` baseline `1aecf6c3` diff, new `scripts/evals/alignment.ts` and `alignment.test.ts`, `alignment-ruling.md`, `alignment-fix-report.md`. Current snapshots: caller `ABC2`, helper `ECC0`, tests `A9D5`, report `F274`, ruling `393C`. Trusted local source/task package. No evaluation-design review.

Standards loaded: existing code-review/common-code-review and security standards; file-loaded `typescript-language`, `common-best-practices`, `common-tdd`, `nextjs-testing` (framework-specific portions not applicable to Node CLI). Compliance audit completed; generic unrelated framework-category warnings do not require importing Angular/React/Nest rules into this Node utility review.

## Findings

### A1 [MAJOR] scripts/evals/alignment.ts:15–22,26–30; alignment.test.ts:116–122 — Repair changes valid empty-pattern and empty-document matches

Why: The authorized change is to test the actual documents independently, not add regex-validity policy. Baseline caller constructs `new RegExp(assertion.value ?? "", "i")`; an empty or omitted pattern is a valid empty regex and matches strings. The new caller still compiles that successfully, but the helper explicitly rejects `""`, making a formerly aligned assertion count as a miss. Likewise the helper removes actual empty documents: a valid `^$` assertion with `expected_output: ""` and unrelated nonempty prompt/skill should match that actual expected document under the ruling, but now cannot. This can falsely reduce the alignment percentage/reject a skill without any threshold change. The new missing/empty-pattern test pins the unapproved regression rather than preserving the existing constructor semantics. Invalid regex syntax is different from a valid regex that matches an empty string.

Fix: Preserve the caller's existing pattern default/conversion and native RegExp semantics. Test actual string documents including empty strings; distinguish absent documents if necessary rather than dropping supplied empty documents. Replace the policy-changing empty-pattern assertion with preservation edge cases (valid empty pattern; actual empty expected document with `^$`). If rejecting empty regexes is desired, that is a separate policy decision, not this bounded boundary repair.

## Avoidable duplication and test quality (nonblocking after A1)

### A2 [NIT] scripts/check-alignment.ts:162–175; scripts/evals/alignment.ts:24–34 — Valid patterns compile twice and invalid handling is duplicated

Why: The caller creates and discards a RegExp to preserve the invalid diagnostic, then the helper recompiles it and catches syntax failure again. Every valid regex pays the extra compilation; there are two validation/default policies to maintain. The helper also builds/filter-allocates a source array for three fixed documents.

Fix: Compile once at the diagnostic-owning caller and pass the compiled i-only RegExp to a document-matching helper, or have a single compiler/matcher return an explicit invalid-versus-miss result. Preserve the exact `(invalid pattern)` diagnostic. Avoid a second regex implementation merely to expose tests. Direct short-circuit source checks can preserve document identity without allocating/filtering an array.

### A3 [NIT] scripts/evals/alignment.test.ts:6–21,41–43 — Line-count positive case is independently satisfied by the prompt

Why: Both `prompt` and `expectedOutput` contain exactly three lines. The line-count pattern therefore returns true even if a regression stops checking expected output for that case. The start-anchor assertion does isolate expected output, but the intended distinct whole-answer line-count risk is masked. Current tests also do not distinguish i-only from an accidental `im` implementation: no negative mid-document anchored case would fail when `m` is added.

Fix: Make the prompt a different line count from the expected answer so the whole-answer shape success can only come from the expected document. Add a narrowly grounded negative where an anchored term occurs only after a newline, with no independently matching document, plus an uppercase/lowercase preservation case if needed. These exercise consumer-visible false alignment/rejection, not implementation choreography.

## Confirmed behavior / constraints retained

- Helper tests stripped skill, actual prompt and actual expected output separately; no fabricated prompt/answer join reaches regex matching.
- Helper uses `new RegExp(pattern, "i")`, without `m`, and does not lowercase actual regex input documents. This follows the ruling's actual-document semantics, including case-sensitive constructs that `i` does not neutralize.
- Caller retains invalid-pattern versus ordinary-miss diagnostic text, total/matched accounting, threshold configuration/default 70, `contains`/`contains_any` combined substring behavior, unrelated assertion handling and no skill-specific exceptions.
- Tests cover anchored expected answers, prompt-only and skill-only grounding, invalid syntax and fabricated join-boundary rejection. They test returned alignment decisions, not source text or mocks.
- `package.json:47` uses `node --import tsx --test scripts/evals/*.test.ts`; the new test matches the existing runner glob. This is source evidence only, not a passing run.
- Report says verification is pending integration; no passing runtime/test claim adopted. Its claim that concatenation was the sole cause for every initial failure is not independently established by this bounded source review.

## Verification / next gate

Executed only `rtk proxy git diff 1aecf6c3 -- scripts/check-alignment.ts` (exit 0) plus file reads/search/standards audit. No tests, runtime probes, builds, lint, formatters, source edits or delegation. Integration worker owns the live checks; this reviewer did not duplicate them.

Return A1 to the implementer and reconcile report §4's empty-pattern semantics. A2/A3 are concrete narrow quality improvements, not authorization to widen eval design. Re-review affected helper/caller/tests before treating the support-code review gate as clear. Host token/pricing telemetry unavailable; no cost fabricated.

---

## Scoped correction re-review — PASS

Actual inputs read: caller `B70A` regex branch, compiled-RegExp helper `6C55`, complete corrected tests `D6F9`, report `85B4` §6. Scope restricted to A1–A3 and correction breakage; Task 4 expected-answer data corrections remain separate and were not reviewed here.

| Finding | Disposition | Evidence |
|---|---|---|
| A1: empty pattern/documents rejected | Addressed | Caller L156–163 retains native `new RegExp(assertion.value ?? "", "i")` and original invalid-pattern diagnostic. Helper L23–38 tests each actual string independently, including `""`, skipping absent nonstrings without fabricating documents. Tests L164–199 cover valid empty patterns, actual empty expected output with `^$`, and absent undefined documents. |
| A2: duplicate compilation/allocation | Addressed | Caller compiles once and passes the RegExp at L166. Helper contains no compiler, array/filter allocation or second invalid-pattern policy; direct short-circuit string checks preserve independent boundaries. |
| A3: prompt masks expected-answer shape | Addressed | Tests L6–63 use a five-line prompt and three-line expected answer and verify the prompt cannot satisfy either targeted pattern. L66–96 checks interior-line nonmatching under i-only behavior and contrasts the false match under `im`. |

**Spec verdict: PASS for this bounded support-code repair. Quality verdict: PASS for tracked findings.** No remaining blocking regression found in these corrections. Regex matching remains independent per actual document; native constructor defaults and i-only caller flags are retained; invalid diagnostics remain distinct from ordinary misses. Previously reviewed threshold/contains behavior remains outside the edited branch and unchanged by this correction.

The compiled-RegExp helper uses the caller's i-only, nonstateful regex; no general support for global/sticky regex APIs is asserted or required by this scope. Tests are behavioral source evidence, not a claimed passing execution. The support-code source-review gate is clear; live unit/registry checks and separate expected-answer data validation remain integration responsibilities.

Only this report appended. No tests, runtime execution, source edits, builds/lint/formatters or delegation. Compliance audit repeated with unchanged applicable standards. Host usage/pricing unavailable.
