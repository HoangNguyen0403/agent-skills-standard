# Trustworthy 100% Skill-Eval Remediation Task List

Derived directly from `PLAN (2).md`; the plan is the approved scope for this implementation.

| Slice                                               | Plan trace                       | Status   | Evidence                                                                                                   |
| --------------------------------------------------- | -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| V2 contracts and v1 adapter                         | Measurement and Artifact Repairs | complete | `scripts/evals/types.ts`, `scripts/evals/snapshot.ts`, root v2 tests                                       |
| Immutable historical inputs                         | Measurement and Artifact Repairs | complete | `all-v2.6.0-2026-07-10/inputs.json`, Dart `inputs.json`, `pnpm evals:verify -- --all`                      |
| Shared manifest generation and paths                | Measurement and Artifact Repairs | complete | `scripts/evals/manifest.ts`, CLI/MCP v2 aggregate fixtures                                                 |
| Incomplete-run and compromised-arm gates            | Measurement and Artifact Repairs | complete | root v2 tests; canonical `evals-run` workflow                                                              |
| Aggregate report projection                         | Correct reporting                | complete | `latestPerCategory` test; report shows 22 categories / 264 skills                                          |
| Assertion and trigger definition audit              | Eval and Skill Remediation       | complete | `scripts/evals/quality.ts`, `benchmarks/evals/eval-audit.json`                                             |
| Remediation queue classification                    | Eval and Skill Remediation       | complete | `benchmarks/evals/remediation-queue.json` regenerated from `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584`; 1,619 current items, with no compromised-generation classifications |
| Clean v2 live category/full-catalog reruns          | Final acceptance                 | complete    | Clean replacement run `all-v2.6.0-2026-07-12T02-24-23-912Z-e2253584` has 3,220/3,220 arms, no compromised skills, immutable inputs/results, 264 skills across 22 categories, and passes run-level plus `--all` verification, `pnpm test:evals`, and `git diff --check`; report headline is baseline 40%, with-skill 66%, delta +26%, balanced trigger accuracy 96% |
| Skill guidance remediation and held-out paraphrases | Final acceptance                 | pending     | Dart guidance/assertion fixes are snapshot-backed and the clean full-catalog evidence is complete; an independent held-out trigger-paraphrase dataset/run is not yet defined in the repository |
