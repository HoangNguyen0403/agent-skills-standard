# Live Skill Evals — How It Works and How to Verify It

`benchmark-report.md` measures skill **size** (tokens, structure). It cannot tell you whether a skill actually changes what an agent does. This document covers the system that measures that — `evals-report.md` — and how anyone, with or without an AI agent, can reproduce or audit it.

## The Idea, in Five Lines

1. Every skill already ships `evals/evals.json` — real prompts plus deterministic assertions about what a good answer contains.
2. An agent (any agent — Claude Code, GitHub Copilot, Codex, Antigravity) answers each prompt **twice**: once with no skill in context (**baseline**), once with the skill's `SKILL.md` loaded (**with-skill**).
3. Both transcripts are committed to the repo under `benchmarks/evals/runs/<runId>/`.
4. A small deterministic scorer (no LLM, no API key) checks each transcript against the assertions and computes a pass rate per arm.
5. The **delta** (with-skill pass rate − baseline pass rate) is the measured effect of the skill — reported per skill, per category, and aggregated in `evals-report.md`.

Generation (the transcripts) is agent-driven and therefore subjective. Scoring (assertions → pass/fail) is deterministic string-matching and fully reproducible by anyone from the committed files — that split is the whole trust model.

## Verify an Existing Report (No Agent Needed)

Anyone who can clone the repo and run `pnpm` can check every number in `evals-report.md` without invoking any AI agent, model, or API key:

```bash
git clone <repo>
pnpm install
pnpm evals:verify -- --all        # re-score every committed run, diff vs committed results.json
pnpm evals:verify -- --run <runId>  # just one run
```

`verify` re-reads the committed answer transcripts under `benchmarks/evals/runs/<runId>/answers/`, re-applies the assertions from each skill's `evals/evals.json`, and diffs the recomputed pass rates against the committed `results.json`. It exits non-zero and prints exactly what differs if:

- a transcript was edited after scoring (tampering or accidental drift),
- a transcript looks copy-pasted from `expected_output` rather than agent-generated,
- the committed `results.json` doesn't match what the assertions actually say.

This same check is available two other ways, so you don't need the `scripts/evals/` source open to trust it:

- **MCP tool**: `verify_eval_run` (optionally pass `run_id`; omit to check every run). `get_eval_report` returns the current `evals-report.md` content directly, so an agent connected via MCP can quote it without reading the file itself.
- **CLI**: `agent-skills evals verify [--run <runId>]` and `agent-skills evals report`.

All three (the `pnpm evals:verify` script, the MCP tool, and the CLI command) implement the same scoring algorithm independently — see [Trust Model & Limitations](#trust-model--limitations) for why that duplication is intentional. CI runs `pnpm evals:verify -- --all` on every push, so a tampered or stale run fails the build, not just a manual check.

## Run Your Own Category (Any Agent, No API Key)

This is designed to run **inside a normal chat session** with whichever coding agent you already have open in this repo — it only needs to read/write files and run `pnpm` scripts, the same tools any coding agent already has.

1. Open the repo in your agent of choice (Claude Code, Copilot, Codex, Antigravity, or anything else with file + shell access).
2. Invoke the `evals-run` workflow (see `.agents/workflows/evals-run.md` — most platforms expose this as a slash command, e.g. `/evals-run dart`, or as a Copilot `/evals-run` prompt). If your platform has no workflow mechanism, just point the agent at that file directly and ask it to follow the steps.
3. Give it a category (`dart`, `nestjs`, `flutter`, etc.) — small categories (2-5 skills) take a few minutes; large ones (20+ skills) take longer since every eval prompt is answered twice.
4. The workflow builds a manifest, has the agent answer every prompt under the **blinding order** (baseline before with-skill, no peeking at assertions), scores the run, regenerates `evals-report.md`, and offers to commit the run in one commit — same pattern as the benchmark report.

Re-running a category later creates a new dated `runId` rather than overwriting, so `benchmarks/evals/history.json` accumulates a trend over time and `evals-report.md` always shows the latest run per category.

### Why "no API key"

The agent that answers the prompts is whatever coding agent you already have open — it uses its own existing model access (Claude Code's Claude, Copilot's model, Codex's model, etc.). The eval-run tooling itself (`scripts/evals/*`) never calls any LLM API directly; it only reads/writes files and does string matching. There is nothing to configure and no credential to provide beyond what you already use to run that agent.

## Reading the Artifacts

For a run `benchmarks/evals/runs/dart-v2.6.0-2026-07-10/`:

```
manifest.json               # skills, cases, per-arm status (pending/done), run metadata (agent, model, dates)
prompts/<skillName>/eval-1.md          # blinded prompt — text only, no assertions, no expected_output
prompts/<skillName>/trigger-1.md       # a should_not_trigger prompt, framed as a yes/no decision
prompts/<skillName>/pressure-1.md      # (guardrail skills only) a pressure_scenarios prompt
answers/<skillName>/eval-1.baseline.md    # agent's answer with no skill loaded
answers/<skillName>/eval-1.with-skill.md  # agent's answer with SKILL.md loaded
answers/<skillName>/trigger-1.md          # single-arm: "TRIGGER: yes|no" + one-sentence reason
results.json                 # per-skill baseline/with-skill pass rates, delta, trigger precision
```

Scoring rule per case: **all** of that eval's assertions must hold against the transcript for the case to pass (`contains` = substring present, `not_contains` = substring absent, `file_reference` = the referenced path or its filename is mentioned). A skill's pass rate for an arm is the fraction of its cases that passed on that arm. `should_not_trigger` prompts are scored separately as **trigger precision** (did the agent correctly say the skill would *not* activate) and are excluded from the baseline/with-skill delta, since there's no "with-skill" arm for a decision about whether to load the skill at all.

"Suspicious" flags on a transcript mean it reproduces `expected_output` verbatim (a sign of copy-paste rather than a genuine answer) or is implausibly short. `pnpm evals:verify` surfaces these as failures.

## Trust Model & Limitations

- **What's deterministic**: scoring. Given a transcript and an `evals.json`, the pass/fail result is 100% reproducible — no model call, no randomness.
- **What's subjective**: the transcripts themselves. A different agent, or the same agent on a different day, may answer differently. This is inherent to measuring agent behavior — the mitigation is that transcripts are committed and visible, not hidden behind a single number.
- **Blinding is enforced by protocol, not by tooling.** Nothing stops an agent from reading `SKILL.md` before writing its "baseline" answer except the workflow instructions. If you suspect a run wasn't blinded correctly, the transcripts are the audit trail — read `answers/<skill>/<case>.baseline.md` and judge whether it plausibly reflects "no skill loaded" knowledge.
- **`expected_output` is never scored against.** It exists only as a human-readable reference in `evals.json` and to detect verbatim copy-paste. Scoring uses only the `assertions` array, so an agent cannot pass by parroting `expected_output` structurally — though it can still trivially satisfy a shallow `contains` check, which is a known limitation of substring-based scoring (also disclosed in `benchmark-report.md`'s methodology section for the same reason).
- **The scoring algorithm exists in three places** — `scripts/evals/scorer.ts` (the canonical implementation, used by `pnpm evals:*`), `mcp/src/services/EvalsIndex.ts`, and `cli/src/services/EvalsVerifier.ts`. This is intentional, not drift: the MCP server and the CLI are both separately published packages that must work in any consumer project without depending on this monorepo's root-level tooling, so each carries its own small, self-contained copy of the same ~40-line algorithm. If you change assertion semantics, update all three (each file says so at the top).
- **This complements, not replaces, `benchmark-report.md`.** Token/size savings and structural quality (rubric score, anti-patterns, reference-link integrity) are still worth tracking — they're cheap, instant, and catch different problems (bloat, missing anti-patterns, broken links) than a behavioral eval run does. Use both.

## Reference: Commands

| Command | What it does |
| --- | --- |
| `pnpm evals:manifest -- --category <cat>` | Build a blinded manifest + prompt files for a category |
| `pnpm evals:score -- --run <runId>` | Score committed transcripts, write `results.json` |
| `pnpm evals:report` | Aggregate all committed runs into `evals-report.md` + update history/archive |
| `pnpm evals:verify -- --run <runId>` \| `--all` | Re-score and diff against committed results — the audit command |
| `agent-skills evals verify [--run <runId>]` | CLI equivalent of `evals:verify`, usable outside this monorepo |
| `agent-skills evals report` | Print the current `evals-report.md` |
| MCP `verify_eval_run` | Same verification, callable by any MCP-connected agent |
| MCP `get_eval_report` | Returns `evals-report.md` content directly |
