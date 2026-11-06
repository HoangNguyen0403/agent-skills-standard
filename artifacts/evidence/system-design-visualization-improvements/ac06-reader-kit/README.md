# AC-06 Reader Kit — Baseline/Candidate Architecture Reading (two blind sessions)

Preparation kit for AC-06 (`docs/prd/prd-system-design-visualization-improvements.md`, VER-006):
one human reader compares two renderings of the same six diagrams over two sessions at least
48 hours apart, answering four fixed questions per diagram per session. Verdicts are produced by
a separate adjudicator who never sees which arm a row belongs to.

**Status of the measurement itself: NOT RUN.** No human has read these images. Every number this
kit can produce is derived from sheets a person fills in and verdicts a second person assigns.

## Design, in one paragraph

A single reader cannot read both arms of one scenario back to back without the second read
measuring carry-over, so this kit uses a **two-session washout**. In session 1 the reader sees
each scenario exactly once, in one arm, on their own sheet; that sheet is collected and not
returned. In session 2, at least 48 hours later, the reader sees the other arm of every scenario
on a second, separate sheet, without access to their session-1 answers or images. Each session
carries three baseline and three candidate arms, and the scenario order inside each session is
seeded. Correctness verdicts come from a separate adjudicator who receives a shuffled answer
export with opaque row tokens and no session, timing or arm column. The seeded assignment lives
only in `scoring-key/arm-map.json`; nothing in the reader's hand-out names a role.

## What is here

```
specs/                     Six diagram specs (semantic source of truth for both arms)
images/                    Both arms per scenario, rendered by the real Desktop exporter
  <scenario>-baseline.png    arm rendered from commit 52671cf9e
  <scenario>-candidate.png   arm rendered from this checkout
  reader/session1/S<k>.png   hand-out copy for session 1 (no role in the name)
  reader/session2/S<k>.png   hand-out copy for session 2 (the other arm, same name)
  drawio/<scenario>-<arm>.drawio   editable intermediate for each arm
questions.reader.json      Reader copy of the questions (id, text, answer_type, conventions only)
questions.json             Operator copy: same questions plus scoring hints; never handed out
reader-protocol.md         Exact instructions for the human reader
response-sheet-session1.csv   Empty 24-row sheet for session 1
response-sheet-session2.csv   Empty 24-row sheet for session 2
scoring-key/answers.json   Key: required / optional / reject items per question, targets, hashes
scoring-key/arm-map.json   Session assignment, seeded order, reader-file mapping, image hashes
scorer.py                  Stdlib scorer: CSV hardening, blind adjudication export/import, targets
arm_parity_check.py        Render-level semantic parity check over the two arms' .drawio sources
parity-report.json         Result of the parity check as run (differences listed, not hidden)
tests/test_scorer.py       Scorer self-test with synthetic, clearly-labelled fake rows
tests/test_parity.py       Parity-normaliser self-test
```

`images/reader/session1|session2/S<k>.png` are byte-identical copies of the frozen arm PNGs named
in `scoring-key/arm-map.json`; `<k>` is the scenario's 1-based position in the question set.

## Run it

1. **Session 1.** Give the reader only `images/reader/session1/`, `questions.reader.json`,
   `reader-protocol.md` and `response-sheet-session1.csv`. Nothing else — no other image folder,
   no role-named `images/*.png`, no key, no arm map, no session-2 material.
2. The reader fills `session_started_utc`, `reader`, `answer`, `seconds`, `recognised_prior` and
   `notes`. `applicable` is pre-filled, and nothing else is theirs to write. At the end of
   session 1 the operator **collects the session-1 sheet and does not return it**; the reader
   must not keep a copy.
3. **Session 2** at least 48 hours later: give the same reader only `images/reader/session2/`,
   `questions.reader.json`, `reader-protocol.md` and `response-sheet-session2.csv`.
4. **Blind adjudication.** Export the answer packet and hand the adjudicator only that file:

   ```bash
   python3 scorer.py --sheet1 response-sheet-session1.csv \
       --sheet2 response-sheet-session2.csv \
       --key scoring-key/answers.json --arm-map scoring-key/arm-map.json \
       --export-adjudication adjudication/
   ```

   `adjudication/adjudication-input.json` holds one row per applicable answer: opaque `token`,
   `scenario`, `question_id`, `answer`, and an empty `verdict`. It carries no session, timestamp,
   seconds or arm column, and it is shuffled from a recorded seed. The adjudicator fills
   `verdict` (`correct` / `partial` / `incorrect`) against the frozen key and returns the file.
   The adjudicator must not have access to `scoring-key/arm-map.json`, `scoring-key/answers.json`
   or this kit's build history; the operator never shows them the sheets.
   `adjudication/adjudication-map.json` is operator-only and maps token to session and row.
5. Write `run-metadata.json`; every field is required:

   ```json
   {"reader_id": "initials-or-alias", "is_implementation_author": false,
    "date": "YYYY-MM-DD", "screen": "27in 2560x1440", "zoom": "100%",
    "theme": "light", "implementation_start": "YYYY-MM-DDTHH:MM:SSZ",
    "adjudicator_id": "initials-or-alias-of-adjudicator"}
   ```

   `zoom` must be exactly `100%` and `theme` exactly `light`; `adjudicator_id` must differ from
   `reader_id`.
6. Score:

   ```bash
   python3 scorer.py --sheet1 response-sheet-session1.csv \
       --sheet2 response-sheet-session2.csv \
       --key scoring-key/answers.json --arm-map scoring-key/arm-map.json \
       --adjudication-map adjudication/adjudication-map.json \
       --verdicts adjudication/adjudication-input.json \
       --metadata run-metadata.json --json report.json
   ```

   Exit `0` = PASS, `1` = FAIL (a target missed), `2` = malformed sheet, session/file mismatch, a
   washout gap under 48 h or a reversed order, missing/invalid metadata, or verdicts that do not
   cover every applicable row exactly once, `3` = PENDING (complete data, but the reader is the
   implementation author, the reader adjudicated their own answers, or a session starts outside
   the 30-day window).
7. Self-tests only (never touch real data):

   ```bash
   python3 -m unittest tests.test_scorer tests.test_parity -v
   ```

8. Parity check, once, whenever the arms are re-exported:

   ```bash
   python3 arm_parity_check.py --out parity-report.json
   ```

   Exit `0` = all six scenarios have identical cell ids and normalised labels across arms; `1` =
   at least one difference, listed cell by cell. This is a render-level check, not a reader
   result.

## Measurement definitions

- **Correctness**: share of the 24 applicable candidate answers scored `correct` by the
  adjudicator. `required` items must all be present, no `reject` item may apply, and `optional`
  items are extra credit only — they never downgrade a correct answer.
- **Interpretation time**: the reader times each question separately, starting Q1's timer before
  the image is opened. Per scenario-arm the time is the sum of that scenario's four per-question
  seconds; an arm's figure is the median of its six scenario-arm totals. The target is a
  candidate median at least 20% lower.
- **Regression**: strict and maintainer-approved for this kit — any question answered `correct`
  in the baseline arm and not `correct` in the candidate arm, for the same scenario, fails the
  no-regression target and is listed in the report.

## Reproducing the images

Both arms come from the same specs, the same exporter, and the same draw.io Desktop build;
only the renderer under test differs.

```bash
git worktree add --detach /tmp/ags-ac06-base 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765
D=skills/common/common-architecture-diagramming/scripts
B=/tmp/ags-ac06-base/skills/common/common-architecture-diagramming/scripts
for s in specs/*.spec.json; do
  n=$(basename "$s" .spec.json)
  python3 -B "$D/validate_spec.py" "$s"                     # spec must be valid for both arms
  python3 -B "$B/render_drawio.py" "$s" -o images/drawio/$n-baseline.drawio --strict
  python3 -B "$D/render_drawio.py" "$s" -o images/drawio/$n-candidate.drawio --strict
  python3 -B "$D/export_drawio.py" images/drawio/$n-baseline.drawio  -f png -o images/$n-baseline.png
  python3 -B "$D/export_drawio.py" images/drawio/$n-candidate.drawio -f png -o images/$n-candidate.png
done
git worktree remove --force /tmp/ags-ac06-base
```

`--strict` exits 2 on a layout finding; both arms must exit 0 or the scenario is not comparable.
All six scenarios pass `--strict` on both arms as delivered. After re-exporting, rebuild
`images/reader/session*/S<k>.png` from `scoring-key/arm-map.json`, re-run `arm_parity_check.py`,
and refresh the hashes in the receipt.

## Scenario provenance

| Scenario | Spec origin |
|---|---|
| S1 simple stack | `skills/common/common-architecture-diagramming/assets/fixtures/container.spec.json`, copied, with explicit lifecycle/evidence fields added so provenance renders instead of blanket `UNVERIFIED` |
| S2 dev tooling | authored here (no existing fixture covers developer tooling) |
| S3 long-label hub | `artifacts/evidence/system-design-visualization-improvements/long-label-hub.spec.json`, copied unchanged |
| S4 nested-deployment needs | authored here; flat region boundaries with cluster/namespace in node sublabels, because the renderer draws one boundary level |
| S5 stateful dataflow | authored here (the shipped dataflow fixture is stateless) |
| S6 SDK / IPC | authored here; process-boundary diagram with the transport between the two processes |

## What is human-only

- The reading itself, the timings, and the corrections. No agent produced, simulated,
  estimated or re-timed any answer.
- The correctness verdicts, which require a human adjudicator reading answers against the frozen
  key without knowing the arm.
- The AC-06 acceptance decision. The scorer only computes; the PO owns the verdict, and a
  missed target is `FAIL`, never a waiver.

## Honest limits

- **Six scenarios, one reader, two sessions.** This measures whether *this* presentation change
  helps one person read these six diagrams. It is a paired reading exercise, not a usability
  study and not a claim about other diagram types, teams or tools. The maintainer supplies a
  single reader; a second reader in a counterbalanced design would be stronger, and this kit does
  not implement that.
- **The washout is enforced, not observed.** The scorer rejects a gap under 48 hours, a reversed
  order, and a sheet that mixes sessions, but it cannot prove the reader actually waited: the
  timestamps are the reader's own records. It also cannot prove the reader never kept a copy of
  session-1 answers — that is a protocol obligation on the reader.
- **Recognition is expected to be minimal, not zero.** The protocol asks the reader to record
  `recognised_prior=y` when a session-2 diagram feels familiar. Those rows are listed in the
  report; they are not removed, because dropping a scenario after the fact would bias the sample.
- **Blinding is a hand-out property.** The reader receives one session folder at a time, with
  neutral names and no answers from the other session. The role-named `images/*-baseline.png` /
  `images/*-candidate.png` files still exist in the kit for reproduction; handing out anything but
  `images/reader/sessionN/` plus the neutral question copy breaks the blind, and the scorer cannot
  detect it.
- **The candidate arm is visually identifiable by geometry**, which is inherent. In five of six
  scenarios the candidate PNG is taller (S2 1510 vs 1442; S3 3704 vs 2574; S4 2124x2586 vs
  2064x2286; S5 2616 vs 2258; S6 2368 vs 2354); S1 dimensions are equal. A reader may guess which
  presentation is newer without any label.
- **The two arms differ only in renderer version** (52671cf9e vs this checkout) at the same
  exporter and specs. Any improvement is attributable to the presentation change, and no
  conclusion about diagram content quality follows from it.
- **Parity is checked at the render level only.** `arm_parity_check.py` compares cell ids and
  normalised labels in the two `.drawio` sources. As run, **6 of 6 scenarios are identical**. The
  normaliser decodes entities before parsing, so a literal `<` in a label (S3 `p99 < 15ms`) is
  kept as text and the two arms' different escaping of the same label cannot create a false
  difference. This proves the exported cell values match; it does not prove the PNGs are
  pixel-identical.
- **S3 carries a shared label defect.** The S3 spec's `edge_proxy` metric is already
  `p99 < 15ms · measured` and the renderer appends the `measured` provenance, so both arms print
  `p99 < 15ms · measured · measured`. It is identical in both arms and is not a candidate
  regression or a confound, but it is a content defect in the source fixture that should be fixed
  upstream (spec or renderer guard) rather than by editing a frozen image here.
- **Baseline defects are real but not scored as a target.** The baseline arm has visible label
  collisions (S1, S3, S4, S5, S6) and one overflowing metric line (S2). The target is correctness
  and time on the candidate arm plus no regression, not "the baseline is ugly".
- **`partial` counts as incorrect.** Correctness is strict: at least 90% of applicable answers
  must be fully correct. Partial answers are reported separately so a near-miss is visible.
- **One adjudicator, and the operator still holds the map.** The adjudicator's input is shuffled
  and stripped of session, timing and arm, and the scorer refuses incomplete, duplicate or
  stale verdicts. The operator could still leak arm information outside the tool, and a single
  adjudicator's borderline call directly decides the strict regression target.
- **Zero non-applicable questions.** The frozen set marks all 24 questions applicable; the
  scorer keeps a non-applicable path that is exercised only by fixtures. If a future scenario
  legitimately cannot answer one slot, applicability must change in the question set and key
  *before* any reading, never after.
- **Image legibility is asserted visually, by the operator, once.** Strict layout validation
  cannot prove legibility; a human still has to look, and the reader's `notes` column is the only
  place where an unreadable label surfaces.
- **draw.io Desktop output is version-dependent.** Different Desktop builds can shift text
  metrics slightly; the kit records the exporter path and image hashes, not a pinned Desktop
  version string.
- **Author and adjudicator independence are declared, not verified.** The scorer trusts
  `is_implementation_author` and the distinct `adjudicator_id`; a dishonest declaration is out of
  scope for a kit.
- **S1's "none marked" answer is a property of this kit's copy.** The source fixture carried no
  provenance metadata, so the copy here asserts `implemented` / `documented|observed`; do not read
  that answer as evidence about the fixture.
- **Scenario selection narrowed two layouts.** Pre-freeze spec edits for S2, S4 and S5 removed
  hard cross-row and edge-through-node layouts (the CDN hop and the `ci -> registry` edge were
  dropped; the partner API was moved). That was needed to render `--strict` clean, and it may
  make the layout difficulty lower than AC-02 / AC-06 target.
