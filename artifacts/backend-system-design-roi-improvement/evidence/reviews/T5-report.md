# T5 readiness report — revision 4 syntax/provenance correction

Status: **revision-3 package eval content and semantic packet payload preserved; BB eval JSON syntax
repaired; heldout metadata advanced to revision 4; prepared matrix updated; no executable checks run.**
Source freeze remains the accepted T1–T3 revision set. No scorer, test suite, generator, or model run;
no efficacy, ROI or acceptance claim.

Owner: T5. Baseline revision `92d06c420f6a41f08e11579423e4e3eacdb7880d`. Accepted source revisions
verified by SHA-256 against `T1-architecture-rereview.md`, `T2-deepseek-rereview.md`,
`T3-architecture-rereview.md` before binding; all ten accepted source files matched.

## 1. Freeze manifest — source (accepted revisions)

| Path | sha256 |
| --- | --- |
| `system-design-building-blocks/SKILL.md` | `48d3b5576fd8862c5afafce441deb9872ec059dae3fe413dac43bf5e7180ff6a` |
| `system-design-building-blocks/references/building-blocks.md` | `35c8f78b27316e283127b5c76ef2a9b653738c27214fc4ee38ba54470df85c22` |
| `system-design-resilience-ops/SKILL.md` | `c17b0748a32f9c2f46d74133ff2e17e3e74a5faad3b1576ef449f47f95677153` |
| `system-design-resilience-ops/references/reliability-operations.md` | `b9628d52dcfe04dbe81b349131d5e4cc873f73b9513251132b280ba7fc5d0e32` |
| `system-design-data-architecture/SKILL.md` | `e673583ba86f4fb92be74924a85eb139df4476b93b5ce7ddf1730ccd591a796d` |
| `system-design-data-architecture/references/flow-contracts.md` | `6215b36242151b6238253d52dfcdbf4eaf8fe6acae137d1618aae8d2aa77281c` |
| `system-design-data-architecture/references/tenant-safe-retrieval.md` (new) | `fa37e6f2569c328b0dd9cd87d103e523968d47a2c7f0ea47932b44198683d571` |
| `system-design-integration-patterns/SKILL.md` | `090c5da313f93e27a7b30bf63dff2b355e87ee35474e302f8632016958851a42` |
| `system-design-integration-patterns/references/integration-patterns.md` | `d9a7c2b62030cdef45338fd9125803a06853367870d05569fa5cbbe34ad9167a` |
| `system-design-integration-patterns/references/durable-execution.md` (new) | `eb41305df4fbe02931de0df55fc151388c289d260c50a4b5a7194fc5d7bf16f4` |
| `system-design-principles/references/idempotency-contract.md` (read-only) | `72c8785c970aa03238832380a8dcd2059594bcfd76c8132d529fc424e68b2b7a` |

## 2. Freeze manifest — T5 artifacts

| Path | sha256 |
| --- | --- |
| `benchmarks/evals/backend-system-design-roi-skills.txt` | `41c57a510a98bdb61d25e37385ae70e3d2db8b655ce5569cc1ae3ebf17f801ac` |
| `benchmarks/evals/backend-system-design-roi-heldout.json` (revision 4 metadata-only) | `5fcd1f4bcc7ff439cb950afa65be0d50f5421776911585237ef1e65f4861f0d7` |
| `benchmarks/evals/backend-system-design-roi-pilot.md` | `313471bad524c462e65f5e653c1a10b8bff0df20044b4fcb26e6e05b949217ac` |
| `skills/system-design/system-design-building-blocks/evals/evals.json` | `790720f0bb7eeccbf490dd4dce61ffc09421536f01fdd789edeac6ebddd86ed1` |
| `skills/system-design/system-design-resilience-ops/evals/evals.json` | `3b4d00fdaba7583829a507186fd162565d2246239e9007042ad701bedff29c98` |
| `skills/system-design/system-design-data-architecture/evals/evals.json` | `f423bd960bace40726c4ae212fd70a7c5e50b7f6abb275d90312ce64323bc4e0` |
| `skills/system-design/system-design-integration-patterns/evals/evals.json` | `dc42d929ae5d0c8799c788a450ab5b196ed113a56ee57ecf0a13d5e8ec1a834a` |
| `.agent/sdd/.../T5/lexical-candidate-matrix.ts` (prepared, unexecuted) | `a97fe9397f22b49ff4e38e31a8ded326d8dbfa2045279b55360e0abf77db3549` |
| `.agent/sdd/.../T5/first-review-evidence.md` | `7f863d757949619be20b686c4c0580e77afa58e717850777592ade28a6a1a4dc` |
| `.agent/sdd/.../T5-rubric-review.md` (independent review) | `6fecc9ef96387b36290178987843faa0ed11edad0e40109573f6c6ca84704575` |
| `.agent/sdd/.../T5-final-review.md` (independent review) | `dabd1db15bcfcb3843a956e9158136f59589e8c23345ac9e1cf2c57355447cba` |

Superseded, not evidence: heldout rev 1 `040e9966…98e17`; pilot rev 1 `c2175729…43ff1c`; pilot bytes
observed by the reviewer `109f36d0…29f9`. The earlier stale-receipt mismatch is reconciled here and
the pilot document no longer carries a self-digest.

## 3. Source bindings (eval → accepted source)

| Package | Bound eval work | Accepted source it binds to |
| --- | --- | --- |
| `system-design-integration-patterns` | eval 2 rewritten (constraint-driven coordination replaces the fixed step count and the universal-compensation rule); eval 5 added (unknown outcome, operation vs delivery identity, evidence and named repair path before a second effect) | `SKILL.md` consistency rules, `integration-patterns.md` identity/dedupe, `durable-execution.md` unknown-outcome and version sections, read-only idempotency contract |
| `system-design-data-architecture` | eval 15 added (scope through retrieval/rerank/cache/job, relevance is not authorization, revocation separated from erasure, immediate deny on serving paths, propagation bound and tombstone) | `SKILL.md` ownership/consistency, `flow-contracts.md`, `tenant-safe-retrieval.md` |
| `system-design-resilience-ops` | eval 8 added (required vs optional dependencies, mandatory checks fail closed, capacity measured after failure, no HA from replica count) | `SKILL.md` SPOF/failover/rollout, `reliability-operations.md`, building-blocks failure capacity |
| `system-design-building-blocks` | eval 5 added (stream buffer units, producer backpressure, resumable close, finite bounds); eval 6 added (conserved shares vs copied budget, atomic ledger with lease, declared bound type and partition mode) | `SKILL.md` caching/queue/edge rules, `building-blocks.md` stream bounds and limiter shapes |

Totals: 34 evals across the four packages, 88 assertions — baseline was 29 evals / 72 assertions, so
+5 evals and +16 assertions, with eval 2 of the integration package replaced rather than kept.

The JSON reader parsed all four eval files and counted 34 evals / 88 assertions; BB evals 5 and 6
were missing closing braces, now restored without changing assertion content. No scorer or executable
suite was run; scorer behavior remains for the T6 consolidated gate.

Lexical assertions and the semantic hard-gate rubric stay separate: the package evals are calibrated
lexical gates only; soundness is decided by the sealed rubric in `heldout.json`, never by these
assertions.

## 4. AC status

- **AC-ROI-12** — the hard-invariant contract is recorded; independent semantic grading has not run.
  Lexical assertions are not soundness evidence, so **not satisfied**.
- **AC-ROI-13** — three designated positive candidates passed independent mechanism review within
  the nine-label calibration, but paraphrase acceptance was not measured by execution; anchored
  `contains_any` alone cannot establish it. **Not satisfied as executed.**
- **AC-ROI-14** — historical bytes and provenance unchanged. Satisfied for this step: the five
  historical artifacts still match their baseline digests (`243f7c…`, `454f68…`, `dd1ab6…`,
  `0b2bd3…`, `012126…`), independently re-verified by the reviewer, and no run, transcript, archive or
  root report was touched. Exhaustive archive re-verification stays T6.

## 5. Rubric and lexical corrections

R1–R5 repairs remain as documented: payment finality before reissue, tenant re-authorization and
immediate serving-path revocation, coherent overload arithmetic, a real changed constraint, and
corrected source receipt. R6 is repaired in the overload positive: ingest readiness follows its
request path; optional summarizer degradation sheds summary work without ejecting ingest capacity.

E1–E3 corrections: anchor provenance is only lexical grounding, not paraphrase acceptance; the BB-5
`finite` substring trap is replaced by a substantive finite-bound phrase; unreliable denial-sensitive
overclaim guards were deleted rather than treated as denial-safe. Semantic hard-gate rejection stays
with independent L2 grading. No invariant was weakened.

## 6. Exact script paths for T6

- Matrix: `rtk node --import tsx .agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.ts`
  — exit 0 expected, writes `T5/lexical-candidate-matrix.json`. Prepared, not executed.
- Preflight: `rtk pnpm evals:preflight -- --skills-file benchmarks/evals/backend-system-design-roi-skills.txt`
  — writes `benchmarks/evals/eval-preflight.json`; hash the existing file first and preserve its bytes.
- Audit: `rtk pnpm audit:skills` — writes `benchmarks/evals/eval-audit.json`, same preservation rule.

## 7. Redacted readiness

Independent review accepted all nine revision-3 calibration labels. Ready for the T6 consolidated
gate after lead approval; no scorer, preflight, audit, or runtime check has been run. Not ready for
any efficacy, runtime or ROI statement — L3 remains unavailable and the no-AGS arm is an assumption,
not an enforced guarantee. No sealed scenario detail is reproduced here; do not forward it to content
authors.

Boundary: only the three locked benchmark paths, the four locked `evals.json`, and the T5 evidence
directory were written. Packet revision metadata was updated without changing prompts or calibration
payload. No skill body or reference edited, no mirror touched, no historical fixture or report
modified, no dependency change, no commit.
