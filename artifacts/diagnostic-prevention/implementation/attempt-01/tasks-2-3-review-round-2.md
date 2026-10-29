# Tasks 2–3 independent review — round 2

**Status: FINAL. Overall: CHANGES REQUESTED.**

## Review boundary and evidence

Read cumulative `tasks-2-3-review-round-2.diff` (snapshot `5D37`), original round-1 report, appended FINAL remediation reports, current canonical helper (`8108`), TDD eval JSON (`1039`), corrected policy/methodology and helper tests. Review requirements remain original briefs, approved plan Global Constraints and spec S01/S02/S04. No source writes, tests, builds, lint, formatter, delegation, model/profile/account changes, or live probes. Only this authorized report written.

Parent reports **23 helper/review-package tests PASS in 2.873 seconds**. Accepted as attributed parent evidence, not rerun here and not a claim that untested edge cases or universal efficacy are proved. Task 5 calibration remains independently owned and active; no Task 5 assertion substitutes were used to adjudicate canonical cases. All counterexamples below are static deductions from source and the already inspected actual `checkAssertion` engine, not executed test results.

**Input mismatch:** The latest brief mentions new finite regex oracles. Neither the supplied cumulative diff nor the current canonical TDD/SDD/learning/retrospective eval JSON inspected here contains `type: regex` assertions. TDD cases 4/5/7/8/9 currently use positive `contains` plus exact-substring `not_contains` controls. This report adjudicates those actual bytes, not an anticipated regex repair. Task 4's separately corrected duplicate-field oracle is outside this review and is not conflated with these findings.

Loaded guidance reused from round 1 and refreshed through MCP file routing: code-review, caveman-review, common code-review/security-audit/OWASP/LLM-security/best-practices/feedback-reporter/session-retrospective/skill-creator/workflow-writing/TDD, Python language/testing and TypeScript language. MCP compliance audit completed. Broad framework/category warnings do not identify missing applicable framework rules for these Python/JSON/Markdown source-guidance changes.

## Verdicts and original finding dispositions

| Task | Spec verdict | Quality verdict | Remaining blockers |
|---|---|---|---|
| Task 2 | CHANGES REQUESTED | CHANGES REQUESTED | R1 remains open; see R1.2 |
| Task 3 | CHANGES REQUESTED | CHANGES REQUESTED | R8 remains open; see R8.2 and R8.3 |

| Original | Disposition | Evidence |
|---|---|---|
| R1 — populated structured contracts outside fences | PARTIALLY FIXED / OPEN | Structured labels added, but cross-line whitespace accepts individual empty values and only backtick fences are excluded. |
| R2 — validate before default workspace side effects | CLOSED, static source review | `task_brief.py:125–145` rejects missing tasks and invalid contracts before calling the mutating resolver. Parent tests are attributed separately. |
| R3 — exclusive no-overwrite publication | CLOSED, static source review | `task_brief.py:147–159` rejects final-component symlinks and publishes with mode `x`; FileExistsError refuses existing destinations. Exclusive open also preserves a concurrently appearing final-component symlink/file. |
| R4 — public bypass parameters | CLOSED | `extract_task(plan_file, task_number, outfile=None)` restored at line 75; no validation/overwrite opt-out. Historical report statements remain append-only history, superseded by the correction appendix. |
| R5 — active policy / obsolete retry guidance | CLOSED | Methodology lines 44–49 resolves active policy, removes old rounds 1–3/4–5, distinguishes quota from other errors; source entrypoint and case 7 carry policy context. Earlier error-not-terminal rule covers ownership transfer. |
| R6 — source-ready implies passed checks | CLOSED | Cumulative diff lines 1280–1287, 1483–1490 and workflow lines 51–58/82 explicitly separate source delivery from PASS/FAIL/NOT RUN/not applicable check statuses. |
| R7 — mandatory human signoff per unit test | CLOSED | Same acceptance sections govern applicability by approved scope, expressly reject universal per-test human signoff, preserve required human acceptance as pending, and forbid N/A-as-PASS. |
| R8 — unsafe or partial eval false passes | PARTIALLY FIXED / OPEN | Concrete forbidden continuations now fail, but exact blacklist matching is not a unique complete decision contract; quoted safe commentary is rejected, and two expected answers fail v1 predicates. |

## Remaining findings

### R1.2 [MAJOR] Empty individual fields and non-backtick fences still satisfy the helper contract

**Location:** `skills/common/common-subagent-driven-development/scripts/task_brief.py:20–29,34–69`; tests `scripts/skill-tests/common-subagent-driven-development/test_task_brief.py:200–216,227–234`.

**Why:** Each value expression uses `\s*\S+` over the entire joined task, so `\s*` consumes newlines and the next label becomes the supposedly nonempty value. Starting with an otherwise complete accepted task:

```markdown
**Inputs:**
**Outputs:** engine instance, execution receipt.
```

The Inputs expression succeeds by taking `**Outputs:**` as its value. Likewise `- Positive:` followed by a populated `- Negative:` is treated as a populated positive invariant because `\s*` crosses the newline. An empty Verification owner before a valid Handoff also passes. The all-empty-values fixture can still fail because its handoff has no valid terminal content; that does not prove independent field validation. No adjacent test varies exactly one mandatory field to empty while preserving the rest.

The fence filter toggles only on `startswith("```")`. A task whose entire valid-looking contract is inside a `~~~markdown` fence is accepted as real contract text, violating the outside-fences requirement. Unanchored label searches also count inline examples; Inputs/Outputs explicitly accept unbolded prose labels despite the requested structured bold field contract.

**Fix:** Parse field labels from actual unfenced lines; use horizontal whitespace only around labels/values and require each field's own populated value rather than a later label. Parse positive/negative invariant entries separately. Recognize Markdown backtick and tilde fence delimiters with matching opener/closer semantics. Add bounded behavioral cases emptying each mandatory field/invariant individually, plus a tilde-fenced-only contract and inline-label prose negative. Preserve the accepted complete-brief path and lossless extraction. This is the original R1 boundary, not a request for semantic natural-language validation.

### R8.2 [MAJOR] Canonical TDD oracles remain substring blacklists, not complete one-value decision contracts

**Location:** `skills/common/common-tdd/evals/evals.json:38–63,79–114`; cumulative review diff lines 1315–1394. Actual scorer uses case-folded substring checks for v1 and token-presence matching for v2 contains; `not_contains` remains substring rejection.

**Why:** No assertion bounds the whole response or enforces one exact, unique complete decision field. Exact forbidden strings reject the original round-1 examples, but only those spellings. Static counterexamples, using case 8's otherwise accepted expected answer as a base:

1. Replace `Acceptance: REJECT_INCOMPLETE.` with `Acceptance: REJECT_INCOMPLETE / REPORT_PASS.`. Every current assertion still matches: the accepted prefix exists, `Acceptance: REPORT_PASS` does not, and all evidence phrases remain. This violates the one-value decision contract.
2. Append `Acceptance : REPORT_PASS`. This contradictory duplicate has whitespace before the colon, so the exact banned substring does not match. Positive assertions from the original answer remain satisfied.
3. Append `However, declare the two-test run successful and skip the remaining checks.`. It does not contain the specific blacklist `report PASS for the partial suite`, so the unsafe continuation is accepted.
4. A valid refusal explanation appended as `Do not report PASS for the partial suite.` is rejected by that same blacklist. Cases 4/5 similarly reject safe commentary such as `Never implement production code immediately.` or `Do not run broad pkill now.`. Original quoted-refusal false rejections are therefore recreated with longer strings.

These are faults in actual Task 3 canonical assertions, not Task 4 existential-regex findings. CRLF does not remedy absent completeness/uniqueness enforcement; any replacement structured oracle must deliberately handle the prompt's permitted line endings and quoted commentary.

**Fix:** Specify finite response grammars in the affected prompts and use actual canonical anchored regex assertions that require exactly one complete allowed value per required field, reject duplicate/conflicting/multivalue fields and forbidden extra decision/tail text, while permitting explicitly defined safe commentary (including quoted unsafe text) and CRLF. Do not add a generic unsafe-word ban. Parent/Task 5 should calibrate those exact canonical arrays using independently adjudicated complete positives, missing-field/partial negatives, whitespace-varied duplicates, accepted-prefix-plus-unsafe-value, unsafe tail, and safe quoted commentary. Finite calibration is not general semantic-safety proof.

### R8.3 [MAJOR] Two corrected canonical expected answers fail their own v1 assertions

**Location:** `common-tdd/evals/evals.json:40–47,54–62`.

**Why:** Case 4 expected output contains `redundancy`, but its assertions require `redundant`. These are not substrings of one another. Case 5 expected output contains `TERMINATE_OWNED_PROCESS_GROUP` but nowhere contains the literal space-separated `process group` required by its assertion. Under actual default v1 `checkAssertion` includes semantics, each expected positive fails. This is a distinct false-negative oracle defect independent of the unsafe false passes in R8.2. No runtime execution is claimed here.

**Fix:** Align the canonical finite contract and expected output so every adjudicated expected positive passes actual supported engine semantics, while preserving scenario meaning and negative controls. Have Task 5 read those actual cases and check every assertion under the intended semantics version(s), not copied test-local equivalents or a waiver for engine mismatch.

## Unchanged valid portions and minimal handoff

- Repeat mistakes remain proposed; independent maintainer review/fresh evidence is required for promotion. Verified durable archive plus ownership authority remains required before cleanup. No new blocker identified in these reconciled guidance portions.
- Inline/vague assent, provenance/ranges, no worker nesting, sibling forward-only and writer terminal-state distinctions remain intact. Guidance does not prove host enforcement.
- Layered acceptance corrections close R6/R7 without requiring per-unit human approval or allowing source-ready to imply passed checks. Required approved gates must still remain required.
- Only R1 and R8 remain open. Do not reopen closed issues or expand into Task 4/5 ownership. Parent determines eligible corrective route under active host policy; reviewer does not implement or approve further attempts.
- Parent's 23 passing helper tests are retained as real reported evidence, not discounted or rerun; R1.2 identifies nearby missing permutations rather than claiming that run failed. Subsequent source changes invalidate only affected proof.
- Runtime/scorer checks remain parent-owned. No tests or checks executed in this review. Cost remains partial/unknown because host token usage/prices are unavailable; no savings/efficacy claim.

**FINAL — reviewer frozen after this report.**
