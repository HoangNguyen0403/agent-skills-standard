Audit result: structural failure.

- 150 lines exceeds the 100-line body limit; compress repeated prose and move detailed material to `references/`.
- A 20-line code block violates progressive disclosure; extract it to a focused reference and leave a short link or invocation.
- Keep frontmatter under 100 words with third-person What + When capabilities and surgical triggers.
- Remove generic explanations, duplicated frontmatter, and untested guardrails; preserve only project-specific, actionable rules.
- Snapshot before editing: `cp -r <skill-dir> <workspace>/skill-snapshot/`.
- Remeasure line count and code fences, run with-new-skill versus snapshot/baseline evaluations, iterate on evidence, and rerun trigger tests if the description changes.

Completion requires a compact core workflow, references for long examples, and recorded benchmark evidence—not cosmetic shortening alone.

