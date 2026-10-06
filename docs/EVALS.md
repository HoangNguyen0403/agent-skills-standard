# Live Skill Evals

Live evals measure behavioral change, not skill-file size. The evaluation framework supports two complementary workflows: text-based skill evaluation and executable task evaluation.

## Text Evaluation Protocols

1. **Protocol lineage**:
   - `neutral-skill-v4` governs new text evaluations. Baseline and with-skill arms receive identical task instructions; only the skill payload differs.
   - Historical v1/v3 transcripts and manifests remain immutable and verifiable under their recorded scoring semantics. Do not relabel historical evidence or combine it into fresh neutral comparisons.
   - Reports retain known protocol contributors and unresolved provenance separately. Unknown contributors are uncertainty, not proof of a mixed protocol; do not certify a known-only headline when unresolved contributors remain.
2. **Evidence limits**: Text evaluations check deterministic transcript assertions. They are instruction-adherence evidence, not proof of software correctness, model capability, or tool-free execution. Prompt prohibitions and read-only filesystem settings do not prove that tools were unavailable or unused.
3. **Execution**: Build a category or aggregate manifest, answer both arms in isolated workers, score complete runs, verify against immutable `inputs.json`, and project aggregate runs into the newest complete category partitions.

New v2 manifests use assertion-semantics-v2: Markdown formatting, line wrapping,
and equivalent placeholder names do not fail a concrete assertion, while
numeric/status/path literals remain exact. Historical manifests without this
field retain literal v1 scoring semantics.
## Config-Change Gate

Agent configuration is code. A diff that touches `skills/**`, `.agents/workflows/**`, or a hook
script changes how every future session behaves, so it passes the same gate as a source change:

```bash
pnpm validate:all      # skill format, structure, injection scan
pnpm audit:sdlc        # workflow schema, router reachability, line budgets
pnpm check-alignment   # eval alignment across the catalog
pnpm evals:preflight -- --skills-file <changed skills>
```

`evals:preflight` costs no model quota and exits non-zero on any ungrounded assertion. Scope it to
the skills the diff touched: a bare run audits the whole catalog and will fail on known legacy
alignment debt that the change did not introduce.

CI enforces the grounding preflight in the `validate-skills` job of `.github/workflows/ci.yml`; it
does not enforce the promotion pass-rate thresholds themselves. `pnpm evals:gate -- --all` applies
those thresholds (case pass rate, assertion pass rate, activation recall/specificity, and outcome
delta) to any scored run not yet recorded in `benchmarks/evals/history.json` and exits non-zero on
breach; see "Usage, cost, and regression gates" below for what it checks today versus what is still
a manual `evals:promote` review.

Every production incident and every Blocker review finding that a skill should have caught earns a
permanent case in that skill's `evals/evals.json`, so the suite grows into a regression net rather
than a fixed snapshot.

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

## Usage, cost, and regression gates

`RunMetadata.usage` records real token and wall-clock cost for every worker execution; it is
populated automatically by `evals:manifest -- --execute` and `evals:baseline -- --execute` and
persists into the manifest, `results.json`, and any run composed or pruned from it.

### How usage is captured

Each worker invocation runs `codex exec --json` in addition to `--output-last-message`. The answer
is always read from the `--output-last-message` file, byte-identical to before; `--json` only adds
a JSONL event stream on stdout that is parsed for `token_count` events (`info.total_token_usage`).
Parsing is tolerant by construction: an empty stream, a stream with no `token_count` event, or a
line that fails to parse all resolve to `usage: null` for that lane. A missing usage number is
never estimated or guessed and never fails the run — it is counted under `lanesUnmetered` and
surfaced as "unavailable," per the `common-sdlc-metrics` report-unavailable rule.

`RunMetadata.usage.overall` and `RunMetadata.usage.byArm.baseline` / `.byArm["with-skill"]` each
carry `promptTokens`, `completionTokens`, `cachedPromptTokens`, `reasoningTokens`, `totalTokens`,
`wallMs`, `lanesMetered`, `lanesUnmetered`, and `estimatedUsd`. Resumed and quota-paused runs merge
usage cumulatively across `--execute` invocations rather than overwriting it.

`estimatedUsd` resolves against the fixed pricing table in `scripts/benchmark/models.ts` by an
exact, case-insensitive model-name match only. There is no fuzzy matching and no fallback price:
an unresolved model (which includes the default `gpt-5.6-luna` worker model today) reports
`estimatedUsd: null`, not a guess.

### Pre-flight cost estimate

Before spending quota on a manifest, run:

```bash
pnpm evals:estimate -- --run <runId>
```

It reports the lane count still missing an answer, the configured model and reasoning effort, and,
only when a prior run recorded usage for that same model, a projected token and dollar range
derived from the observed low/high cost-per-lane across those prior runs. With no matching prior
usage history it reports lanes and model and says the cost projection is unavailable; it never
fabricates a projection from an assumed token count.

### Regression gate

```bash
pnpm evals:gate -- --run <runId>
pnpm evals:gate -- --all
pnpm evals:gate -- --all --json
```

`evals:gate` applies the same thresholds `evals:promote` enforces per skill — with-skill case pass
rate above 85%, with-skill assertion pass rate at or above 85%, non-negative outcome delta, no
incomplete arms, and trigger recall/specificity at or above 90% — to every skill in a scored run's
`results.json`, and exits non-zero if any skill breaches. Unlike `evals:promote`, it does not write
a baseline registry entry; it is a pass/fail check safe to wire into CI.

`--run <runId>` gates one explicit run. `--all` gates every physical run under
`benchmarks/evals/runs` whose `results.json` is **not already recorded** in
`benchmarks/evals/history.json` — a run already promoted and recorded was already reviewed through
`evals:promote`, so it is not re-gated here. When nothing is pending, `--all` reports "no scored run
available" and exits `0`; this is what makes it safe to add to CI immediately, before any team
workflow produces a fresh selective run every time.

For each gated run, the report also includes a `trend` comparing the run's average with-skill pass
rate against the most recent `history.json` record for the same category (excluding the run itself)
dated before it, reporting `improved`, `regressed`, `unchanged`, or `no-prior-data` — never just the
absolute number, per the `common-sdlc-metrics` trend-over-snapshot rule.

`readiness.ts` previously also exported a one-time `finalManifestShapeErrors` check pinned to the
exact `v2.6.0` remediation manifest shape (136 skills, 1221 cases). That check was only referenced
by one now-obsolete guard in `evals:manifest -- --execute` for that single historical manifest; it
has been removed along with the guard. It was not load-bearing for `evals:gate`, `evals:promote`, or
any other manifest shape validation, which validate schema fields and per-skill thresholds directly.

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

## Executable Task-Evaluation Pilot (`evals:tasks`)

The executable harness evaluates agent performance empirically against executable fixture tasks, comparing minimal, current, and candidate instruction sets.

### Command-Line Interface

```bash
# Basic invocation
pnpm evals:tasks --manifest benchmarks/tasks/pilot.json --worker <path-to-worker.json> --output <new-output-dir>

# Filter by split and set repetitions
pnpm evals:tasks --manifest benchmarks/tasks/pilot.json --worker <path-to-worker.json> --output <new-output-dir> --split calibration --repeat 3

# Keep workspaces for post-mortem inspection
pnpm evals:tasks --manifest benchmarks/tasks/pilot.json --worker <path-to-worker.json> --output <new-output-dir> --keep-workspaces
```

Direct script invocation:
```bash
tsx scripts/evals/task-index.ts --manifest benchmarks/tasks/pilot.json --worker config/worker.json --output evals/runs/pilot-run-1
```

### Worker Configuration Contract

Worker execution is governed by a trusted JSON configuration file:

```json
{
  "executable": "/path/to/cli-or-agent-binary",
  "args": ["exec", "--workspace", "{workspace}", "--prompt-file", "{promptFile}"],
  "model": "gpt-5.4",
  "effort": "high",
  "timeoutMs": 60000
}
```

- **Arguments & substitution**: `{workspace}` and `{promptFile}` are the only supported string substitutions. Arguments are spawned directly without shell interpolation.
- **Prompt passing**: The prompt is written to `{promptFile}` and streamed on stdin for CLIs supporting piped input.
- **Operator-supplied metadata**: `model` and `effort` are recorded as configured facts, not inferred values.
- **Completion receipt**: The trusted verifier writes its completion receipt to the path in `TASK_EVAL_VERIFICATION_RESULT_PATH`. The runner independently validates the completed status, unique check IDs, explicit outcomes, evidence, recomputed counts, and agreement with verifier exit status. Missing, malformed, duplicate, incomplete, or inconsistent receipts are infrastructure failures. Valid failed checks remain evaluated product failures with their evidence preserved.
- **Process cleanup**: On POSIX, the runner waits for its owned process group to settle on normal completion and performs bounded TERM/KILL cleanup on failure or timeout; inability to establish cleanup fails closed. Windows does not provide this descendant process-group guarantee. Deliberately detached sessions are outside the owned-group contract.

### Task Manifests and Fixtures

Pilot tasks test concrete software engineering problems under `benchmarks/tasks/`:
- **Pagination boundary handling**: checks zero-based offsets, page limits, maximum-page clamping, empty results, and negative parameters.
- **Cross-tenant authorization**: creation uses the authenticated tenant despite caller-supplied tenant values; foreign-ID collisions must not overwrite any foreign document state. Viewers omit restricted documents from lists and direct restricted reads are denied; editors and admins retain their complete same-tenant restricted listings and cannot access another tenant's documents.

### Out-of-workspace trusted verifiers

- **Integrity boundary**: Verifiers live outside writable fixture workspaces. Their hashes detect lasting changes, but same-UID workers can read or alter their environment and may race files. Completion receipts are integrity evidence, not an OS sandbox or defense against deliberately hostile same-UID code.
- **Independent validation**: A clean worker exit alone is insufficient. The runner requires a valid completed verifier receipt and consistent verifier exit status. Infrastructure failures are not counted as candidate product failures.
### Security notice: nonproduction trust model

> [!WARNING]
> **NO OS-LEVEL SANDBOX**: Child processes use the host user's permissions and environment. The harness does not provide containerization, chroot, network namespaces, or OS-level sandboxing.
> - Execute only trusted worker configurations against isolated nonproduction fixtures.
> - Markdown instructions and read-only filesystem configuration are advisory; they do not prove runtime tool restrictions.
> - Owned process-group cleanup does not cover deliberately detached descendants or establish Windows descendant cleanup.

### Measurement limits and missing model benchmarks

- Deterministic fixture checks verify runner, receipt, cleanup, and verifier behavior; they are not live model capability sweeps.
- Reports distinguish total attempts, evaluated product runs, timeouts, and infrastructure errors. Product pass rates use only evaluated runs; without valid product evidence the rate is `null`, not `0%`.
- Unknown token and cost values remain `null`; they are never estimated or fabricated.

## Artifacts

```text
manifest.json       # v2 scope, protocol, source hashes, cases, and arm status
inputs.json         # immutable source snapshot used for scoring
prompts/...         # blinded prompt text only
answers/...         # committed agent transcripts
results.json        # generated v2 metrics; never hand-edit
```

The root scripts, published CLI verifier, and MCP verifier share the v2 assertion-semantics path. v1 manifests/results remain readable through a compatibility adapter.

The matcher is duplicated in three places — `scripts/evals/scorer.ts`, `cli/src/services/assertion-semantics.ts`, and `mcp/src/services/assertion-semantics.ts` — because `mcp/tsconfig.json` pins `rootDir: src` and each package bundles independently. `scripts/evals/assertion-parity.test.ts` runs all three over a shared corpus under both semantics versions and fails if they diverge. Change all three together.

## Historical runs and reporting

Completed transcripts and generated scores remain immutable. Backfilled `inputs.json` snapshots make historical runs reproducible even if current skill or eval files change.

`pnpm evals:report` retains physical runs in `benchmarks/evals/history.json` and `benchmarks/evals/archive/`, then projects an `all` run into category partitions before choosing the newest complete partition per category. Provenance summaries retain known protocols and unresolved contributors independently; physical-history protocol labels are qualified from the complete physical run when available. These are presentation changes only: historical runs, transcripts, results, and recorded percentages are not rewritten.

Do not publish a pending run, hand-edit scores, or edit exported workflow copies independently of `.agents/workflows/evals-run.md`.
