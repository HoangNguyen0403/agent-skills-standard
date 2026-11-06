# Receipt — AC-06 reader kit (second correction round; measurement NOT RUN)

Corrected 2026-11-06 by the orchestrated delivery agent on the maintainer's instruction, after the
second independent re-review (`key-review-2.md`) returned **NOT READY**. Both review files are
left byte-identical as the pre-fix records. Task owner: PR298 AC-06 preparation. No commit, push,
install, source/skill/CI change was made; every artifact below is under an already-gitignored
`artifacts/` path (`/artifacts/` in `.gitignore`).

Only `ac06-reader-kit/` was edited. The six specs, the 12 frozen PNGs and the 12 arm `.drawio`
files are byte-identical to the previous receipt: no spec edit, no re-render.

## Identities

| Item | Value |
|---|---|
| Repository | `agent-skills-standard` |
| Branch | `improve-system-design-skills-stack-diagram` (PR298) |
| Candidate revision (this checkout) | `fd049855938569f57512e07dd05956c3bad842b3` |
| Baseline revision | `52671cf9ed6a1c376dfaaae7e621dbc51a4c8765` (`chore(release): cli-v2.7.4`) |
| Renderer under test | `skills/common/common-architecture-diagramming/scripts/render_drawio.py` |
| Exporter (both arms) | `scripts/export_drawio.py`, unchanged by this work |
| draw.io Desktop | 31.5.3, `/Applications/draw.io.app/Contents/MacOS/draw.io` |
| Python | 3.14.5 |
| macOS | 27.0.1 (arm64) |

## Finding-by-finding resolution

| Finding | Severity | Resolution |
|---|---|---|
| B1 session-2 sheet leaked session-1 answers | BLOCKER | Fixed. One sheet split into `response-sheet-session1.csv` and `response-sheet-session2.csv` (24 empty rows each); the single `response-sheet.csv` is deleted. The scorer requires both (`--sheet1`, `--sheet2`), reads each with `utf-8-sig`, and rejects a row whose `session` does not match the file it sits in, duplicate rows across the two files, a second sheet with no rows, and any missing scenario × question. Protocol rule 3 and README step 2 state that the operator collects the session-1 sheet and the reader must not keep, photograph, copy or consult it. Tests: `test_reject_session_in_the_wrong_sheet`, `test_reject_missing_second_session_rows`, `test_reject_missing_question_in_session`, `test_reject_duplicate_rows`. |
| M1 S6 Q1 terminal contradiction | MAJOR | Fixed. `verdict_scale.q1_terminals` now allows continuing past an accepted terminal **only** through nodes listed in that scenario's `accepted_extra_hops`, and every Q1 carries the field. S6 has `accepted_terminals: ["Agent Daemon"]` and `accepted_extra_hops: ["Inference Runtime"]`, so both the daemon-terminated and the runtime-terminated path are correct by rule, not by operator choice. |
| M2 required items exceed the question; Q4 strictness differs | MAJOR | Fixed. S4 Q3 now requires only "Aurora writer … authoritative"; replica-as-secondary and replication direction moved to `optional`. One Q4 rule for all six (`verdict_scale.q4_exhaustive`): a list is read as exhaustive, so a bare marked list is correct everywhere; "nothing else is marked" was removed from `required` in S4, S5 and S6 and moved to `optional`. |
| M3 adjudication not arm-blind | MAJOR | Fixed. `scorer.py` gains `export_for_adjudication()` and `--export-adjudication DIR`: it writes `adjudication-input.json` (shuffled from a recorded seed; per row only opaque `token`, `scenario`, `question_id`, `answer`, empty `verdict`) and `adjudication-map.json` (operator-only token → session/scenario/question). The operator scores with `--verdicts` + `--adjudication-map`; the scorer refuses unknown tokens, duplicate verdicts, stale answers, invalid verdict values, an incomplete map, and verdicts that do not cover every applicable row exactly once. `run-metadata.json` now requires `adjudicator_id`, which must differ from `reader_id` (sameness → PENDING). README step 4 documents who must not have arm-map access. Tests: `test_export_contains_no_session_timing_or_arm` (asserts no `session_started`, `seconds`, `arm`, `baseline`, `candidate` in the packet), `test_reject_incomplete_verdict_coverage`, `test_reject_duplicate_verdict_rows`, `test_reject_unknown_verdict_token`, `test_reject_bad_verdict_value`, `test_reject_verdict_for_a_different_answer`, `test_reject_adjudication_map_missing_rows`, `test_pending_when_reader_adjudicated_their_own_answers`. |
| M4 timebox and configuration unenforced | MAJOR | Fixed. `implementation_start`, `reader_id`, `is_implementation_author`, `date`, `screen`, `zoom`, `theme` and `adjudicator_id` are required: missing/empty → exit 2; `zoom` must be exactly `100%` and `theme` exactly `light` → else exit 2. Any session starting before `implementation_start` → exit 2; any session starting more than 30 days after it → PENDING (never PASS). The gap check is signed: session 2 must start at least 48 h after session 1, and a reversed order → exit 2. Tests: `test_reject_missing_implementation_start`, `test_reject_missing_configuration_field`, `test_reject_bad_theme_and_zoom`, `test_reject_session_before_implementation_start`, `test_pending_when_session2_is_outside_the_window`, `test_reject_reversed_session_order`. |
| m1 parity tool ate text after a literal `<` | MINOR | Fixed. `normalise()` now decodes entities repeatedly **before** parsing and strips markup with `html.parser.HTMLParser`, so `p99 < 15ms` survives and the two arms' different escaping converges. `parity-report.json` regenerated: **6/6 scenarios identical**, exit 0. README and earlier receipt text that claimed "baseline prints `p99`" is gone. New `tests/test_parity.py` covers the literal-`<` case, raw vs `&amp;lt;` convergence, `<br>` handling, and the delivered kit's parity. |
| m2 shared "measured · measured" S3 defect | MINOR | Recorded, not changed. README "Honest limits" states the S3 `edge_proxy` metric prints `p99 < 15ms · measured · measured` in **both** arms because the spec metric already ends in `measured` and the renderer appends the provenance, that it is not a regression or confound, and that the fix belongs upstream (spec or renderer guard). Spec and images untouched. |
| m3 gap check used `abs()` | MINOR | Fixed: signed `session_stamps["2"] - session_stamps["1"]`; negative → exit 2 ("swapped"). `test_reject_reversed_session_order`. |
| m4 protocol said both folders are handed out | MINOR | Fixed. "What you receive" now hands out only the current session's folder, questions copy and sheet; the session-2 rule forbids the other session's material. |
| m5 orientation time unspecified | MINOR | Fixed. Protocol rule 4 and per-question step 2: "For Q1: start the timer first, then open the image. For Q2–Q4: start the timer when you begin reading the question text." |
| m6 reader-facing questions carried scoring hints | MINOR | Fixed. New `questions.reader.json` holds only `id`, `text`, `answer_type` and the answer conventions (plus the statement and instructions); `scoring_note`, `applicability_rule` and totals are only in the operator copy `questions.json`. Both hashes are recorded in `answers.json.frozen_hashes`, and the protocol/README hand out only the reader copy. |
| m7 metric provenance words unadjudicated | MINOR | Fixed by rule. `verdict_scale.q4_provenance`: `measured`, `estimated` and `target` are not uncertainty markers; listing them is optional noise, never required and never a reject. Only `proposed`, `assumed` and the UNVERIFIED marker count. |
| m8 S6 Q3 justified "absent" unadjudicated | MINOR | Fixed. `verdict_scale.q3_absent` plus S6 Q3 `absent_answers`: "absent for the request flow; the Session Store holds session state" is correct because it names the required node; "absent" with no store, or "no state at all", is incorrect. |
| m9 S1 Q1 single terminal unjustified | MINOR | Fixed by justification, no rule change: S1 Q1 `terminal_note` says the primary flow is the order write path, that Order API also branches to Catalogue Cache and Order Events, and that naming a branch in brackets is harmless, never required and never a reject. |
| m10 scorer residuals | MINOR | Fixed: `print`/`--json` write moved inside an `OSError → exit 2` guard; sheets and JSON read with `utf-8-sig` (BOM tolerated); seconds must match `^\d+$` so `1e3`, `nan`, `inf`, `0`, `-4` and `12.5` are all rejected. Tests: `test_reject_bad_seconds_values`, `test_reject_non_numeric_seconds`. |
| m11 test gaps | MINOR | Fixed. Added tests for zero/negative/inf/`1e3`/fractional seconds, reversed order, missing `implementation_start`, session-2-only window overrun, an even median with six distinct totals (140 s), baseline-`partial`/candidate-`correct` non-regression, unbalanced and same-arm arm maps, two start times inside one session, unknown scenario, and the unexpected-exception → exit 2 path. Suite is 50 tests (scorer 46, parity 4). |
| m12 documented arm draw did not reproduce | MINOR | Fixed in `arm-map.json.seed_method.arm_draw`: the draw yields the session-1 **role** (baseline when the hash prefix is even, else candidate), the balance flip is recorded, and letters are relabelled so A is always the session-1 arm — a letter never implies a role. Reference hash prefixes for all six scenarios are listed. Role outcome and letters are unchanged, so no reader image or assignment moved. |
| m13 ambiguous reader-count wording | MINOR | Fixed. README "Honest limits" now says the maintainer supplies a single reader and that a counterbalanced multi-reader design would be stronger, without implying a second reader exists. |

## Commands run and results

| Command | Result |
|---|---|
| `python3 -B -m unittest tests.test_scorer tests.test_parity` | `Ran 50 tests … OK` (exit 0) |
| `python3 -B scorer.py --sheet1 response-sheet-session1.csv --sheet2 response-sheet-session2.csv --export-adjudication …` on the empty templates | exit 2, `sheet error: 1-sheet row 2: session_started_utc is empty` |
| `python3 -B arm_parity_check.py` | exit 0, `arm parity: 6/6 scenarios identical`; `parity-report.json` regenerated |
| JSON parse of every `*.json` in the kit | all parse |
| `answers.json.frozen_hashes` re-check against `questions.json`, `questions.reader.json`, `arm-map.json` and the six specs | 9/9 match |
| Leak scan `baseline|candidate|arm` over `questions.reader.json`, `reader-protocol.md`, `response-sheet-session1.csv`, `response-sheet-session2.csv` | no match (grep exit 1) |
| SHA-256 of the 12 reader PNGs vs the frozen arm named in `arm-map.json` | 12/12 byte-identical |
| SHA-256 re-check of every non-receipt file against the table below | 57/57 match |

## Parity check result (render level, not a reader result)

`parity-report.json`: 6 of 6 scenarios have identical cell ids and normalised labels across arms,
exit 0. The earlier S3 "difference" was a normaliser artefact (a literal `<` in one arm's label
being parsed as a tag); it is gone after decoding entities before parsing. See m2 for the real,
arm-shared S3 metric defect, which this check proves is identical in both arms.

## Deliberate deviations and residual risks about reader-facing content

- **Sheet columns.** Reader sheets are `session, session_started_utc, reader, scenario,
  question_id, answer, seconds, applicable, recognised_prior, notes`. The earlier round's
  `arm_hidden_id` column was **removed** rather than kept: verdicts now come from the blind
  adjudication packet, the scorer derives the arm from `arm-map.json`, and the column was the only
  arm-related token left in a reader-facing file. This is why the reader files contain no
  `baseline`, `candidate` or `arm` token at all.
- **Two review files are unchanged.** `key-review.md` and `key-review-2.md` are the reviewers'
  pre-fix records, including their references to `images/blinded/` and `arm_hidden_id`. This
  receipt is the mapping from their findings to the current state.
- **`questions.json` stays operator-side** and still carries `scoring_note` /
  `applicability_rule`; only `questions.reader.json` is handed out.

## Verification NOT RUN

| Item | Status | Why |
|---|---|---|
| Human reading of any image, in either session | NOT RUN | Requires the independent reader the maintainer supplies; no agent answered any question |
| Timings, answers and verdicts | NOT RUN | Dependent on the human reading and the adjudicator; both sheets are empty templates |
| AC-06 PASS/FAIL against the 90% / 20% / no-regression targets | NOT RUN | No real sheets exist; synthetic rows were used only inside the self-tests, labelled `SYNTHETIC-NOT-A-READER`, in temporary directories |
| Real blind adjudication by a second person | NOT RUN | The export/import path is implemented and tested with a synthetic adjudicator; no human has adjudicated |
| Repository-wide test suite | NOT RUN | Explicitly out of scope; only the kit self-tests were executed |
| Dark-theme arm | NOT APPLICABLE | AC-06 compares presentations, not themes |
| Reader discipline (no kept session-1 copy, real gap) | NOT VERIFIABLE | Declared in the protocol and reader timestamps; a fabricated timestamp cannot be detected |

## Risks

1. **Order effects reduced, not removed.** The washout removes the back-to-back second-arm read and
   the shared sheet; it does not remove within-session learning across six scenarios, and one
   reader cannot be counterbalanced against themselves.
2. **Recognised-prior rows are listed, not excluded**, because dropping scenarios after the fact
   would bias the sample.
3. **One adjudicator decides borderline calls.** The packet is arm-blind and the scorer refuses
   incomplete or stale verdicts, but the operator could still leak arm information outside the
   tool, and a single adjudicator's `correct`/`partial` call decides the strict regression target.
4. **Strict regression on one reader.** One slip on a candidate row fails AC-06 even when the
   renderings are semantically identical; `parity-report.json` is the counter-evidence available
   when that fires.
5. **Blinding depends on the operator.** Role-named PNGs remain in `images/` for reproduction;
   handing out anything but `images/reader/sessionN/` plus the reader questions breaks the blind,
   and the scorer cannot detect it.
6. **`partial` counts as incorrect.** A terse but correct answer scored `partial` depresses the
   candidate arm; partials are reported separately.
7. **Shared S3 metric defect** (`measured · measured`) is identical in both arms and should be
   fixed upstream, not by editing frozen evidence.
8. **draw.io Desktop drift.** PNGs are reproducible today at Desktop 31.5.3; a different build may
   shift text metrics. Configuration is now enforced in metadata, but rendering is not pinned.

## Files

SHA-256 over every file in the kit except this receipt (a file cannot hash itself).

| File | Bytes | SHA-256 |
|---|---|---|
| `README.md` | 15444 | `e85ea01b78ae7ba9a922920e46a7af1ed36d8d51acb03edcdc72e8924a8089cf` |
| `arm_parity_check.py` | 6955 | `6159fa83e203da67e7b44d26a068779368773717c46025867f0e72509b43b22d` |
| `images/S1-simple-stack-baseline.png` | 313501 | `d9c6007a67bf83d6b25afbebf9a3ebae324ae77b36a4b7cf1d6dcb0bad5c9125` |
| `images/S1-simple-stack-candidate.png` | 313746 | `0bd06d515b80a3cba1909c1c6ff89130a16984da7093d10aea53ee485546deeb` |
| `images/S2-dev-tooling-baseline.png` | 386672 | `f43a082a8ddfbaf9369e7037d630b7b2cba5b9a4f162c05355bb7e577b32b6af` |
| `images/S2-dev-tooling-candidate.png` | 396786 | `56559ac7ff09cd0d019a16dfee36e07fc330952ceb9bfb5822dbb990c0e33191` |
| `images/S3-long-label-hub-baseline.png` | 647571 | `5bfb122d584314212697d1224a3c39c3b7f08e022cda63a86e59093860978671` |
| `images/S3-long-label-hub-candidate.png` | 709400 | `7fc9961e0b7f4b7d8b40e89d56bc9fe0b9ab6c53825f13f5ad83bae31cdd3cb8` |
| `images/S4-nested-deployment-baseline.png` | 462817 | `97fad4a6cbeb6bf011898f4be7480fe74ca48234cf22349168409cba88160101` |
| `images/S4-nested-deployment-candidate.png` | 476842 | `fff8ca1f0463855a7480dd9de69d9e60a70546e6a637089ad52e3d166ba682e2` |
| `images/S5-stateful-dataflow-baseline.png` | 486659 | `b66a94b3085761933daf63fb800d47a0e3d4f46ed2d52df8ace199c0f4d1caf4` |
| `images/S5-stateful-dataflow-candidate.png` | 494395 | `804e9dbb057f3ad0fdb4245145478934616fa71ece6c7d6ea3ff0e6f21ba23be` |
| `images/S6-sdk-ipc-baseline.png` | 406731 | `c26e46f491abe4ebef9259fafdbfc954c930ef8f83abe9a126912f7220ad6236` |
| `images/S6-sdk-ipc-candidate.png` | 406946 | `04751a132fdf66bdbc44e975af8643325de3463577e4e27844ea2f0112f357e3` |
| `images/drawio/S1-simple-stack-baseline.drawio` | 12863 | `87b0893769e99fe7fd1d08349abf3c16fca835f4f825bbfbb6691af37a533476` |
| `images/drawio/S1-simple-stack-candidate.drawio` | 13014 | `c63d0d3528f295089b59d8bda6a7e01ce7ef9e45ed774adf4c3557f794a7e537` |
| `images/drawio/S2-dev-tooling-baseline.drawio` | 12758 | `09e08e162305d6fbd65d4f03eb333216f3149de9e7b8d069d4800623eae7b60c` |
| `images/drawio/S2-dev-tooling-candidate.drawio` | 13122 | `65f4428ea5ef6edb1945bfaee2e8c163b95ad2cbe6bedd839d722dc119b312fc` |
| `images/drawio/S3-long-label-hub-baseline.drawio` | 17331 | `6b4a2b98299f8dd2dbccf10f139081ff6f69e37d22b5343952f66c3117d778ba` |
| `images/drawio/S3-long-label-hub-candidate.drawio` | 17614 | `d4b4fc699bfa9aacbf409292e178bab2023c0d2676169da7df32895b9c76400d` |
| `images/drawio/S4-nested-deployment-baseline.drawio` | 18351 | `902036fd8170d1fe3bc0f8f15d526fddbe4a128df8718b87bc9921cfe4e9209f` |
| `images/drawio/S4-nested-deployment-candidate.drawio` | 18588 | `1a9ef5189f282a4488a4e958353e8e7c21638657ec80a5489b439891aa39b9f7` |
| `images/drawio/S5-stateful-dataflow-baseline.drawio` | 16140 | `cf46186d6a7d60942d87e1fb721e19d6e193fc0205d5e54db44b183899bac381` |
| `images/drawio/S5-stateful-dataflow-candidate.drawio` | 16471 | `ef988e72ec2bed531bfe91b4396c5bcd34e47e01f664d915eacc7d5d07948b19` |
| `images/drawio/S6-sdk-ipc-baseline.drawio` | 13346 | `9d1511e7bfc9669e012054b2f0d65c19650b7682063318891142768e5f37bc04` |
| `images/drawio/S6-sdk-ipc-candidate.drawio` | 13620 | `e7f4cbf90bab9a2f5d18fcd665105c3b0d5b94c761a986f6af990db134f86eb1` |
| `images/reader/session1/S1.png` | 313746 | `0bd06d515b80a3cba1909c1c6ff89130a16984da7093d10aea53ee485546deeb` |
| `images/reader/session1/S2.png` | 386672 | `f43a082a8ddfbaf9369e7037d630b7b2cba5b9a4f162c05355bb7e577b32b6af` |
| `images/reader/session1/S3.png` | 647571 | `5bfb122d584314212697d1224a3c39c3b7f08e022cda63a86e59093860978671` |
| `images/reader/session1/S4.png` | 476842 | `fff8ca1f0463855a7480dd9de69d9e60a70546e6a637089ad52e3d166ba682e2` |
| `images/reader/session1/S5.png` | 486659 | `b66a94b3085761933daf63fb800d47a0e3d4f46ed2d52df8ace199c0f4d1caf4` |
| `images/reader/session1/S6.png` | 406946 | `04751a132fdf66bdbc44e975af8643325de3463577e4e27844ea2f0112f357e3` |
| `images/reader/session2/S1.png` | 313501 | `d9c6007a67bf83d6b25afbebf9a3ebae324ae77b36a4b7cf1d6dcb0bad5c9125` |
| `images/reader/session2/S2.png` | 396786 | `56559ac7ff09cd0d019a16dfee36e07fc330952ceb9bfb5822dbb990c0e33191` |
| `images/reader/session2/S3.png` | 709400 | `7fc9961e0b7f4b7d8b40e89d56bc9fe0b9ab6c53825f13f5ad83bae31cdd3cb8` |
| `images/reader/session2/S4.png` | 462817 | `97fad4a6cbeb6bf011898f4be7480fe74ca48234cf22349168409cba88160101` |
| `images/reader/session2/S5.png` | 494395 | `804e9dbb057f3ad0fdb4245145478934616fa71ece6c7d6ea3ff0e6f21ba23be` |
| `images/reader/session2/S6.png` | 406731 | `c26e46f491abe4ebef9259fafdbfc954c930ef8f83abe9a126912f7220ad6236` |
| `key-review-2.md` | 18843 | `4754fdbedec46a6290785315ea0f9865827fd73bafda3f82b951566409e1b55e` |
| `key-review.md` | 14341 | `08bb2ec4f0147b5bf27f37addf2e9e11493b94fa03adac1ec885a2f357c7a2db` |
| `parity-report.json` | 1595 | `8d1a8150eda3bbb51558113ac5ed65e407118840f3d6110754e7a66dd6d2430d` |
| `questions.json` | 5116 | `521218f1e7960fad672c145055caac431c7f9bc70339dced99443727e3856e52` |
| `questions.reader.json` | 3440 | `c8c9677cc90ed600c8725ec83c9d0a9c116a2dfdc7cc099a9ccedc33cfb55e72` |
| `reader-protocol.md` | 5955 | `9661d369bc9e44626d542e825496492884839953a95d06fd27cef58647f53dab` |
| `response-sheet-session1.csv` | 897 | `aefb03db0fa5f80c5882af0bca5814ea8083fb24f342a16776b2d3b5db06df42` |
| `response-sheet-session2.csv` | 897 | `9495e81a5d318ec9a17057a504a60fdd26209dcd5ef9d1a9f1a8723c8397b09d` |
| `scorer.py` | 32497 | `5f6000cdbc5b78815eb89fe13676753e0450799ed0c3e19f40a4567ab9b63d0e` |
| `scoring-key/answers.json` | 24133 | `bfbedafa62cfc2c88949a28c66bf2d8d442d89f9099817520cf682764c8ef11d` |
| `scoring-key/arm-map.json` | 8596 | `ed7e18621a9eed9f07b43145d02a725c994a777de81a23a06870cab7ce72359a` |
| `specs/S1-simple-stack.spec.json` | 3878 | `b5ea12ff1ae0b502cf797fa3b9013118856a822adcb034b44f3a2206633fa20f` |
| `specs/S2-dev-tooling.spec.json` | 3295 | `bb6f80ca0b76a9a5cc70ec88e9f5fd4d165c6fe9f1e731161315180dffb2d376` |
| `specs/S3-long-label-hub.spec.json` | 5130 | `3347d9df0d014c08f3cd4453e6f2d83809e9c68a650afe51916acf4eb67c2cf7` |
| `specs/S4-nested-deployment.spec.json` | 4569 | `63b0a66c228c7bf4198bdf45f47902378c23d51026ae7985367250e8f6d27df0` |
| `specs/S5-stateful-dataflow.spec.json` | 4269 | `76ccc3aebb2e16740873af87d9250f8b25492f523d6c0d73df0610d397a61343` |
| `specs/S6-sdk-ipc.spec.json` | 4037 | `f547d6c123098e3c5b56eeba4b7c2bf6af30f1ea56e54da3d54a57501e467004` |
| `tests/test_parity.py` | 3050 | `dc45ead7bc0557a51ddd8e599c72990de7c12720806d2c0fe21bee41184c0e86` |
| `tests/test_scorer.py` | 29707 | `59a5923b040c1d24bd484082c4afea20ff958b8e710eaf736294f0eda78ab899` |
