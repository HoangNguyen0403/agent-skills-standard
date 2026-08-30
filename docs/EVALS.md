# Live Skill Evals

Live evals measure behavioral change, not skill-file size. The v2 protocol is:

1. Build a category or aggregate manifest.
2. Answer baseline and with-skill arms in isolated workers.
3. Score only complete runs.
4. Verify from the immutable `inputs.json` snapshot.
5. Project aggregate runs into the newest complete category partitions.

New v2 manifests use assertion-semantics-v2: Markdown formatting, line wrapping,
and equivalent placeholder names do not fail a concrete assertion, while
numeric/status/path literals remain exact. Historical manifests without this
field retain literal v1 scoring semantics.

## Run a category or the complete catalog

```bash
pnpm evals:manifest -- --category dart
pnpm evals:manifest -- --all
pnpm evals:manifest -- --skills-file /absolute/path/to/category-skill-list.txt
pnpm evals:manifest -- --resume <runId>
```

Use `--skills-file` for an exact selective run. Put one `category/skill` key per
line; blank lines and `#` comments are ignored. The manifest contains only the
listed skills and rejects unknown or missing-eval entries.

Before any model workers are started, run the no-cost contract preflight:

```bash
pnpm evals:preflight -- --skills-file /absolute/path/to/category-skill-list.txt
```

It rejects outcome assertions that are not grounded in the case prompt or
expected behavior contract. A paid run must not start while preflight reports
issues.

Manifest creation does not consume model quota. Review the printed skill/case
count, then execute a deliberately fresh manifest with:

```bash
pnpm evals:manifest -- --resume <runId> --execute
```

For a trustworthy full-catalog release check, create it with `--all`, pin one
model and reasoning level, and do not reuse answers:

```bash
pnpm evals:manifest -- --all
EVALS_MODEL=gpt-5.4 EVALS_REASONING_EFFORT=high EVALS_CONCURRENCY=1 \
  pnpm evals:manifest -- --resume <runId> --execute
```

## Routine maintenance: one command

After the first complete catalog run, prepare an incremental plan for normal skill changes:

```bash
pnpm evals:baseline
# or limit release work to one category
pnpm evals:baseline -- --category angular
```

It selects the latest complete immutable run as the reference, detects changed
skills, creates a selective manifest, copies only compatible transcripts, then
runs every missing arm in a fresh read-only Codex CLI worker before scoring and
regenerating the report. Use `pnpm evals:baseline -- --plan` to inspect the
no-write impact plan, `--prepare` to leave execution to another worker, and
`--baseline <runId>` to pin the reference. A body change reuses prompt-only
answers, assertion-only changes regrade existing answers into a verified
`regraded` evidence mode, and changed prompts,
descriptions, or trigger corpora require fresh applicable evidence.
If a worker is interrupted, run the same command again: it resumes the matching
incomplete selective run and skips answer files already written.

`pnpm evals:baseline` intentionally starts **no model workers**. It prints the
exact worker model, reasoning effort, concurrency, reusable-answer count, and
fresh-answer count first. This prevents an unreviewed command from silently
consuming a user's Codex quota.

After reviewing that plan, explicitly authorize worker execution:

```bash
pnpm evals:baseline -- --execute
# or resume a category plan
pnpm evals:baseline -- --category angular --execute
```

Workers use the project default `gpt-5.6-luna` with `high` reasoning. The runner
passes both values directly to `codex exec`, even though it uses
`--ignore-user-config`; it cannot fall back silently to the account default.
Override either setting only when you intend to change cost or behavior:

```bash
EVALS_MODEL=gpt-5.6-luna EVALS_REASONING_EFFORT=high \\
  EVALS_CONCURRENCY=1 pnpm evals:baseline -- --execute
```

Missing arms run in one isolated Codex worker by default. Raise concurrency only
when you accept the corresponding parallel quota use; the maximum is four:

```bash
EVALS_CONCURRENCY=2 pnpm evals:baseline -- --execute
```

If Codex reaches its account usage limit, the runner preserves every completed
answer and exits with `Eval execution paused`. Do not delete the run directory.
After access resumes, run the identical `--execute` command; only the remaining
answers run.

Selective runs are development evidence, not a release baseline. After a full
changed-category sweep passes, promote it with a recorded review decision:

```bash
pnpm evals:promote -- --run <runId> --category angular --reviewer <name> --reason "release v1.4.3"
```

Promotion requires a fresh run with zero reused answers. It rejects stale
sources, selective or composite evidence, any with-skill case pass rate at or
below 85%, with-skill assertion pass below 85%, negative outcome delta, and
activation recall or specificity below 90%. Because the case threshold is
strictly above 85%, a three-case skill must pass all three cases.

Every new manifest receives a collision-safe timestamp-plus-nonce ID. Reuse requires explicit `--resume`.

For a run that must be easy to reference, provide a safe human-readable ID at
creation time:

```bash
pnpm evals:manifest -- --skills-file benchmarks/evals/strict-skills-selection-v2.6.0.txt \
  --run-id all-v2.6.0-final-136
pnpm evals:manifest -- --resume all-v2.6.0-final-136 --execute
pnpm evals:verify -- --run all-v2.6.0-final-136
```

`--name` is accepted as an alias for `--run-id`. The ID is only a directory
reference; the manifest still records timestamps, source hashes, model, and
protocol metadata. Do not reuse an ID for a different run.

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
pnpm evals:report -- --run <runId> # run-local report for a selective run
pnpm evals:verify -- --run <runId>
pnpm evals:verify -- --all

# Human-friendly reference for the newest completed all-scope run
pnpm evals:verify -- --run latest --version 2.6.0 --category all

# Strict release queue: only failing non-baseline evidence from skills below
# the strict gate.
pnpm evals:queue -- --run <runId> --strict
```

### Verify the retained canonical run

For the current release artifact, verification is local and does not start
model workers or consume paid quota:

```bash
pnpm evals:verify -- --run all-v2.6.0
# Equivalent when all retained runs should be checked:
pnpm evals:verify -- --all
```

Use the physical run ID for reproducible release checks. `latest` is available
when a human-friendly reference is preferred:

```bash
pnpm evals:verify -- --run latest --version 2.6.0 --category all
```

Do not create a new paid run just to verify an existing canonical artifact.
Only source changes require incremental evaluation.

Run directories retain immutable timestamp/hash IDs for auditability. Use
`--run latest` with `--version` and `--category` when you do not want to copy
the physical ID. The resolver skips incomplete runs and prefers the verified
canonical `all-v<version>` run when one exists.

Scoring refuses to create `results.json` while any required answer is pending. Before a v2 result is written, the manifest's skill/eval hashes are checked and the exact `SKILL.md` and eval definitions are written once to immutable `inputs.json`.

The scorer supports live assertion types `contains`, `contains_any`, `not_contains`, and case-insensitive `regex`. `file_reference` is still evaluated against the transcript for legacy runs, but no live eval uses it; do not introduce new ones. Any other type fails closed — the scorer returns `false`, so the assertion can never pass.

Results include:

- case pass rate and assertion pass rate for baseline and with-skill;
- trigger recall for positive cases;
- trigger specificity for negative cases;
- balanced trigger accuracy, the mean of recall and specificity.

## Compose and prune a release artifact

For a planned release consolidation, compose a verified base run with a
verified fresh overlay. Overlay skills replace base skills by their
`category/skill` key, and the output copies prompts, answers, immutable inputs,
hashes, and per-skill provenance into one self-contained run:

```bash
pnpm evals:compose -- --base <baseRunId> --overlay <overlayRunId> \
  --version 2.6.0 --output all-v2.6.0
```

The command rejects incomplete, unverified, reused, mismatched, duplicate, or
missing evidence. A source may be a fresh run, a verified historical v2 run, or
a verified zero-reuse composite created by an earlier staging step. The overlay
may contain only the changed skills; unchanged skills remain sourced from the
verified base. Historical compromised skills are acceptable only when the
overlay replaces that exact skill with clean evidence. The composite records
source-specific assertion and activation semantics and re-scores the assembled
immutable transcripts, so a legacy base cannot silently fail verification after
being combined with a v3 overlay.
For staged repairs, compose a smaller repair overlay into the prior selective
overlay with `--expected-skills <count>` before composing that result into the
full base.
The prescribed historical base may use the v1 governing instruction label; the
overlay must use v3, and the resulting composite is governed by v3 while
retaining each source protocol in per-skill provenance.

Pruning is read-only by default. Inspect the exact run, archive, and history
deletion set, then apply only after the canonical run passes verification:

```bash
pnpm evals:prune -- --version 2.6.0 --keep all-v2.6.0
pnpm evals:verify -- --run all-v2.6.0
pnpm evals:prune -- --version 2.6.0 --keep all-v2.6.0 --apply
```

If remediation will continue, retain the source evidence and publish the
residual failure report. If the release snapshot is intentionally frozen,
pruning is still allowed after canonical verification; pruning removes history
only and never changes the catalog's `READY` status.

The report keeps outcome quality and activation quality separate. A catalog is
`READY` only when every skill passes the strict outcome gate, every activation
gate, and the evidence is one fresh run with no reused answers. Trigger
accuracy cannot make a skill with weak with-skill cases release-ready.

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

The matcher is duplicated in three places — `scripts/evals/scorer.ts`, `cli/src/services/assertion-semantics.ts`, and `mcp/src/services/assertion-semantics.ts` — because `mcp/tsconfig.json` pins `rootDir: src` and each package bundles independently. `scripts/evals/assertion-parity.test.ts` runs all three over a shared corpus under both semantics versions and fails if they diverge. Change all three together.

## Historical runs and reporting

Completed transcripts and generated scores remain immutable. Backfilled `inputs.json` snapshots make historical runs reproducible even if current skill or eval files change.

`pnpm evals:report` retains every physical run in `benchmarks/evals/history.json` and `benchmarks/evals/archive/`, then projects an `all` run into its category partitions before selecting the newest complete partition per category.

Do not publish a pending run, hand-edit scores, or edit exported workflow copies independently of `.agents/workflows/evals-run.md`.
