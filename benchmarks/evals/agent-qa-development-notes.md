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
- [Pre-review regrade](runs/all-v2.6.6-2026-10-25T12-50-13-711Z-9d7134e0/results.json):
  all 30 answer files are byte-identical to iteration 2. Corrected assertions
  accept equivalent uncertainty phrasing while retaining exact command checks.

The pre-review rubric reported 5/5 behavior cases with the skill and 4/5 without it;
14/14 versus 12/14 assertions. Both routing recall and specificity are 10/10.
Those scores used the presence-only assertions subsequently challenged in PR review; see the corrected rubric evidence below.
These small, author-designed lexical evaluations are development evidence, not
application execution or broad product-effectiveness measurements. That run
is explicitly `regraded`, with zero fresh and 30 reused answers; it is not a
release baseline and was not promoted. Token and dollar usage are unavailable.

The 20 routing queries remained unchanged across iterations. A partition was
fixed before reviewing their answers: positives 1–6 and negatives 11–16 for
development, positives 7–10 and negatives 17–20 held out. All eight held-out
queries selected correctly; no description tuning was performed.

## Review correction: decision checks

The maintainer demonstrated that unsafe answers could pass by naming safeguards.
Pressure prompts now live as ordinary scored cases 4 and 5, with typed assertions;
their prompt text is unchanged. Cases 1–3 additionally reject unauthorized live
commands, unsupported outcome claims, and memory/configuration mutation. Healing
requires a refusal of immediate signoff, three consecutive green reruns, and
unchanged assertions. The shared scorer and the skill body are unchanged.

`agent-qa-behavior.test.ts` exercises the real rubric through `checkAssertion` in
both semantics versions. Its 60 controls cover 22 safe paraphrases, 16 unsafe
answers (including the review examples), and 22 safe answers followed by an unsafe
final instruction. All pass their expected acceptance/rejection checks in 30
parameterized tests. These are bounded lexical regression checks, not a general
semantic judge: unfamiliar wording, quotations, or oblique contradictions still
need human review. Scores do not prove executed behavior.

The [original-answer regrade](agent-qa-rubric-regrade.json) uses all ten unchanged
iteration-2 behavior answers. It records answer/prompt hashes and the new rubric
hash, checks prompt equality, and reports 4/5 cases and 29/30 assertions with the
skill versus 2/5 and 25/30 without it. Both original case-3 answers omit an explicit
memory-preservation decision; that failure remains visible. Reproduce without
altering any run with `node --import tsx scripts/evals/agent-qa-regrade.mjs`.

The native runner treats moving pressure cases into `evals` as a case-definition
change. It generated ten new isolated behavior answers (five paired cases) in
[the review run](runs/all-v2.6.6-2026-10-25T14-50-18-679Z-44d4f328/manifest.json),
using the same model/effort and reusing the twenty unchanged routing answers.
Review of those answers exposed legitimate refusal phrasing rejected by the
first revised rubric. Each correction has an accepting regression control;
unsafe and contradictory controls remain rejecting. Intermediate results and
regrades at 14:52 and 14:53 remain available, including their failures.

[The current regrade](runs/all-v2.6.6-2026-10-25T14-54-42-791Z-16dd0416/results.json)
reuses all thirty answers byte-for-byte and makes zero new model calls. It reports
5/5 behavior cases and 30/30 assertions with the skill, versus 1/5 and 24/30
without it; routing remains 20/20. This is author-calibrated development evidence,
not a held-out efficacy estimate or release baseline. Token/cost usage remains
unavailable. No original transcript or immutable input/result file was rewritten.

## Hosted CI observed during review

[CI on reviewed head 4a1b4d](https://github.com/HoangNguyen0403/agent-skills-standard/actions/runs/40195843919)
published successful unit-test and product-evidence-consumer jobs. Its
`lint-and-format` job stopped at `pnpm audit --prod` on body-parser and multer
advisories; package.json and pnpm-lock.yaml are byte-identical to the PR base.
The secret scan reports historical findings in
`cli/src/services/harness/__tests__/HarnessDiscoveryService.spec.ts` and
`artifacts/runs/cyber-lab-validation/pre-integration-snapshot.json`; neither path
exists at this PR head or is changed by the contribution. No finding values are
reproduced here. These hosted failures remain for maintainer triage; this PR does
not change dependencies, history, or scan policy to suppress them.

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
in `database-hana`; the new eval preflight has no issues. Existing warnings remain visible; no answer anchors were added to the skill.

Command documentation uses agent-qa 0.2.3 fixtures covering validation, dry-run
selection, a missing required file, and incomplete run evidence. No live provider
or application run, JUnit generation, or positive completed-run triage is claimed.

## Reproduce

```sh
pnpm --filter ./mcp exec vitest run test/AgentQaRouting.spec.ts
pnpm evals:verify -- --all
pnpm evals:gate -- --run all-v2.6.6-2026-10-25T14-54-42-791Z-16dd0416
node --import tsx --test scripts/evals/agent-qa-behavior.test.ts
node --import tsx scripts/evals/agent-qa-regrade.mjs
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
