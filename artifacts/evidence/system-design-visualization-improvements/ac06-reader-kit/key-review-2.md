# AC-06 Reader Kit — Independent Re-review

Reviewer: independent read-only reviewer, did not build or correct the kit. Date: 2026-11-06.
Contract: PRD AC-06 (`docs/prd/prd-system-design-visualization-improvements.md:78`), SRS-006 / VER-006
(`docs/srs/srs-system-design-visualization-improvements.md:111-118`). Prior review: `key-review.md`.

Scope read: every kit file, including `tests/test_scorer.py`, `arm_parity_check.py` and `parity-report.json`.
All 12 reader PNGs (`images/reader/session{1,2}/S1..S6.png`) were viewed. Nothing was edited except this
file. Neither the scorer nor the tests were executed.

Commands run (read-only):
- `shasum -a 256` over every kit file. Results:
  - The 12 reader PNGs match the frozen arm PNGs named in `arm-map.json` byte for byte.
  - `answers.json.frozen_hashes` matches `questions.json`, `arm-map.json` and the six specs.
  - Every `RECEIPT.md` file hash matches.
- `sips` for the PNG dimensions.
- A `python3 -c` hashlib one-liner to reproduce the seeded draw and the session orders.

## Verdict: NOT READY

The washout design, role balance, image mapping, timer definition and CSV hardening are fixed. One new
blocker remains: the kit's own run instructions hand the reader their session-1 answers at session 2, which
defeats the washout. Four majors keep the key and scorer from producing a contract-faithful verdict. All of
the fixes are small and procedural or textual. After fixing, refreeze `answers.json`, `arm-map.json` (if
touched) and the RECEIPT hashes.

## Prior findings

| # | Sev | Status | Evidence |
|---|---|---|---|
| 1 | BLOCKER | RESOLVED; superseded by new B1 | See "Finding 1 details" below. |
| 2 | BLOCKER | PARTIAL | See "Finding 2 details" below. |
| 3 | MAJOR | PARTIAL | See "Finding 3 details" below. |
| 4 | MAJOR | RESOLVED | Per-question timing is defined identically in four places: protocol rule 4 and per-question step 2, README "Measurement definitions", `answers.json.targets.interpretation_time`, and the `scorer.py` docstring and `summarise()`. The per-scenario-arm total is the sum of the 4 applicable question times; the arm figure is `statistics.median` of the six totals. Residual: new m5. |
| 5 | MAJOR | RESOLVED | Every scenario's Q2 `required` names all boundary members plus a complete outside set ("named or counted"). `verdict_scale.q2_completeness` states one rule for all six. Every member was checked visible in both arms of every scenario. |
| 6 | MAJOR | RESOLVED | `load_sheet` uses `csv.reader` and rejects any field-count mismatch as `SheetError` (exit 2). `main` maps any `Exception` to exit 2. Covered by the test `test_reject_unquoted_comma_in_answer`. Residual: m10. |
| 7 | MAJOR | RESOLVED (PO decision recorded) | The strict rule is written in `answers.json.targets.regression_rule` and the README. `arm_parity_check.py` was added. Its S3 "difference" is a tool artefact (new m1). |
| 8 | MINOR | PARTIAL | Neutral `images/reader/sessionN/` hand-out exists, and the role-named PNGs are documented. Two residuals: the shared sheet (new B1), and the protocol says the reader receives both folders (new m4). |
| 9 | MINOR | RESOLVED | `reader-protocol.md` never says baseline/candidate and never names `scoring-key/*`. It says "two presentations". |
| 10 | MINOR | RESOLVED (documented) | README "Honest limits" records the geometry tell. The pixel sizes were re-measured with `sips` and match. |
| 11 | MINOR | PARTIAL | The Q2 rule no longer says the outside set is non-empty. Reader-facing `questions.json` still ships `scoring_note` hints (new m6). |
| 12 | MINOR | RESOLVED | `parse_seconds` rejects NaN, inf, ≤0 and fractional values. Exactly one reader is required and must equal `metadata.reader_id`. Non-object JSON raises `SheetError`. The all-non-applicable case exits 2 and is documented. |
| 13 | MINOR | RESOLVED | The protocol no longer claims the scorer inspects `notes`. |
| 14 | MINOR | PARTIAL, raised to MAJOR | See new M4. |
| 15 | NOTE | RESOLVED | The S1 provenance note and the S2/S4/S5 simplifications are recorded in README "Honest limits". |

### Finding 1 details (RESOLVED; superseded by new B1)

- Balance:
  - Session 1 has baseline arms for S2, S3 and S5 and candidate arms for S1, S4 and S6.
  - Session 2 has the opposite arm for every scenario.
  - That gives 3 + 3 in each session. `check_arm_map` also enforces this.
- Hashes match the map for every reader file. For example, `session1/S1.png` is `0bd06d51…`, the same as
  `S1-…-candidate.png`, and `session2/S1.png` is `d9c6007a…`, the same as `S1-…-baseline.png`. The same holds
  for all 12 files.
- No role appears in reader paths, file names, sheet columns or protocol text.
- The scorer:
  - rejects a start-to-start gap under 48 h (`MIN_GAP`);
  - requires both sessions and all 4 questions for every scenario × session;
  - rejects an arm map that uses the same arm twice.
- The seeded session orders reproduce exactly.
- Within-session position is roughly balanced: mean position 3.33 for the candidate and 3.67 for the
  baseline.

### Finding 2 details (PARTIAL)

Fixed:
- Every item is split into `required`, `optional` and `reject`.
- `verdict_scale.correct` is unambiguous.
- The invisible facts are gone: S1 Q3 constraint and 40:1 ratio, and S6 Q3 "stateless".
- `inference` notes are present.
- Every `required` item was checked visible in both arms of all six scenarios. The S3 `edge_proxy` label is
  not referenced by any required item.

Still open:
- Required items still go beyond the question wording or are inconsistent across scenarios (M2).
- S6 Q1 contradicts itself (M1).
- Adjudication is not arm-blind by construction (M3).

### Finding 3 details (PARTIAL)

Fixed:
- Q1 now defines the terminus and allows a bracketed alternative.
- `accepted_terminals` is set for S3 (ledger or acquirer) and S5 (Ledger DB or Partner Settlement API).
- The false applicability sentence was replaced.

Still open:
- The S6 terminal rule is self-contradictory (M1).
- S1 still has a single accepted terminal although the scope line names no flow (m9).

## New findings

### BLOCKER

**B1. At session 2 the reader is handed the sheet that holds their session-1 answers, which defeats the
washout.**
- Where:
  - `README.md` "Run it" step 3: "give the same reader `images/reader/session2/` and the same three files,
    and have them fill the session-2 rows".
  - `response-sheet.csv` is a single 48-row file.
  - Protocol rule 2 forbids revisiting session-1 *images* but not session-1 *answers*.
- Effect: every session-2 scenario is the other arm of a scenario whose full answer sits in rows 2–25 of the
  same file. A reader filling the CSV in a spreadsheet sees those rows by default. Copying or consulting them:
  - raises session-2 correctness;
  - shortens session-2 times;
  - makes the per-question regression check compare an answer with a copy of itself, in 6 of 6 scenarios.
- The scorer cannot detect this. The README's own procedure makes it likely, not merely possible.
- Fix:
  1. Split the sheet into `response-sheet-session1.csv` (rows 2–25) and `response-sheet-session2.csv`
     (rows 26–49), each with the same header.
  2. The operator collects the session-1 sheet at the end of session 1 and never returns it.
  3. Concatenate the two sheets before scoring. The scorer needs no change.
  4. Add protocol rule: "Do not keep, photograph or consult your session-1 answers."
  5. Update README step 3 and RECEIPT.

### MAJOR

**M1. S6 Q1 is self-contradictory on the terminal node.**
- `verdict_scale.q1_terminals` says Q1 is correct only if the path "ends at one of the nodes listed in
  `accepted_terminals`", and S6 lists only `["Agent Daemon"]`.
- S6 `terminal_note` and `optional` say that naming Inference Runtime as a further hop is "never required, and
  never a reject".
- The path Host Application → Client SDK → IPC Transport → Agent Daemon → Inference Runtime is clearly drawn
  ("Spawns and streams / stdio") in both arms. It is therefore incorrect under one rule and correct under
  the other.
- With a margin of 2 non-correct answers out of 24 and a single-question regression rule, the operator's
  choice decides the outcome.
- Fix: amend `q1_terminals` to "ends at an accepted terminal, or continues past it only through nodes the
  scenario lists as optional further hops". Alternatively, add `Inference Runtime` to S6
  `accepted_terminals`.

**M2. Required items still exceed the question, and Q4 strictness differs across scenarios.** This is the
same class of defect as prior findings 2 and 5.
- S4 Q3 `required[1]`, "Aurora replica named as the Global Database secondary": Q3 asks only "which node
  holds the authoritative state". Under `verdict_scale.correct` ("every required item is present"), the
  answer "Aurora writer" is not correct.
- S4, S5 and S6 Q4 require a "Statement that no other node or edge carries the marker". S2 and S3 Q4 do not.
  Q4 says "List them". A complete bare list ("IPC Transport") is `correct` in S2/S3-style scoring but missing
  a required item in S4/S5/S6.
- Fix:
  - Move S4 Q3 `required[1]` to `optional`.
  - For Q4, either drop the "no other" item from S4/S5/S6 `required`, or add a `verdict_scale.q4_exhaustive`
    rule that a list is read as exhaustive. Apply one rule to all six scenarios.

**M3. Verdict adjudication is not arm-blind by construction.**
- README step 4 has the operator who holds `arm-map.json` add `verdict` and, if wanted, `arm_hidden_id`.
- The `session` column plus the arm map reveals the arm for every row. Hiding `arm_hidden_id` therefore
  blinds nothing.
- README says only "ideally score with `arm_hidden_id` hidden", and RECEIPT lists the blind second
  adjudication as NOT RUN.
- Under the strict per-question regression rule, one borderline `correct`/`partial` call on a candidate row
  fails AC-06. An unblinded adjudicator directly controls the result.
- Fix: the operator exports the rows to the adjudicator without `session`, `session_started_utc`,
  `arm_hidden_id` or `seconds`, in shuffled order, with a row token. The adjudicator has no arm-map access.
  The operator re-merges the verdicts by token. Write this into README step 4 and record who adjudicated in
  `run-metadata.json`.

**M4. The PRD/SRS timebox and configuration are not enforced, yet the scorer can exit 0 PASS.**
- In `run_is_comparable`, `implementation_start` is optional (`if start:`). Without it, no window check runs.
  `test_pass_when_targets_met` passes metadata with no `implementation_start` and expects PASS, which pins
  the gap.
- When `implementation_start` is supplied, only the *first* session is checked (`min(...)` in `main`).
  `answers.json.targets.window` says "both sessions must start within 30 days".
- Sessions that start *before* `implementation_start` (negative delta) are accepted.
- `date`, `screen`, `zoom` and `theme` are requested in the README template but never checked. AC-06 says
  "Record … configuration"; SRS-006 says "carry the PRD metric/timebox unchanged".
- Fix:
  - Missing `implementation_start` or missing/empty configuration fields → PENDING (exit 3).
  - Check `max(session starts) <= implementation_start + 30 d` and `min(session starts) >= implementation_start`.
  - Add tests for the missing field, the session-2-only overrun and the negative delta.

### MINOR

**m1. The parity tool reports a false S3 difference, and README, RECEIPT and `parity-report.json` repeat
it.**
- Both `.drawio` sources carry the identical text `p99 < 15ms · measured · measured`. The only difference is
  escaping:
  - the baseline has an attribute-level `&lt;`, i.e. a raw `<` inside the HTML label;
  - the candidate has `&amp;lt;`, i.e. correctly escaped.
- `normalise()` unescapes first and then applies `TAG = <[^>]+>`. In the baseline, that regex deletes
  everything from `< 15ms` through `</font>`.
- Both PNGs visibly print `p99 < 15ms · measured · measured` (session1/S3 = baseline, session2/S3 =
  candidate). The claim "baseline prints `p99`" (README "Honest limits", RECEIPT §Parity and risk 7) is
  false.
- The same flaw would hide any real difference that follows a raw `<` in the baseline. Only S3 contains a
  `<`.
- Is it a confound? No. No question or required item touches the metric, the visible text is identical in
  both arms, and the time cost is identical.
- Fix:
  - Strip tags with `html.parser.HTMLParser` (collect data only), or compare the single-unescaped attribute
    text without regex tag removal.
  - Re-run and expect 6/6 identical.
  - Correct the README and RECEIPT text.

**m2. The duplicated "measured · measured" in S3 is a real content defect, but it is shared by both arms.**
- S3 spec `edge_proxy.metric` is already `"p99 < 15ms · measured"`, and the renderer appends
  `metric_provenance: "measured"`. Both arms render the duplicate, as confirmed in both `.drawio` files and
  both PNGs.
- It is not a candidate regression and not a confound. It is worth recording, because the source fixture
  (`long-label-hub.spec.json`, "copied unchanged") carries the defect.
- It may also merit a renderer-side guard against a provenance suffix the metric already contains. That is
  outside this kit's scope.
- Fix: record it in README "Honest limits" as a shared S3 label defect. Do not change the spec after
  freezing.

**m3. The gap check uses `abs()`.** If session 2 is stamped before session 1 by ≥48 h, the sheet is
accepted, so a swapped hand-out or a swapped label passes silently. Fix: require
`stamp2 - stamp1 >= 48 h`.

**m4. The protocol says the reader receives both folders.** "What you receive: Two session folders" conflicts
with README, which hands them out separately. A reader handed both at session 1 can preview session 2. Fix:
"You receive only the folder for the current session."

**m5. Orientation time is unspecified.** The protocol never says when the image is opened relative to Q1's
timer, so a reader can study the image untimed before starting Q1. This affects both arms but blunts exactly
the effect being measured. Fix: "Start Q1's timer, then open the image."

**m6. Reader-facing `questions.json` carries scoring hints.** Examples:
- Q3 `scoring_note`: "A cache, queue or derived copy is not authoritative".
- Q2: "or its size is given explicitly".
- The `applicability_rule` texts.

This is coaching relative to AC-06's "without coaching", and it inflates absolute correctness in both arms.
Fix: ship a reader copy with only `id`, `text`, `answer_type` and `answer_convention`. Keep the full file
operator-side and hash both.

**m7. Q4 does not adjudicate metric provenance words.** "estimated" and "target" appear on CI Runner (S2),
Route 53 and replication (S4), Settlement Worker (S5) and Inference Runtime (S6). A reader may list them as
"assumed". Fix: add to each Q4 `reject` or a `verdict_scale` note that metric-provenance words are not
uncertainty markers. Alternatively, accept them as optional noise; but decide one way.

**m8. S6 Q3 does not adjudicate a justified "absent" answer.** For example: "absent for the request flow;
Session Store holds session state". The Q3 text explicitly invites such answers, but the `reject` list covers
only "no state at all". Fix: state whether that answer is correct or incorrect.

**m9. S1 Q1 accepts only Orders DB**, although Order API fans out to Orders DB (SQL), Catalogue Cache (GET)
and Order Events (publish), and the scope names no flow. Fix: accept a bracketed alternative as harmless, or
justify the single terminal in a `terminal_note`.

**m10. Scorer residuals.**
- `args.json.write_text` and `print(render(...))` run outside the `try`. An `OSError` there exits 1, which
  collides with FAIL.
- A spreadsheet-saved UTF-8 BOM makes the first header cell `\ufeffsession`, so the sheet is rejected. That
  is safe but avoidable: use `encoding="utf-8-sig"`.
- `1e3` is accepted as seconds.

**m11. Test gaps.** No tests cover:
- zero, negative or inf seconds;
- a reversed session order (m3);
- a missing `implementation_start`, or a session-2-only window overrun (M4);
- an even median with distinct values;
- a baseline-partial/candidate-correct non-regression;
- an unbalanced or same-arm arm map;
- two start times within one session;
- an unknown scenario;
- the unexpected-exception → exit 2 path.

**m12. The documented arm draw does not reproduce the map's letters.**
- `seed_method.arm_draw` says the session-1 arm is A when n is even.
- Reproduced n is odd for S1, S2, S4 and S6, giving session-1 arm B. The map shows A in session 1 for all
  six scenarios.
- The role outcome does match (odd → candidate first, then the S2 flip), but the letter→role rule is
  undocumented.
- Fix: document the rule as "session-1 role = baseline if n even, else candidate; letters relabelled so
  A = session 1".

**m13. README "Honest limits", first bullet**: "A second reader would be a better design; the maintainer
supplied one" is ambiguous; it reads as if a second reader exists. Fix the wording.

## Scorer behaviour checked from source (item 4)

| Behaviour | Result |
|---|---|
| Exit codes | 0 PASS / 1 FAIL / 3 PENDING come from `report["status"]`. 2 is returned for every `SheetError` and unexpected exception inside the `try`. Exception: m10. |
| 48 h gap | Enforced start-to-start with `abs()` (m3). |
| Author-reader refusal | A truthy or absent `is_implementation_author` → PENDING (exit 3). A `reader_id` mismatch → exit 2. |
| Partial answers | `partial` counts as not correct and is reported separately. |
| Regression rule | Baseline `correct` and candidate not `correct`, per (scenario, question) → listed, and `no_regression` is missed → FAIL. |
| Ties and even medians | The median of 6 totals is the mean of the 3rd and 4th values; ties are harmless. Thresholds are inclusive (`>=`): 22/24 = 91.7% passes and 21/24 = 87.5% fails. |
| Zero-time rows | Rejected (exit 2). |
| Arm completeness | Every scenario × session × question is required. Duplicates are rejected. Applicability cannot contradict the key. |

Test coverage: every rejection named in the RECEIPT has a test, except the gaps in m11.

## Could not check

- Runtime behaviour of `scorer.py`, `arm_parity_check.py` and the tests. They were read, not run, per the
  brief.
- Legibility at a true 100% zoom on the reader's screen. Images were viewed downscaled (about 1220–1570 px
  wide).
- Whether the six specs are the "approved scenarios" required by SRS-006. No approval record was named.
- Whether draw.io Desktop 31.5.3 renders the baseline's raw `<` identically on other builds. Today's PNGs
  show it correctly.
- Full `.drawio` structural parity beyond the parity tool's output (affected by m1) and visual inspection.
- Reader independence, real timestamps and the operator's hand-out discipline. These are declared, not
  verifiable.
