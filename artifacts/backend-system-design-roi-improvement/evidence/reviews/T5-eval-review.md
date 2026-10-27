# T5 package-eval and lexical-matrix review

## Verdict: CHANGES REQUESTED — L1/L2 separation is stated correctly in the pilot but contradicted by the report, and three lexical-gate defects remain

Read-only review of the four bound `evals.json` files, the prepared (unexecuted) matrix script, `T5-report.md` and `backend-system-design-roi-pilot.md`, against plan §5 T5, AC-ROI-12..14, the existing scorer (`scripts/evals/scorer.ts:172-204`) and `system-design/system-design-review/references/semantic-evaluation.md`. Loaded rules (MCP audit run): `common-code-review`, `common-security-audit`, `common-llm-security`, `specialist-architecture-guard`, `system-design-principles`, plus file-routing authoring rules; the generic product-management warning is not applicable. No scorer, build, test, lint, formatter, generator or model run. L1 and L2 remain unmeasured; L3 remains unavailable.

## Binding (independently recomputed)

| Artifact | Live SHA-256 | Owner receipt |
| --- | --- | --- |
| `system-design-building-blocks/evals/evals.json` | `f289eb9e22334f08de2f383bb9b08666985eacfd6312aa842648696a1d069e6f` | match |
| `system-design-resilience-ops/evals/evals.json` | `8156e8d17da9e3f2b34ec834be7154cb0ae2fa246c70f84c940092acc04363b8` | match |
| `system-design-data-architecture/evals/evals.json` | `f423bd960bace40726c4ae212fd70a7c5e50b7f6abb275d90312ce64323bc4e0` | match |
| `system-design-integration-patterns/evals/evals.json` | `a0d7560608aaf15bf1233a310c9dcf29bfb163a3404aa446795e37520a7f8b69` | match |
| `T5/lexical-candidate-matrix.ts` | `476b9aaad85c96d5fbe924150509e12eb440313a61f621a7d18baaaade1badc9` | match, prepared/unexecuted |
| `T5-report.md` reviewed claim set | current file, 2026-10-26 | source/eval/packet digests above match its §1–§2 |

Structural facts I re-derived: 34 evals / 93 assertions across the four packages (BB 6/20, RO 8/21, DA 15/35, IP 5/17); baseline 29/72, so +5 evals / +21 assertions; the two `not_contains` assertions in the changed sets are single strings (BB `:123-125`, IP `:125-127`), not arrays. The two replaced/added IP eval IDs (2, 5) and the single added IDs BB 5/6, RO 8, DA 15 match the report.

## 1. [MAJOR] E1 — report claims L1 proves paraphrase acceptance and uniform negation guards; both are false

Evidence:
- `T5-report.md:72-75` (AC-ROI-13 bullet): "every new eval's `contains_any` values come from its own expected-output contract, so a paraphrase that states the same decision is not rejected for absent phrases."
- Direct contradiction in the same report, `:62-64`: "the package evals are calibrated lexical gates only; soundness is decided by the sealed rubric … never by these assertions."
- `T5-report.md:68-70` (AC-ROI-12 bullet): "each new eval carries a negation-guarded overclaim rejection." False: DA eval 15 (`evals.json:219-223`) has four `contains_any` assertions and no guard; IP eval 2's guard (`:66`) is not negation-guarded (see E3).
- `backend-system-design-roi-pilot.md:169-172`: "each overclaim guard is a negation-guarded `regex` so an answer that denies the overclaim is not rejected."

Why: the scorer is substring-based for `contains_any` (`scripts/evals/scorer.ts:184-193`), so a genuinely equivalent paraphrase that omits the quoted tokens fails L1 by construction. Anchoring proves lexical grounding of the expected-output contract; it cannot prove paraphrase acceptance. AC-ROI-13 is defined for grading, and the pilot correctly assigns it to L2 (`pilot.md:103-107`). The report's inference would let T6 treat an L1 pass as AC-13 evidence, which is exactly the lane conflation the contract forbids.

Violated contract: review-contract lane separation; plan T5 step 3 ("keep lexical … distinct from semantic grading"); AC-ROI-13 must be measured by semantic grading, not lexical anchoring.

Bounded repair: in `T5-report.md:72-75`, state that `contains_any` anchors are L1 lexical grounding only and that a correct paraphrase without those tokens can fail L1; state that paraphrase acceptance is L2/AC-13 and remains unmeasured. In `:68-70`, drop the uniform-guard claim or scope it to the evals that have a guard. In `pilot.md:169-172`, either qualify the denial-safety claim to the "not/never" adjacency it actually implements, or repair the guards (E3). Do not change the scorer or add assertion types.

## 2. [MAJOR] E2 — BB eval 5 assertion can be satisfied by the opposite claim

Evidence: `system-design-building-blocks/evals/evals.json:152-156` — `contains_any` = `["Shedding beats silent growth", "finite"]`, described as "Rejects unbounded growth and unbounded buffering." The scorer lowercases and substring-matches, so `"infinite"` contains `"finite"`. An answer that says "buffers grow to an infinite size" passes this assertion; the paired guard (`:159-161`) only rejects the literal phrases "unbounded buffer", "buffer without limit", "buffer forever", so it does not fire on "infinite". The first alternative is expected-output slogan text with little else behind it.

Why: this is the same defect class reviewer A recorded as fixed (an assertion satisfiable by the opposite statement). It does not award semantic soundness — L1 never does — but it makes the eval's own claim false and adds an anchor that behaves as padding.

Adversarial trace (text inspection only): an answer containing "buffers can be infinite" plus "backpressure at the producer" would pass all four BB-5 assertions, because nothing requires a finite bound in the wording the scorer inspects.

Violated contract: T5 step 3 (reject answer-anchor padding); package quality rule that a guard must not be satisfiable by the claim it rejects. Not an AC-ROI-12 failure, since soundness is L2.

Bounded repair: replace the `contains_any` with a word-boundary regex or substantive phrase that cannot match inside "infinite" (for example `\b(finite (buffer|bound)|bounded (buffer|memory)|hard limit)\b` with a negation guard), and keep the existing guard. Recompute no other assertion.

## 3. [MAJOR] E3 — overclaim guards reject correct denials; one guard is not negation-guarded at all

Evidence:
- `system-design-integration-patterns/evals/evals.json:66`: `\bpast\s+(4|four)\s+steps\b|\bevery\s+(saga\s+)?step\s+(needs|requires)\b…compensation`. No lookbehind. A correct answer that explains "the retired 'past four steps' cutoff no longer applies" or "not every step needs compensation" matches and fails. This is the only guard in the changed sets with no negation protection, and it is the eval that replaced the retired rule — the most likely place for a correct answer to quote it.
- `system-design-resilience-ops/evals/evals.json:160`: `(?<!not )(?<!never )(?<!is not )\bhighly available\b`. A correct answer saying "three replicas do not make us highly available" has "highly available" preceded by "us ", not "not ", so it matches and fails.
- Same adjacency limitation: BB `:160` ("no unbounded buffer" is not guarded), BB `:196` ("no globally exact total" is not guarded), IP `:162` ("cannot claim exactly-once across systems" is not guarded).
- Matrix provisional gates repeat it: `T5/lexical-candidate-matrix.ts:92,116,140,145` guard only `not`/`never` (and `no` for one), so "there is no exactly-once end to end", "we do not filter post-retrieval", "cannot be unlimited" and "no highly available claim" fail their own guards.

Why: `pilot.md:186-189` states the design rule the guards violate — "a bare phrase rejects an answer that correctly denies the overclaim". English denial is not limited to the "not/never" adjacency the lookbehinds cover. L1 is lexical smoke, but a guard whose purpose is denial-safety and which fails the common denial forms is worse than no guard: it produces false negatives that a later reader may mistake for signal.

Violated contract: pilot's own guard rule; T5 step 3; AC-ROI-13 remains an L2 responsibility, so this is an eval-quality defect, not an AC-12 violation.

Bounded repair: make each guard match an affirmative claim construction rather than ban a phrase (for example require a claim verb: `\b(is|are|remains|provides?|gives?)\b[^.]{0,40}\bhighly available\b` with explicit negated forms excluded), or drop the guard where it cannot be made denial-safe and let L2 own the rejection. For IP eval 2, require the affirmative use of the retired rule ("use/apply/keep … past 4 steps", "every step must/needs compensation") instead of matching any mention. Keep one assertion per qualification; do not add types.

## 4. Nonblocking observations

- Anchor provenance is otherwise accurate: every `contains_any` value in the changed evals is a verbatim substring of that eval's `expected_output`, and the new prompts are answerable from the stated scenario; `contains_any` alternatives avoid requiring absent material. No collapsed disjunction remains in the changed assertions.
- "No assertion pins incidental wording" (`pilot.md:169-170`) is too absolute: `"Shedding beats silent growth"` is rhetorical expected-output text, not a contract property. Provenance is fine; discriminative value is low.
- `DA eval 15` has no overclaim guard and does not need one for the current negatives, but the report's uniformity claim (E1) must be corrected regardless.
- The preparation's own lane check (`pilot.md:103-107`) is correct: hard failure overrides phrase counts, and the 4-of-5 evidence tolerance applies only to base/adverse items with variant items duplicated as hard failures.
- Old removed rules are not re-pinned: IP eval 2 rejects the fixed step-count and universal-compensation rule and selects coordination from visibility/ownership/coupling/recovery; the stale step-count assertions are gone from that eval.
- Historical preservation spot checks pass (five artifacts), and no run/transcript/root report was touched by T5.

## 5. Prepared matrix review

- It uses the nine calibration answers from the packet as candidate text and the real `checkAssertion` from `scripts/evals/scorer.ts`; it computes Lane A denominators from the run instead of a fixed 29, and Lane B returns exit 1 on a mismatch. The prior dead-array `not_contains` and wrong-denominator defects are not present.
- Manual trace of Lane B (not executed) reproduces all nine expected verdicts: PAY-C1 fails the exactly-once guard; PAY-C3 fails the unresolved-state assertion; TEN-C1 fails identity and post-retrieval; TEN-C3 fails identity; OVL-C1 fails the HA/unlimited/`no fixed cap` guards; OVL-C3 fails the unlimited guard; the three positives pass.
- Limits: Lane B is thin — most of its assertions are satisfied by unsafe and safe candidates alike, so discrimination rests mainly on the fragile guards in E3. Lane A's family map still points payment answers at IP eval 2, which now tests coordination, not payment unknown outcome, so even its informational tally is stale. Neither lane is evidence of assertion quality or of semantic soundness; both remain correctly reserved to T6 and must be reported as lexical smoke only.
- Lane A must never be used to claim that an eval "rejects" or "accepts" unsafe answers.

## 6. AC status at the bound hashes

- **AC-ROI-12** — not satisfied. The rubric's six negative labels are independently confirmed (see `T5-rubric-rereview.md`) and the L1 gate is explicitly not soundness, but no semantic grading has run. The report's "Not satisfied" is correct.
- **AC-ROI-13** — not satisfied, and the report's stated reason must be corrected (E1). Two positives are independently sound; the overload positive needs the clause repair recorded in `T5-rubric-rereview.md`. Paraphrase acceptance remains an L2 property with no run.
- **AC-ROI-14** — satisfied for this step by spot checks plus preserved review bytes; exhaustive archive verification stays T6.

## Evidence limits

No edits to source, packet, evals, pilot, report or matrix; only this report and `T5-rubric-rereview.md` were written. No scorer, build, test, lint, formatter, generator or model execution. All assertion behaviour claims are from reading `scripts/evals/scorer.ts:172-204` and the assertion text, not from running the matrix. No efficacy, ROI or acceptance claim; L3 remains unavailable and human acceptance is separate.
