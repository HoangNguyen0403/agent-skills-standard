# AC-06 Reader Kit — Independent Key Review

Reviewer: independent read-only reviewer (did not build the kit). Date: 2026-11-06.
Contract: PRD AC-06 (`docs/prd/prd-system-design-visualization-improvements.md:78`), SRS-006 / VER-006
(`docs/srs/srs-system-design-visualization-improvements.md:111-118`).
Scope read: every file in `ac06-reader-kit/` except `tests/test_scorer.py`; all 12 blinded PNGs viewed;
`.drawio` evidence-marker labels compared per arm. Nothing executed, nothing edited except this file.

## Verdict: NOT READY

Two blockers must be fixed before any reader is scored: the within-scenario reading design favours the
candidate on the time target, and the key's accept/reject semantics are undefined. Spec parity across arms
is sound (finding 15). Fix the questions and scoring first, as AC-06 requires, then refreeze
`questions.json`, `answers.json`, `arm-map.json` and the RECEIPT hashes.

## Findings

### BLOCKER

**1. The paired design rewards whichever arm is read second, and the order is unbalanced toward the
candidate.** Files: `scoring-key/arm-map.json` (`seed_method`, `presentation_order`),
`reader-protocol.md` rules 2, 3 and 9, `response-sheet.csv` row order.
- One reader answers the same four questions about the same nodes, labels and markers twice in a row
  (rule 2: "Finish all four questions for both arms of a scenario"). The second arm is a re-read from
  memory, so its time and accuracy measure carry-over, not presentation.
- Order is alternated on the letter, not the role. Because A/B roles are randomised, the candidate is read
  second in S1, S2, S5 and S6 (four of six) and first only in S3 and S4. Carry-over therefore lowers the
  candidate median systematically, which biases the ≥20% time target toward PASS.
- The visual treatment is close to nil in S1 and S6 (the arms are near pixel-identical) and small in S2.
  In those scenarios, any time gap is almost purely order effect.
- Rule 9 ("stop if you recognise a scenario's image") contradicts the design: the reader will always
  recognise the second arm.

Fix: the PO must choose one of the following before reading.
- (a) **Preferred:** use ≥2 independent readers in a counterbalanced Latin square, so each reader sees each
  scenario once. Example: reader 1 gets the candidate for S1, S3 and S5 and the baseline for S2, S4 and S6;
  reader 2 gets the inverse.
- (b) **Single reader:** split the arms into two sessions separated by a washout of at least several days.
  Session 1 gets one arm per scenario with roles balanced 3/3; session 2 gets the other arm. Compute the
  time target on session-1 reads only, or report both sessions and the order effect explicitly.

Under either option:
- Derive `presentation_order` from the role, not the letter, and balance it 3/3.
- Rewrite rule 2 and rule 9 to match the chosen design.
- Record the design choice in `README.md` "Honest limits".

**2. The key does not say whether `accept` items are all required or alternatives, and several items
require content the question does not ask for or the image does not show.** Files:
`scoring-key/answers.json` `verdict_scale.correct` ("matches the key's accepted content") and the
`accept` lists below.

The 24-answer denominator allows at most 2 non-correct answers (22/24 = 91.7%; 21/24 = 87.5% fails). That
makes this ambiguity decisive for the ≥90% target.

Items not asked by the question:
- S1 Q1 accept 2 (Fulfilment Worker as downstream consumer).
- S1 Q3 accept 2 (cache described as derived).
- S2 Q1 accept 1 (cache read/write).
- S2 Q3 accept 2 (cache size cap).
- S3 Q1 accept 2 (acquirer hop).
- S3 Q3 accept 2 (queue is a trail).
- S4 Q1 accept 1 (failover branch).
- S4 Q3 accept 2 (replication direction).
- S5 Q1 accepts 1–2.
- S5 Q3 accept 2.
- S6 Q1 accepts 1–2.
- S6 Q3 accept 2.

Items not visible in either arm:
- S1 Q3 `correct` ("its constraint states orders need transactional writes"): no constraint text is rendered.
- S1 Q3 accept 2 ("40:1 read ratio"): the image shows "40 GB working set".
- S6 Q3 `correct` ("the runtime is stateless here"): not shown.
- S6 Q3 accept 2 ("transport keeps no authoritative state"): not shown.
- S1, S2, S4, S5 Q3: nothing printed says "authoritative". The answer is an inference from shape, sublabel,
  writer/replica or TTL. That inference is acceptable, but the key must say so.

Fix:
- Split each entry into `required` (the minimal element answering the question as worded) and `credit_if`
  (optional elaboration that never downgrades). State in `verdict_scale` that a correct required element
  plus no `reject` hit = `correct`.
- Remove or rephrase every invisible fact listed above.
- Have a second person adjudicate verdicts blind to the arm map, or at minimum score with the arm column
  hidden.

### MAJOR

**3. Q1's "primary flow" has more than one defensible answer in S3, S5 and S6, and the applicability rule
justifying it is false.** Files: `questions.json` Q1 `applicability_rule` ("each has exactly one primary
flow named in its scope line"), `answers.json` Q1 for S1, S3, S5 and S6.
- **S1:** the scope ("Deployable units … and the stores they own") names no flow.
- **S3:** the scope names no flow. Ending at "External Payment Settlement and Acquiring Bank Network" (an
  external system that the Q1 text explicitly allows as a terminus) is as defensible as ending at the ledger.
- **S5:** the scope says "consumed, deduplicated and retried", so a reader may legitimately place the
  Idempotency Key Store on the path. The key treats it as a side check, but no `reject` covers it, so the
  verdict is operator discretion. Partner Settlement API is also a defensible terminus (external system).
- **S6:** the scope says "reaches the agent daemon", which supports ending at Agent Daemon. The key ends at
  Inference Runtime, which is neither a store, an external system nor an end state.

Fix: either name the primary flow's entry and intent in the question per scenario (for example "the
checkout-order write path"), or list every defensible terminus in the key's `required` alternatives. Correct
or delete the false applicability-rule sentence.

**4. The timer definition contradicts itself.**
- `reader-protocol.md` rule 5 ("Start when the image first appears. Stop when you write your final answer for
  that question") produces cumulative times: Q4 includes Q1–Q3.
- `README.md` "Honest limits" and `RECEIPT.md` risk 4 describe per-question times.

The median target depends on which is used. Fix: define one measure explicitly, for example "per question:
start when you begin reading the question text, stop when the answer is written". Add an operator-recorded
per-image total as a cross-check, and state the measure in `run-metadata.json`.

**5. Boundary scoring strictness is inconsistent across scenarios.**
- `questions.json` Q2 `scoring_note` requires "the outside set is complete".
- `answers.json` S5 Q2 accept 2 accepts "At least the Settlement Worker named as outside", although the
  outside set has five members.
- S1 Q2 accept 1 requires "at least its five members", while the note says "principal members".

Fix: apply one rule to all six scenarios. Either the outside set is complete everywhere, or the key lists
named principal members per boundary and a minimum outside set per scenario.

**6. Malformed free-text rows crash the scorer with exit code 1, which collides with FAIL.**
File: `scorer.py` `load_sheet`. A data row with more fields than the header is a likely case: an unquoted
list answer such as `Storefront, Order API, Orders DB` typed in a text editor.
- `csv.DictReader` stores the extra fields under key `None`.
- `k.strip()` then raises `AttributeError`, which is uncaught.
- Python exits 1, which the README documents as "FAIL (a target missed)".

Fix: reject `None` keys or extra fields as `SheetError` (exit 2), and wrap `main` so that any unexpected
exception maps to exit 2. Tell the protocol to quote answers, or to separate list items with `->` or `;`.

**7. The "no semantic/evidence regression" rule depends on single-reader answer noise.**
- `scorer.py` `regressions()` operationalises the target as "correct on baseline, not correct on candidate"
  per question. One slip on the candidate fails AC-06 even when the rendering is semantically identical.
- Conversely, a real evidence regression in the rendering that the reader misses on both arms passes.
- The PRD wording is about the presentation not regressing semantics or evidence. The kit never records a
  render-level parity check.

Fix (PO decision):
- Make the regression target a two-part check: (i) render parity of node, edge, group and evidence-marker
  labels between the arms' `.drawio` files, recorded as evidence; (ii) answer regressions reported and
  adjudicated, not auto-failing.
- Or keep the auto-fail and state that choice in the README.

Either way, write the rule into `answers.json.targets`.

### MINOR

**8. Hand-out hygiene.**
- The role-named `images/<scenario>-baseline|candidate.png` files sit beside `images/blinded/`. Their bytes
  and sizes map A/B to roles one-to-one (`RECEIPT.md` rows 71–94).
- `README.md` step 1 omits `response-sheet.csv` from the hand-out, but `reader-protocol.md` "What you
  receive" lists it.

Fix: build a separate hand-out directory containing only `blinded/*.png`, `questions.json`,
`reader-protocol.md` and `response-sheet.csv`, and record its hash.

**9. Protocol wording discloses the arm roles' existence and the key's location.**
`reader-protocol.md` lines 57–68 name `scoring-key/answers.json` and `scoring-key/arm-map.json` and speak of
"the baseline arm" and "the candidate arm". Fix: move the "After the session" section to an operator-only
document. Reader text should say "two presentations" only.

**10. The candidate arm is visibly identifiable, which is inherent but should be recorded.**
- In five of six scenarios the candidate PNG is taller: S2 1510 vs 1442; S3 3704 vs 2574; S4 2124×2586 vs
  2064×2286; S5 2616 vs 2258; S6 2368 vs 2354. S1 dimensions are equal.
- The baseline arms show clipping or collisions: the S3 hub title and metric are clipped, and the S2
  Artifact Registry metric overflows.

A reader can guess which arm is "new" without any label. This cannot be fully blinded, so record it as a
limit in the README and reader-comparison.

**11. `questions.json` applicability rules hint at the key.** The Q2 rule ("every scenario has nodes inside
and outside them") tells the reader that the outside set is never empty. Fix: move the applicability
rationale to the key and keep only the question text and answer convention in reader material.

**12. Scorer edge cases.**
- `float()` accepts `nan`, `inf` and fractional values. `nan <= 0` is False, so NaN passes and corrupts
  `statistics.median`. Fix: require a finite positive integer, matching the protocol's "whole seconds".
- Multiple `reader` values pass the coverage check and are pooled into one arm, while `verdicts_by_question`
  overwrites per reader. Fix: require exactly one distinct reader, equal to `metadata.reader_id`, or score
  per reader.
- A non-dict metadata JSON raises an uncaught `AttributeError`.
- If every question is non-applicable, the scorer exits 2 ("no applicable … timings") rather than reporting
  PENDING. This is acceptable, but document it.

These behave correctly:
- The correctness denominator counts applicable rows only.
- `partial` counts as not correct and is reported separately.
- `statistics.median` averages the two middle values for the even count of 24, and ties are harmless.
- Zero or negative seconds are refused.
- A missing metadata file, `is_implementation_author` absent or truthy, or an empty `reader_id` each yield
  PENDING (fail-safe).
- The time change is `(base_median − cand_median) / base_median`, matching "≥20% lower median".

**13. The protocol claims a check that the scorer does not perform.** `reader-protocol.md` line 8 says "the
scorer treats a missing or false declaration as PENDING", but `scorer.py` never reads the `notes`
declaration; only the metadata flag is checked. Fix: either check for the declaration text in the first row
or reword the protocol.

**14. Configuration and the time window are not enforced.** AC-06 requires recording configuration and
achieving the targets "within 30 days after implementation begins". `run_is_comparable` validates only
`reader_id` and the author flag. Fix: require `date`, `screen`, `zoom` and `theme` plus an
`implementation_start` date in metadata, and report out-of-window as FAIL or PENDING, per a PO decision.

**15. Fairness confirmed, with two notes.**
- Both arms of every scenario are rendered from the same `specs/*.spec.json` (README commands, RECEIPT
  rows 27–30).
- Evidence-marker labels (`[proposed · unverified]`, `[implemented · assumed]`, `⚠ UNVERIFIED`) are
  identical across arms in the S2–S6 `.drawio` files. S1 carries none in either arm.
- Visual inspection found the same nodes, groups, edge labels and markers in both arms of all six scenarios.
- No content confound was found.
- Note (a): the S1 copy asserts `implemented`/`documented|observed` provenance that the source fixture did
  not carry. Disclose in reader-comparison that S1's "none marked" answer is a property of the kit copy.
- Note (b): pre-freeze spec edits for S2, S4 and S5 removed the hard cross-row and edge-through-node layouts
  (the CDN hop and the `ci -> registry` edge were dropped; partner_api was moved). This narrows the
  difficulty that AC-02 and AC-06 target, and should be recorded as a scenario-selection limit.

## What I could not check

- Whether the six specs are the "approved scenarios" that SRS-006 requires. No approval record was named in
  the brief.
- PNG SHA-256 values and the re-export claim. Nothing was executed; sizes were consistent with the RECEIPT
  only.
- Full `.drawio` structural parity beyond the evidence-marker labels. The grep showed the first match per
  file, and parity of other labels was checked visually only.
- Legibility at true 100% on the reader's screen: images were viewed downscaled (~1568 px wide).
- `tests/test_scorer.py` (not read) and any scorer runtime behaviour. The analysis above is from source only.
- Reader independence, the draw.io build used, and whether operator verdict scoring will be blinded.
