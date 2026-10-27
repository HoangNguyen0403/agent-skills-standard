# T5 final review — revision 3 (settled/frozen)

## Verdict: CHANGES REQUESTED — one hard blocker in the bound eval JSON, plus two provenance/count corrections

Independent, read-only review of the frozen T5r3 set. `T5-rubric-review.md` (`6fecc9ef…`), `T5/first-review-evidence.md` (`7f863d75…`), and my earlier `T5-rubric-rereview.md` / `T5-eval-review.md` are preserved unmodified (current bytes `aea62db0…` and `3bedf890…`). No source, packet, eval, pilot, matrix or report edit by this reviewer. No checks, scorer, matrix, tests, build, generator or model run. Documentary calibration only; live efficacy remains unmeasured.

## Binding (independently recomputed; all match T5-report.md §1–§2)

| Artifact | Live SHA-256 |
| --- | --- |
| building-blocks `evals/evals.json` | `8c0fa02ec31fbc75ffc3a7d190bebc65311b1a0658029f66f8d28a63c2dda849` |
| resilience-ops `evals/evals.json` | `3b4d00fdaba7583829a507186fd162565d2246239e9007042ad701bedff29c98` |
| data-architecture `evals/evals.json` | `f423bd960bace40726c4ae212fd70a7c5e50b7f6abb275d90312ce64323bc4e0` |
| integration-patterns `evals/evals.json` | `dc42d929ae5d0c8799c788a450ab5b196ed113a56ee57ecf0a13d5e8ec1a834a` |
| heldout.json | `5543614b626c55e7c691e3e89eaac5da66cfab9f2e794384ca68c6b3482f76d8` |
| pilot.md | `19dbab5f365ad8beb91a519c844207cd47b4decd046a559f0192f7d37d1a746c` |
| skills.txt (unchanged) | `41c57a510a98bdb61d25e37385ae70e3d2db8b655ce5569cc1ae3ebf17f801ac` |
| `T5/lexical-candidate-matrix.ts` | `9e5cfc6ac9b929cc2c0617916a9ac7661686fdeab8491ea5e624c20032e623ce` |

Historical spot checks still match: `243f7c53…`, `454f6811…`, `dd1ab60f…`, `0b2bd3dc…`, `012126cf…`. All eleven accepted-source digests match the freeze manifest (RO full digest `b9628d52…280ba7fc5d0e32`).

## Repair verification (prior R6 / E1–E3)

- **R6 — FIXED.** `heldout.json:148` now reads: "Readiness follows ingest process and request-path health; summarizer degradation sheds summary work separately while bounded ingest keeps serving." This matches frozen `reliability-operations.md:25-27` / `building-blocks/SKILL.md:61`: readiness covers the ingest path, the optional summarizer does not eject the fleet, and its capacity loss is handled by shedding. Admission, buffer, retry, drain and `400 × 2/3 × 0.6 = 160` arithmetic are unchanged.
- **E1 — FIXED in text.** `T5-report.md:61-63` keeps lexical and semantic lanes separate; `:66-71` no longer claims L1 paraphrase acceptance or a uniform negation-guarded overclaim rule and states AC-13 is L2-only. `pilot.md:169-172` says anchors are lexical grounding only, v1 substring matching can reject an equivalent paraphrase, and AC-13 remains unmeasured. `pilot.md:215-217` removes Lane B and limits the probes' meaning. The uniform-guard claim is gone rather than reworded.
- **E2 — REPLACED, but inside a malformed object.** `building-blocks/evals/evals.json:150-156` replaces `finite` with the substantive phrases "stream lifetime and drain deadline are finite" / "buffer, stream lifetime and drain deadline are finite". Neither matches "infinite"; the substring trap is closed. The object itself is broken (T5-F1).
- **E3 — REMOVED as permitted.** Denial-sensitive regex guards are deleted: RO eval 8 has 3 assertions (`evals.json:156-161`), IP eval 2 has 3 assertions with no regex in its assertions block, IP eval 5 has 3 assertions with no regex, and BB evals 5/6 have 3 each. The report assigns overclaim rejection to L2 (`T5-report.md:61-63`, `pilot.md:169-172`, `:186-188`). This is an acceptable bounded repair under the lead's direction; no guard pretend-safety remains.
- **Retired IP2 wording.** No assertion now pins the old step-count or universal-compensation rule; the surviving alternative "rather than a fixed step count" (`evals.json:44`) is a substantive selection statement, not a guard. Drift check on the other assertions found no re-pinned retired text.
- **Payment Lane A.** `matrix.ts:41-47` scores payment against integration-patterns eval 5 and drops the retired IP eval 2. `pilot.md:204-217` reflects the Lane B removal and the probe-only scope; probes call the real `checkAssertion` (`matrix.ts:76-107`) and cover finite-vs-infinite plus safe-denial lexical outcomes.

## Nine calibration outcomes (documentary, independent)

Same method as `T5-rubric-rereview.md`: packet L2 contract plus `semantic-evaluation.md`, lexical hits ignored. The only packet change from revision 2 is the OVL-C2 readiness clause; the other eight answers are byte-identical to the reviewed revision-2 text.

| Candidate | Expected | Independent |
| --- | --- | --- |
| PAY-C1 / C2 / C3 | unsound / sound / unsound | **UNSOUND / SOUND / UNSOUND** |
| TEN-C1 / C2 / C3 | unsound / sound / unsound | **UNSOUND / SOUND / UNSOUND** |
| OVL-C1 / C2 / C3 | unsound / sound / unsound | **UNSOUND / SOUND / UNSOUND** |

Result: 9/9 labels now survive independent mechanism review, including the repaired OVL-C2. This is calibration evidence, not discrimination evidence, and not a pass rate.

## Confirmed blockers

### [BLOCKER] T5-F1 — building-blocks `evals/evals.json` is not valid JSON

Evidence: `skills/system-design/system-design-building-blocks/evals/evals.json:156-157` and `:186-187`. In the third assertion of eval 5 the object opened at `:150` is never closed before `"description": "Requires explicit finite streaming bounds"` (`:156`) is followed by `]` and `}` (`:157-158`). Eval 6 repeats it: assertion object opened at `:180`, description at `:186`, then `]` and `}` at `:187-188`. Reading the file as JSON fails: `failed to parse: byte offset 6137: comma or end of sequence expected`. Every other changed eval file parses normally.

Why it blocks: the four package eval files are the binding contract. `evals:preflight`, `audit:skills`, and the prepared matrix (which parses BB eval 2 for the overload Lane A row, `matrix.ts:54-64`) cannot parse this file, so the T6 consolidated gate cannot run at all. Assertion counts and anchoring for this package are also unverifiable, which invalidates the `89`/`+17` claim (T5-F3) regardless of intent.

Adverse outcome: T6 starts the consolidated gate, `evals:preflight`/`audit` exits non-zero on a JSON parse error, and the only recovery is an unplanned eval edit after the freeze — exactly what the freeze rule forbids.

Bounded repair: close the two assertion objects (add `}` before the `]` at `:157` and `:187`). No assertion text, type, or value changes. Then re-run the JSON parse and recount; this is a syntax-only fix.

### [MAJOR] T5-F2 — sealed packet still identifies itself as revision 2

Evidence: `heldout.json:6` — `"revision": "2 — repaired after independent review … Revision 1 hash 040e9966… is superseded"`; `:15` — `"calibration_status": "Revision 2 repairs the three designated safe positives…"`. Neither records revision 3, the R6 repair, or supersession of the revision-2 digest `2855d6af…5537`. Only the OVL-C2 rationale (`:150`) says "Revision 3 repair".

Why it matters: the packet is the sealed grading contract. A grader or later reviewer binding `5543614b…` to this metadata sees revision 2 and cannot tell which bytes superseded `2855d6af…`, while `T5-report.md:27-40` calls the file revision 3. Provenance must resolve inside the artifact, not only in the owner report.

Bounded repair: update `:6` and `:15` to revision 3, record `2855d6af…5537` as the superseded revision-2 hash, and name the R6 readiness repair. No prompt, answer, evidence, or hard-failure text changes.

### [MAJOR] T5-F3 — assertion totals are wrong and contradict the unverified-structure statement

Evidence: `T5-report.md:55-56` states "34 evals … 89 assertions … +17 assertions." Actual counts: BB 18 (3 per eval × 6), RO 20, DA 35, IP 15 → **88 assertions, +16** over the 72 baseline. The same section then says (`:58-59`) that the current parse and assertion counts are unverified — it asserts a total it says it has not verified, and the invalid BB file makes the number unverifiable.

Bounded repair: after T5-F1, recompute the count and state 88 / +16 (or the corrected figure the parse produces). If the intent was to keep a fourth assertion somewhere, restore it as a real substantive assertion rather than adjusting the total to 89.

## Nonblocking observations

1. `building-blocks/evals/evals.json:153-154` — alternative 1 is a strict substring of alternative 2, so it adds no coverage. Keep the longer phrase and drop the redundant one; not padding by itself.
2. `matrix.ts:88-90` probe named "safe denial of retired step rule passes" has `expected: false`; the name contradicts the expectation. It and probe 4 (`:96-105`) exercise remaining `contains_any` anchors, not the deleted guards, so the names should say "safe denial does not match the lexical anchor" to prevent a T6 receipt being read as guard behaviour.
3. RO eval 8 no longer lexically tests the "not highly available" claim. Accepted under the lead's direction that L2 owns overclaim rejection; it should not be described as a retained guard anywhere.
4. `heldout.json` PAY/TEN rationales still say "Revision 2 repair". That is accurate history for those candidates; no change needed once T5-F2 records the packet-level revision.

## AC status at the frozen hashes

- **AC-ROI-12** — not satisfied as executed. The six negative calibrations are independently confirmed unsafe and the hard-failure contract is intact, but no semantic grading run exists.
- **AC-ROI-13** — not satisfied as executed. All three designated positives now survive independent mechanism review, and the documents correctly assign paraphrase acceptance to L2; no run exists.
- **AC-ROI-14** — satisfied for this step: five historical artifacts and both preserved first-review artifacts match their recorded bytes; no run, transcript, archive or root report changed. Exhaustive verification stays T6.
- L1 unmeasured; L2 unmeasured; L3 unavailable. No efficacy, ROI, runtime or acceptance claim is supported by this review.

## Evidence limits

No source edit, no packet/eval/pilot/matrix edit, no scorer/build/test/lint/formatter/generator/model run, no cloud or commit. All findings are from file reads plus SHA-256 binding. Sealed scenario text stays in this file for the lead/evaluation owner and must not be forwarded to T1–T3 content authors.
