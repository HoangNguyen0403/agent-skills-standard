# T5 sealed rubric re-review — independent re-adjudication of revision 2

## Verdict: CHANGES REQUESTED — one designated safe positive still carries a source-conflicting mechanism

Keep with lead/evaluation owner. Do not forward sealed prompt or candidate text to T1–T3 content authors. This reviewer authored no guidance, packet, eval, or report; no source text was changed. Manual semantic adjudication only — not model execution, scorer discrimination, runtime behaviour, efficacy or human acceptance.

Scope: `backend-system-design-roi-heldout.json` revision 2 against plan §5 T5 and AC-ROI-12/13/14, the accepted source freeze, and the unmodified `T5-rubric-review.md` (revision-1 blockers R1–R5). The prior report is preserved; baseline bytes for the three T5 artifacts match the owner manifest.

## Binding (independently recomputed, no scorer/build/model run)

| Artifact | Live SHA-256 | Owner receipt |
| --- | --- | --- |
| `benchmarks/evals/backend-system-design-roi-heldout.json` | `2855d6af8f08d066c0d0a51f041e9ad1a658904927d1f46f1653a715c8d35537` | T5-report §2 — match |
| `benchmarks/evals/backend-system-design-roi-skills.txt` | `41c57a510a98bdb61d25e37385ae70e3d2db8b655ce5569cc1ae3ebf17f801ac` | match |
| `benchmarks/evals/backend-system-design-roi-pilot.md` | `26845bc6bbc98b28fd029e5e064f5ce670ae246d1c0817180cefc8667a047331` | match (rev-1 `c2175729…` and observed `109f36d0…` correctly marked superseded) |
| `T5-rubric-review.md` (preservation) | `6fecc9ef96387b36290178987843faa0ed11edad0e40109573f6c6ca84704575` | match |
| `T5/first-review-evidence.md` (preservation) | `7f863d757949619be20b686c4c0580e77afa58e717850777592ade28a6a1a4dc` | match |
| `accepted-source-freeze.json` | `3b1ab8f9446783770bb10c091ed7682735679090c168bcc81442fc3ea13f55a8` | 10 source files; corrected resilience-ops full digest `b9628d52…280ba7fc5d0e32` |

All eleven accepted source digests (four T1, three T2, three T3, read-only idempotency contract) match the freeze manifest and the accepted rereviews listed in it; the earlier truncated RO digest is a transcription artifact only, not a source change. Historical spot checks (`professionalization-skills.txt 243f7c…`, `professionalization-heldout.json 454f68…`, `history.json dd1ab6…`, `benchmark-report.md 0b2bd3…`, `evals-report.md 012126…`) all match the baseline manifest.

## Independent adjudication of the nine calibrations

Method: the packet's L2 contract (invariant + ≥4/5 mandatory evidence + no hard failure) plus the repository `system-design/system-design-review/references/semantic-evaluation.md` rubric (no applicable dimension at 0, ≥85%, no hard failure). Lexical hits were ignored. Manual application only. No candidate was rejected for synonyms or structure.

Loaded rules this session (MCP compliance audit before writing): `common-code-review`, `common-security-audit`, `common-llm-security`, `specialist-architecture-guard`, `system-design-principles`, plus file-routing authoring rules. The audit's generic Markdown/product-management warning does not apply to this sealed evaluation contract.

| Candidate | Expected | Independent | Decisive mechanism |
| --- | --- | --- | --- |
| PAY-C1 | unsound | **UNSOUND** | Fresh reference per attempt defeats provider dedupe; timed-out debit reported failed. |
| PAY-C2 | sound | **SOUND** | Per-instruction reference reused; "processing" held as unknown; base reissue only after final negative; variant reissues nothing until settlement match plus manual no-debit confirmation; absent row rejected as proof; narrowed guarantee. |
| PAY-C3 | unsound | **UNSOUND** | Invents bank duplicate rejection; eventual accounting cannot undo a duplicate debit. |
| TEN-C1 | unsound | **UNSOUND** | Post-retrieval filter, tenant-free cache key, privileged role, relevance-as-authorization. |
| TEN-C2 | sound | **SOUND** | Derived attribution compared to authoritative owner with quarantine; scope bound into SQL predicate and vector query; cache key includes customer id and stored-id match; generation/watermark gates snapshot, export and restore before the six-hour rebuild; post-deletion probe set. |
| TEN-C3 | unsound | **UNSOUND** | Source-row absence asserted as copy revocation. |
| OVL-C1 | unsound | **UNSOUND** | Absorb-everything queue, uncapped retries, liveness-driven readiness, replica-count HA. |
| OVL-C2 | sound | **UNSOUND (single clause) — disagrees** | Arithmetic and bounds are sound (200 req/s demand, 120-concurrency capacity estimate at 300 ms mean, 96 KB = 8 s buffer, 576 MB aggregate, 160 req/s residual, 128 admitted / 72 shed), but "Readiness follows summarizer health, not process liveness" conflicts with frozen T1 guidance; see blocker. |
| OVL-C3 | unsound | **UNSOUND** | Explicit unlimited admission, buffers, retries and drain. |

Eight of nine labels are correct. The repaired payment and tenant positives now pass the mechanisms that blocked revision 1 (R1, R2, R4): the payment base declares the dedupe/status capability the variant removes, so the changed constraint is real; the tenant positive re-authorizes corrupt derived scope and gates snapshot/export/restore during rebuild lag.

## Confirmed blocker

### [MAJOR] T5-R6 — overload positive makes readiness depend on a non-mandatory shared dependency

Evidence: `heldout.json:148` (ROI-OVL-01-C2 answer) states "Readiness follows summarizer health, not process liveness." The case's own admission design treats summarizer capacity as a bounded downstream constraint, not a health gate. Frozen accepted source: `system-design-resilience-ops/references/reliability-operations.md:25-27` and `building-blocks/SKILL.md:61` — readiness may depend on required dependencies only; an optional dependency degrades its response and "must never eject the fleet"; a mandatory auth/quota check fails closed per request rather than by health state, and "Marking every replica unready still empties discovery".

Why: for the ingest request class the summarizer is optional enrichment — transcripts can still be admitted with summary work shed. Making readiness follow summarizer health converts a partial summarizer-capacity loss into fleet-wide ejection of ingest instances, removing the very admission capacity the case is testing, and it contradicts the accepted T1 rule that no health/ejection/panic state may substitute for serving/authorization decisions. The case's `hard_failures` list covers only unboundedness, over-admission and false success reporting, so a grader following the rubric could still return `sound` — the expected label hides the defect rather than detecting it, which is exactly the failure class AC-ROI-13 must not cement.

Adverse timeline: one-third summarizer capacity loss; summarizer health degrades; every ingest replica fails readiness; discovery empties; public/transcript traffic is rejected even though bounded ingest (with shed summaries) was available. Replica count and per-connection bounds do not help, because the instances are not in rotation.

Violated contract: AC-ROI-13's safe-positive calibration relative to the accepted T1 source; T1-A1's readiness/enforcement rule. Not a case-invariant failure under the current hard-failure list, so the repair is the candidate sentence (optionally plus a paired hard-failure clause if the evaluator wants the rubric to catch it).

Bounded repair: replace that clause with readiness on the ingest path (process/ingest health), and state that summarizer degradation sheds summary work while ingest keeps serving; keep the existing admission, buffer, retry, drain and residual arithmetic unchanged. Do not add a new mechanism or change the scorer schema.

## Other calibration observations (nonblocking)

1. `heldout.json:100` — "until the nightly file has been matched for this reference and the manual queue confirms the bank shows no debit". The conjunction is safe; "matched" is loose enough to read as "a row was found". Prefer "checked for a row and the manual queue confirms no debit posted" so a grader cannot read a posted row as permission.
2. `heldout.json:124` — "live caches and reranker features read the current generation" implies but does not state that a hit stamped with an older generation is denied. One clause would remove grader discretion.
3. `heldout.json:148` — 120 concurrent is the estimated capacity at the stated demand, not an admission cap that binds 200 req/s; and the 128 req/s admitted figure has unexplained headroom below the 160 req/s residual. Both are conservative and do not violate the invariant, but the labels should not be read as derived limits.
4. Numeric checks I reproduce independently: 6,000/30 = 200; 400 × 0.3 = 120; 96 KB / 12 KB/s = 8 s; 6,000 × 96 KB = 576,000 KB = 576 MB decimal; 400 × 2/3 × 0.6 = 160; 200 − 128 = 72. All consistent.

## AC status at the frozen hashes

- **AC-ROI-12** — manual discrimination supported: all six expected negatives are genuinely unsafe, including all three keyword-complete negatives, and hard failures dominate vocabulary. Not satisfied as an executed criterion: no independent semantic grading run exists.
- **AC-ROI-13** — two of three positives now survive independent mechanism review; the overload positive fails on the readiness clause above. Not satisfied pending repair and execution.
- **AC-ROI-14** — satisfied for this bounded step: five historical artifacts and both preserved review artifacts match their recorded bytes; no run, transcript, archive or root report was touched. Exhaustive archive verification remains T6.

## Evidence limits

No source/eval/packet writes, no scorer, build, test, lint, formatter, generator, model call or candidate execution. Calibration verdicts are manual documentary adjudication, not discrimination evidence, runtime proof or efficacy. L3 remains unavailable; the L1 matrix was not run and this report makes no pass-rate claim. Human acceptance remains separate.
