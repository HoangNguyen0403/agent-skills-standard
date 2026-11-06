# Remove two denial-unsafe lexical bans — bounded evaluation-fixture correction

Personal project agent-skills-standard, authorized workspace /Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo. Existing approved A+B1 scope and Subagent-Driven execution. Guidance Cheap owner completed original plus one corrective round; integrated review found two remaining same-class invalid evaluator assertions. Route to eligible Personal - DeepSeek; no premium, installs, commits, live model calls, scorer redesign or delegation.

Read AGENTS/applicable common/JSON/evaluation standards, packet-3.md and approved SRS. Own ONLY `skills/database/database-query-performance/evals/evals.json` and `skills/system-design/system-design-data-architecture/evals/evals.json`, plus new eval-negation-receipt.md in this artifact directory. All prior source owners frozen; no renderer/exporter/trace or guidance prose changes.

Integrated source reviewer4811d741 notificatione78addb3, snapshot `.agent/sdd/execution-plan/review-52671cf9e-workspace-53a1c6a20895-11a187f0b713.diff`, same base52671cf9ed6a1c376dfaaae7e621dbc51a4c8765. Exact two defects:
- database evals lines48-51 `not_contains: "just add Redis"` rejects a correct answer 'Do not just add Redis; fix the suspected amplification with bounded batching…'.
- data architecture evals234 `not_contains: "just shard the database"` rejects correct 'Do not just shard the database…'.
Actual consumer scripts/evals/scorer.ts193-194 performs literal substring rejection regardless of negation. Source-derived counterexamples; no live run executed or required.

Remove these two unsafe negative assertion objects, maintaining valid JSON and the meaningful positive lexical smoke assertions. Do NOT replace them with another forbidden wording, modify scorer, weaken actual semantic rubric or delete cases/negative-control examples. Judgment of recommendation-versus-rejection remains in existing manual semantic rubric/held-out cases. Existing prior 'universal fix' literal ban already removed; preserve that correction.

SKIP tests/build/lint/formatter mid-flight. Parent checks JSON and invokes real deterministic assertion scorer against compliant negated advice if dependencies available; no model execution. If parser/scorer dependency absent, report prerequisite exactly rather than add harness/runtime. Return exact removed assertions/caseIDs, owned files and frozen receipt, test NOT RUN. Independent integrated source rereview after freeze closes this finding; no live efficacy/acceptance claim.
