# BABOK-informed SDLC integration — evidence and limits

Date: 2026-10-23. Status: canonical implementation, generated packaging, and the bounded local verification checkpoint are complete. Independent final review, PR preparation, and maintainer human acceptance remain pending. This evidence records repository behavior; it is not legal clearance, IIBA endorsement, certified BABOK compliance, or proof of broad model efficacy.

## Practice and provenance

The implementation adds proportionate elicitation planning and confirmation, extends the existing shared requirements owner for conflict, quality-versus-need, and temporary-transition distinctions, and adds evidence-based diagnosis of solution-versus-organization limitations. It reuses existing owners and workflow contracts; it adds no parallel requirements ledger, schema, rule owner, or mandatory lifecycle.

The [practice crosswalk](practice-crosswalk.md) records the repository-owned practice dispositions and ten workflow decisions. The [source/reuse register](source-reuse-register.md) records the immutable converter provenance and the boundary between conceptual source use and independently authored repository practices. No converter code or private book passage, table, figure, prompt, rubric, answer, or provider receipt is included here. Redistribution rights remain unresolved; the private source-derived reference remains inactive and outside public delivery.

## Versions and workflow disposition

Observed `origin/develop` baselines and T5–T7 net changes:

| Package | Baseline | Integrated version |
| --- | ---: | ---: |
| Common | 2.9.1 | 2.9.2 |
| Product Management | 1.0.1 | 1.0.2 |
| Quality Engineering | 1.6.1 | 1.6.2 |
| Workflows | 1.1.7 | 1.1.8 |

The workflow metadata has no date field; the root CLI version did not change. Four selected workflow owners changed: `brainstorm-feature`, `plan-feature`, `implementation-readiness`, and `review-product-value`. Six selected workflows were intentionally unchanged: `design-solution`, `traceability-audit`, `verify-work`, `uat-signoff`, `retro-learn`, and `sdlc`. These are scoped dispositions, not claims that every host or workflow behavior was tested.

## Packaging and deterministic checks

The official corrective `generate-indices` command exited 0. Its associated verification wrapper exited 1: its ESM named-import adapter failed to load the CommonJS `WorkflowTransformer`, and the wrapper reported an aggregate non-target projection alert. That receipt remains failed. A separate independent read-only review used the repository's supported CommonJS transformer contract and verified all 20 selected skill/reference outputs against canonical bytes and all 9 workflow outputs against the supported command/skill/prompt transform. All 29 files were regular mode 644 with matching ownership/hash entries.

The independent reviewer reconstructed the six-root pre-generation aggregate by substituting only the four Product Management index Git HEAD blobs in memory. All six reconstructed hashes matched the recorded before hashes and all six current hashes matched the recorded after hashes. Within those six roots, the measured non-target delta was exactly four selected Product Management indexes; the other 1,901 non-target files were unchanged (1,905 files total; zero symlinks). Each index is an owned mode-644 generated output with only the two qualified elicitation terms added to the selected BRD row. This aggregate does not cover empty-directory changes or paths outside the six roots. The independent evidence closes the projection finding; it does not retroactively pass the wrapper.

Recorded local checks:

- `validate:all`: 333 passed, 0 failed, 55 warnings.
- `audit:sdlc`: PASS.
- `check-alignment`: passed the ≥70% threshold; 3 warnings.
- `audit:keywords`: 134 warnings; the new qualified BRD terms did not collide.
- Five-skill preflight: 0 issues; the original benchmark report was restored.
- Fresh local CLI captures matched 64 baseline and 65 candidate selected files. Twelve exact prompt identities were captured per arm; numeric CLI exit codes were not exposed.

## Matched selected-source payload

The selected-source contract was applied to the existing exhaustive per-file receipts; there was no tokenizer rerun or source snapshot mutation. Counts use `gpt-tokenizer@4.1.0`, explicit `o200k_base`, summing independently encoded complete files.

The 13 remaining selected-source files are `skills/metadata.json`, the root `LICENSE`, seven selected-package `evals/evals.json` files, and four public example files: two `source-observation.txt` files and two synthetic ledgers.

| Matched source group | Baseline | Candidate | Candidate minus baseline |
| --- | ---: | ---: | ---: |
| Seven top-level selected skill entries | 7 files / 7,829 tokens | 7 / 8,141 | +312 tokens |
| Ten selected workflows | 10 / 11,213 | 10 / 11,421 | +208 tokens |
| Lazy reference Markdown | 32 / 54,312 | 33 / 56,582 | +2,270 tokens |
| Other selected-source files | 13 / 31,318 | 13 / 31,346 | +28 tokens |
| **Selected-source total** | **62 / 104,672** | **63 / 107,490** | **+1 file / +2,818 tokens** |

The candidate selected-source digest is `7726a7bdb9c75bda7ea8a7714ce1148be7c83cdb3e5f73a23f31150f93fca303`. The exhaustive baseline root contains 28 workflow files absent from the candidate, so the unmatched full-root totals are not a comparable package reduction and are not presented as one. These are local file-payload counts, not observed prompt consumption, provider usage, billing tokens, cost, or savings.

The repository metric `ceil(JS UTF-16 length / 4)` applies only to top-level `SKILL.md` files; it excludes workflow bodies and lazy references. It is a separate heuristic, not the named tokenizer result or a provider counter.

## Bounded semantic result and interpretation

Independent grading covered 12 paired synthetic scenarios (24 graded outputs): baseline 11 PASS / 1 PARTIAL / 0 FAIL; candidate 12 PASS / 0 PARTIAL / 0 FAIL. One bounded completeness improvement was observed; the other 11 cases tied. No critical semantic regression was observed. The result does not establish statistical or causal superiority, general efficacy, complete BABOK equivalence, or behavior outside these scenarios.

Thirty-five raw runtime-usage fields were observed, but counter semantics, coverage of all agents, and pricing remain unverified. No session total, invoice total, uncached-token total, cost, or savings claim is made. The bounded CLI captures and scenarios do not establish every host's read-first behavior, alias resolution, aggregate context assembly, bytes actually consumed, or host-level isolation/containment.

## CI wrapper-parity follow-up

The first CI unit-test run failed the repository-wide checked-in workflow-wrapper parity case for `review-product-value`: its three derived host wrappers did not yet include the canonical workflow's latest limitation-diagnosis reference. This repository-wide test surface is broader than the configured-root generation proof above. The three wrappers were regenerated using the existing `WorkflowSyncService` and `WorkflowTransformer`; the targeted parity test then passed (1 passed, 42 skipped, 0 failed). This is a targeted local test result, not a full-suite pass. A CI rerun is pending the parent-owned push.

## Acceptance boundary

Implementation, packaging, and bounded verification are complete. Separate final review, PR preparation, and maintainer human acceptance are pending. No merge, release, activation, private-reference publication, or legal clearance is implied.
