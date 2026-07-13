# Live-Eval Remediation Ledger

This is the delivery ledger for improving skills after the 2026-07-12 full-catalog baseline. It distinguishes measurement repairs from proven skill improvements; neither is a passing score until a fresh selective run verifies it.

## Promotion Gate

A category may be promoted only after a complete current category run has:

- outcome assertion pass rate of at least 85% for every skill;
- trigger recall and specificity of at least 90% where trigger cases exist;
- no negative outcome delta; and
- an explicit reviewer and reason via `pnpm evals:promote`.

The case pass rate remains diagnostic because a case requires every assertion to pass.

## Completed Source Repairs (Awaiting Fresh Evidence)

| Cohort                                          | Repair                                                                                                                                                                 | Why it was needed                                                                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eval harness                                    | Incremental baseline, immutable evidence reuse, promotion gate, aggregate selective-path fix                                                                           | Full reruns were costly and the first selective aggregate manifest used the wrong prompt path.                                                              |
| Catalog integrity                               | Removed generic `contains_any` alternatives such as `name`, `inside`, and `mark`; audit now rejects them                                                               | These could pass irrelevant answers and inflated scores.                                                                                                    |
| Angular / Common / Database / Swift             | Repaired brittle literal checks, realistic prompts, PostgreSQL RLS guidance, and the Swift collection-transformation contradiction                                     | Failures showed semantic answers being marked wrong or the skill contradicting its eval.                                                                    |
| Laravel / PHP / iOS / React Native / Flutter    | Replaced internal-heading/exact-example checks with independent, user-visible behavior checks                                                                          | These skills were penalized for not repeating documentation headings or a single code spelling.                                                             |
| Common architecture / mobile UX / observability | Added compact decision workflows and scenario-based evals                                                                                                              | Their generic prompts did not exercise the actual skill workflow.                                                                                           |
| Common workflow skills                          | Replaced hidden-label and malformed literal assertions with observable diagnosis, evidence, discovery, ownership, and profile-adaptation checks                        | Correct answers were being rejected for not repeating internal labels such as `hybrid`, `Violation`, or `git bisect)`.                                      |
| Flutter                                         | Tightened BLoC and security activation boundaries; evaluated actual concurrency, GetX lifecycle, mounted, image-decoding, localization, and release-hardening behavior | Several evals required a sample spelling (`fluttersecurestorage`) or irrelevant API (`emit.forEach`) instead of the task outcome.                           |
| PHP / Laravel                                   | Repaired brittle sample-only PHP checks and corrected Eloquent strict-loading guidance to `Model::preventLazyLoading`                                                  | Valid PHP syntax, resource cleanup, non-blocking I/O, DTO boundaries, and Eloquent safety patterns were penalized by malformed or over-specific assertions. |

## Verified Evidence

The selective run `all-v2.6.0-2026-07-12T07-16-52-681Z-523b2d80` is immutable and verified. It confirmed that the source repairs were not merely static changes:

- `common-architecture-diagramming` and `common-mobile-ux-core` reached 100% outcome assertions.
- `common-observability` reached 88% outcome assertions.
- The newly covered `common-operator-profile` reached 75% outcome assertions with 100% trigger recall and specificity.

The run also identified remaining below-gate skills—especially Angular style guidance, Common system design, PostgreSQL, Laravel/PHP, React Native, and Flutter trigger boundaries. These remain active remediation work, not release-ready baselines.

The subsequent verified run `all-v2.6.0-2026-07-12T15-40-45-083Z-1d558d66` measured the repaired cohort with `gpt-5.6-luna` at high reasoning:

- average outcome assertion pass rate rose from **75.1%** to **95.8%**;
- below-gate skills fell from **30** to **11**;
- the remaining gaps were one Eloquent outcome cohort, one operator-profile outcome cohort, and activation-boundary cases in Android, Flutter, PHP, Python, and Swift.

Those 11 findings were then used for the final source-boundary repairs. They are not presented as a further measured result until a distinct frozen-source run exists.

### Static replay after source repairs (not promotion evidence)

The captured `with-skill` transcripts from the later 43-skill selective run regrade at or above 85% outcome assertions against the current repaired definitions. This catches invalid assertions without consuming quota, but it does **not** prove current behavior or activation quality: only the fresh isolated run below can do that.

## Remaining Waves

1. Run `EVALS_CONCURRENCY=1 pnpm evals:baseline -- --execute` to verify the completed source repairs. It reruns only changed lanes and regrades compatible transcripts under the pinned model/reasoning profile.
2. Use the fresh remediation queue to repair genuine missing or insufficient guidance, starting with Laravel, PHP, iOS, React Native, Flutter, and remaining Common skills below the gate.
3. Run a complete changed-category sweep before each category release, then promote with recorded review.
4. Run the complete catalog only for a model, protocol, scorer, or generation-environment change.

## Required Evidence Per Wave

```bash
EVALS_CONCURRENCY=1 pnpm evals:baseline -- --execute
pnpm evals:verify -- --run <runId>
pnpm evals:queue -- --run <runId>
pnpm evals:report
```

Do not claim a score improvement from static audit changes alone. The next live run is the source of truth.
