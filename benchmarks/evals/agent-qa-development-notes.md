# agent-qa development evidence

The new quality-engineering skill covers selected agent-qa regressions and
recorded memidex evidence. It preserves the registry's separate healing contract.

## Transcript evaluations

Two fresh selective runs used the repository's isolated Codex CLI workers with
`gpt-5.6-luna`, high reasoning, and concurrency 2. Baselines received the task;
with-skill arms received the same task and SKILL.md. Routing arms received only
the name and description. References were not delivered to the model workers.
The native runner instructs workers not to use tools; it does not retain
tool-use evidence, so tool-free execution is not certified.

- [Iteration 1](runs/agent-qa-development-2026-10-25-iteration1/manifest.json):
  28 fresh answers. The original lexical checks both accepted an invalid baseline
  command and rejected a correct dry-run explanation. Its scores are retained
  for audit, not treated as efficacy evidence.
- [Iteration 2](runs/agent-qa-development-2026-10-25-iteration2/manifest.json):
  30 fresh answers after command/healing clarification and a memory-pressure case.
  Review found further equivalent-wording false negatives in both arms.
- [First regrade](runs/all-v2.6.6-2026-10-25T12-48-20-389Z-cadc25af/manifest.json):
  preserved intermediate scoring correction; no new model calls.
- [Final regrade](runs/all-v2.6.6-2026-10-25T12-50-13-711Z-9d7134e0/results.json):
  all 30 answer files are byte-identical to iteration 2. Corrected assertions
  accept equivalent uncertainty phrasing while retaining exact command checks.

Final transcript scores are 5/5 behavior cases with the skill and 4/5 without it;
14/14 versus 12/14 assertions. Both routing recall and specificity are 10/10.
The baseline's remaining failure is the registry-specific healing evidence rule.
These small, author-designed lexical evaluations are development evidence, not
application execution or broad product-effectiveness measurements. The final run
is explicitly `regraded`, with zero fresh and 30 reused answers; it is not a
release baseline and was not promoted. Token and dollar usage are unavailable.

The 20 routing queries remained unchanged across iterations. A partition was
fixed before reviewing their answers: positives 1–6 and negatives 11–16 for
development, positives 7–10 and negatives 17–20 held out. All eight held-out
queries selected correctly; no description tuning was performed.

## Executable checks

`mcp/test/AgentQaRouting.spec.ts` uses the real SkillIndex and registry files.
Before the YAML category route was added, exact-config lookup returned no match.
Afterward, root/nested configs and explicit keywords select agent-qa, while
generic YAML/Markdown and adjacent driver concepts do not.

The PR review then identified missing agent-qa rows in the four checked-in agent
indexes. Four parameterized checks reproduced those omissions while both MCP
routing checks still passed. Regenerating the affected category with
`IndexGeneratorServiceImpl.generateCategoryIndex` and canonical metadata changed
only the missing row in each export; a second generation was byte-identical.
All six focused checks pass. This covers local registry selection and static
index discovery, not end-host skill delivery or browser/device execution.

The required root test suite and build pass. Skill validation, SDLC audit,
redundancy audit, injection scan, freshness audit, and ordinary alignment gate
pass. The catalog eval audit still reports two existing single-assertion issues
in `database-hana`; the new eval preflight has no issues. Existing warnings and
the new skill's lexical alignment warning remain visible rather than being
removed by adding answer anchors to the skill.

Command documentation uses agent-qa 0.2.3 fixtures covering validation, dry-run
selection, a missing required file, and incomplete run evidence. No live provider
or application run, JUnit generation, or positive completed-run triage is claimed.

## Reproduce

```sh
pnpm --filter ./mcp exec vitest run test/AgentQaRouting.spec.ts
pnpm evals:verify -- --all
pnpm evals:gate -- --run all-v2.6.6-2026-10-25T12-50-13-711Z-9d7134e0
```

Reproduce canonical generation with `pnpm generate-indices` and
`pnpm calculate-tokens`. The four checked-in quality-engineering indexes match
the canonical generated category byte-for-byte. If the general sync retains an
older snapshot, refresh those identical category exports after generation:

```sh
for surface in .agents .claude .codex .github; do
  cp skills/quality-engineering/_INDEX.md "$surface/skills/quality-engineering/_INDEX.md"
done
```

The new README link label is normalized to the product's lowercase spelling
after generation; the generator otherwise title-cases it.
