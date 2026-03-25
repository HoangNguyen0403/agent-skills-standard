# Eval Workflow

Test skills with parallel subagents — one with-skill, one without — to measure improvement objectively.

## Workspace Structure

Organize all runs as siblings to the skill directory:

```
<skill-name>-workspace/
├── iteration-1/
│   ├── <eval-name>/
│   │   ├── with_skill/outputs/
│   │   ├── without_skill/outputs/
│   │   ├── eval_metadata.json
│   │   └── timing.json
│   ├── benchmark.json
│   └── benchmark.md
└── iteration-2/
    └── ...
```

Name eval dirs descriptively (e.g., `basic-trigger`, `edge-case-ambiguous`) — not `eval-0`.

## Step 1: Spawn All Runs (Same Turn)

Launch with-skill and without-skill subagents simultaneously per eval case.

**With-skill prompt:**
```
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Save outputs to: <workspace>/iteration-N/<eval-name>/with_skill/outputs/
```

**Baseline prompt (no skill):**
```
Execute this task:
- Task: <eval prompt>
- Save outputs to: <workspace>/iteration-N/<eval-name>/without_skill/outputs/
```

> Improving existing skill? Use old version as baseline (snapshot first), not no-skill.

Write `eval_metadata.json` per eval immediately (assertions can be empty):
```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

## Step 2: Draft Assertions While Runs Execute

Don't wait — be productive. Good assertions:
- Objectively verifiable with descriptive names
- Check concrete outcomes, not process
- Skip subjective outputs — use qualitative human review instead

Update `evals/evals.json` and `eval_metadata.json` with assertions once drafted.

## Step 3: Capture Timing on Completion

When each subagent finishes, save to `timing.json` immediately — this data only comes through the task notification once:

```json
{ "total_tokens": 84852, "duration_ms": 23332, "total_duration_seconds": 23.3 }
```

## Step 4: Grade & Benchmark

1. Grade assertions per run → save `grading.json` (fields: `text`, `passed`, `evidence`)
2. Aggregate → `benchmark.json` + `benchmark.md` (pass rate, time, tokens — with vs without)
3. Analyst pass — flag non-discriminating assertions, flaky evals, token tradeoffs

## Step 5: Review & Iterate

1. Present qualitative outputs + benchmark to user
2. Collect feedback per eval case
3. Improve skill — generalize from feedback, don't overfit to specific examples
4. Rerun into `iteration-N+1/` directory
5. Repeat until: user satisfied / all feedback empty / no meaningful progress

## Step 6: Description Optimization

After skill is stable, optimize the `description` field for triggering accuracy:

1. Generate 20 eval queries: 8–10 should-trigger + 8–10 should-not-trigger near-misses
2. Review with user — bad queries lead to bad descriptions
3. Run optimization loop: test each query → identify failures → rewrite description → retest
4. Target ≥80% accuracy on held-out test set (split 60% train / 40% test)
5. Apply `best_description` to SKILL.md frontmatter; report before/after scores

See [testing.md](testing.md) for trigger query design rules and scoring guidance.
