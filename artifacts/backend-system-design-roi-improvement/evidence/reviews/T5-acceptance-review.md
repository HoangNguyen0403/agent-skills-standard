# T5 acceptance review — revision 4 (F1–F3 corrective)

## Verdict: APPROVE — bounded syntax/provenance/count correction; semantic payload preserved; T6 consolidated no-model gate may open

Read-only verification of the settled F1–F3 delta. `T5-final-review.md` (`dabd1db1…47cba`), `T5-rubric-review.md` (`6fecc9ef…4575`), `T5/first-review-evidence.md` (`7f863d75…a4dc`) and the two earlier rereviews are unmodified. No source, packet, eval, pilot, matrix or report edits; no scorer, test, build, generator, model or T6 check. JSON parsing below used the read tool's JSON reader only.

## Accepted artifact hashes (live, independently recomputed)

| Artifact | SHA-256 |
| --- | --- |
| `benchmarks/evals/backend-system-design-roi-skills.txt` | `41c57a510a98bdb61d25e37385ae70e3d2db8b655ce5569cc1ae3ebf17f801ac` |
| `benchmarks/evals/backend-system-design-roi-heldout.json` (rev 4) | `5fcd1f4bcc7ff439cb950afa65be0d50f5421776911585237ef1e65f4861f0d7` |
| `benchmarks/evals/backend-system-design-roi-pilot.md` | `313471bad524c462e65f5e653c1a10b8bff0df20044b4fcb26e6e05b949217ac` |
| building-blocks `evals/evals.json` | `790720f0bb7eeccbf490dd4dce61ffc09421536f01fdd789edeac6ebddd86ed1` |
| resilience-ops `evals/evals.json` | `3b4d00fdaba7583829a507186fd162565d2246239e9007042ad701bedff29c98` |
| data-architecture `evals/evals.json` | `f423bd960bace40726c4ae212fd70a7c5e50b7f6abb275d90312ce64323bc4e0` |
| integration-patterns `evals/evals.json` | `dc42d929ae5d0c8799c788a450ab5b196ed113a56ee57ecf0a13d5e8ec1a834a` |
| `T5/lexical-candidate-matrix.ts` | `a97fe9397f22b49ff4e38e31a8ded326d8dbfa2045279b55360e0abf77db3549` |

These equal `T5-report.md` §2. RO/DA/IP eval hashes and `skills.txt` are unchanged from revision 3; the only changed eval bytes are BB. All eleven accepted-source digests still match the freeze manifest.

## F1 — syntax closure (verified)

`skills/system-design/system-design-building-blocks/evals/evals.json` now parses. Per-eval assertion counts: `[3,3,3,3,3,3]` (18). Bounded comparison of evals 5 and 6 against the revision-3 text read earlier in this session shows identical IDs, prompts, `expected_output`, assertion types, values, alternatives and descriptions; only the two closing braces before `:157` and `:187` are added. I did not retain revision-3 bytes, so this is a bounded textual comparison plus the recorded hash/supersession, not a byte-diff.

## F2 — metadata provenance (verified)

Reviewed target is **revision 4** (`5fcd1f4bcc7ff439cb950afa65be0d50f5421776911585237ef1e65f4861f0d7`), the metadata/provenance correction of revision 3. Packet metadata records revision 3 `5543614b626c55e7c691e3e89eaac5da66cfab9f2e794384ca68c6b3482f76d8` and revision 2 `2855d6af8f08d066c0d0a51f041e9ad1a658904927d1f46f1653a715c8d35537` (and revision 1 `040e996682f548626304ed4405f997942b3f4f80fd091e789c280ac21cb98e17`) as superseded; the R6 readiness repair is named; and the packet states revision 4 changed metadata only. `calibration_status` records independent acceptance of all nine labels and states no verdict is executed evidence.

Payload: I re-read all three cases (prompts, changed constraints, invariants, mandatory evidence, hard failures, source fixtures) and all nine calibration entries (prompt, answer, expected verdict, rationale). They are textually identical to the revision-3 content adjudicated in `T5-final-review.md`, including the repaired OVL-C2 readiness sentence. Revision-3 bytes were not retained, so this is bounded section-by-section equality, not an independent byte diff.

## F3 — counts and claims (verified)

Parsed counts: BB 18, RO 20, DA 35, IP 15 = **34 evals / 88 assertions**, i.e. `+5/+16` over the 29/72 baseline. `T5-report.md` §3 now states 88/+16 and notes the JSON reader used, with scorer behaviour deferred to T6. AC-ROI-12 and AC-ROI-13 are marked not satisfied as executed; the report describes the nine-label acceptance as calibration review, not execution. `pilot.md:247-248` and §7 use the same limitation. No lexical paraphrase or soundness inference remains.

## Matrix probe label (verified)

`matrix.ts` probe 3 is renamed "safe denial may miss lexical anchor" with `expected: false`, which matches the candidate/assertion pair. Lane B stays removed; probes still call the real `checkAssertion`; Lane A still maps payment to IP eval 5. No execution claim is made for any of it.

## Nonblocking observations

1. `T5-report.md` §2's "superseded" line lists only revision-1 heldout and pilot digests; revision-2/3 heldout digests are recorded in the packet but not in the report. Packet provenance is authoritative and sufficient; adding them to the report would make the manifest self-contained.
2. The OVL-C2 packet rationale still says "Manual re-adjudication is required"; the independent acceptance is recorded at packet level. This is a conservative per-candidate caveat, not a contradiction.
3. RO eval 8 has no lexical guard for the availability claim; accepted under the lead's direction that L2 owns overclaim rejection.

## Status separation

- Documentary acceptance: this review approves the eight artifact hashes above for the T6 consolidated no-model gate.
- Executed evidence: none. L1/L2 have not run, L3 is unavailable, no model or paid pilot ran, and AC-ROI-12/13 remain unsatisfied as executed criteria.
- AC-ROI-14 historical spot checks still match; exhaustive archive verification and the integrated gate remain T6.
- Human acceptance, T7 pricing/authorization and release remain separate and are not implied.

Sealed scenario detail stays with the lead/evaluation owner; do not forward to T1–T3 content authors.
