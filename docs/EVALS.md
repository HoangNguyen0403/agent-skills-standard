# Live Skill Evals

Live evals measure behavioral change, not skill-file size. The v2 protocol is:

1. Build a category or aggregate manifest.
2. Answer baseline and with-skill arms in isolated workers.
3. Score only complete runs.
4. Verify from the immutable `inputs.json` snapshot.
5. Project aggregate runs into the newest complete category partitions.

## Run a category or the complete catalog

```bash
pnpm evals:manifest -- --category dart
pnpm evals:manifest -- --all
pnpm evals:manifest -- --resume <runId>
```

Every new manifest receives a collision-safe timestamp-plus-nonce ID. Reuse requires explicit `--resume`.

For each `eval` and `pressure` case, the baseline worker receives only the prompt. The with-skill worker receives the same prompt plus that skill's `SKILL.md`. Trigger workers receive only the skill name and one-line description; expected labels and full skill bodies are never exposed. Trigger prompt filenames use opaque case IDs so filenames and ordering cannot leak expected labels.

Aggregate answers use:

```text
answers/<category>/<skill>/<case>.baseline.md
answers/<category>/<skill>/<case>.with-skill.md
answers/<category>/<skill>/<trigger-case>.md
```

Category runs omit the `<category>/` segment.

## Score and report

```bash
pnpm evals:score -- --run <runId>
pnpm evals:report
pnpm evals:verify -- --run <runId>
pnpm evals:verify -- --all
```

Scoring refuses to create `results.json` while any required answer is pending. Before a v2 result is written, the manifest's skill/eval hashes are checked and the exact `SKILL.md` and eval definitions are written once to immutable `inputs.json`.

The scorer supports live assertion types `contains`, `contains_any`, `not_contains`, and case-insensitive `regex`. `file_reference` remains available only for legacy runs and structural audits.

Results include:

- case pass rate and assertion pass rate for baseline and with-skill;
- trigger recall for positive cases;
- trigger specificity for negative cases;
- balanced trigger accuracy, the mean of recall and specificity.

Known compromised baselines are surfaced in the manifest and have `n/a` baseline and delta metrics until clean reruns replace them.

## Artifacts

```text
manifest.json       # v2 scope, protocol, source hashes, cases, and arm status
inputs.json         # immutable source snapshot used for scoring
prompts/...         # blinded prompt text only
answers/...         # committed agent transcripts
results.json        # generated v2 metrics; never hand-edit
```

The root scripts, published CLI verifier, and MCP verifier all use the same v2 path and assertion semantics. v1 manifests/results remain readable through a compatibility adapter.

## Historical runs and reporting

Completed transcripts and generated scores remain immutable. Backfilled `inputs.json` snapshots make historical runs reproducible even if current skill or eval files change.

`pnpm evals:report` retains every physical run in `benchmarks/evals/history.json` and `benchmarks/evals/archive/`, then projects an `all` run into its category partitions before selecting the newest complete partition per category.

Do not publish a pending run, hand-edit scores, or edit exported workflow copies independently of `.agents/workflows/evals-run.md`.
