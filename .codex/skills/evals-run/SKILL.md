---
name: evals-run
description: "Run a category's skill evals live, in this session — no API key needed. Answers each eval prompt twice (baseline, then with-skill), scores deterministically, and produces a committed, verifiable Live Evals Report."
metadata:
  triggers:
    keywords:
    - evals run
    - workflow
---
# Evals Run Skill

> [!IMPORTANT]
> Run a category's skill evals live, in this session — no API key needed. Answers each eval prompt twice (baseline, then with-skill), scores deterministically, and produces a committed, verifiable Live Evals Report.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# 🧪 Evals-Run — Live Skill Effectiveness Measurement

> See `docs/EVALS.md` (repo root) for the full trust model and how anyone can verify a run afterward via `pnpm evals:verify` or the MCP `verify_eval_run` tool — no API key required for verification either.

This workflow measures whether a skill actually changes agent behavior, by answering each skill's real eval prompts twice — once with no skill loaded (**baseline**), once with the skill's `SKILL.md` loaded (**with-skill**) — and scoring both against the assertions already committed in `evals/evals.json`. It runs entirely inside your current chat session: no environment variables, no API keys, just file reads/writes and `pnpm` commands you already have.

## Input

`/evals-run <category>` (e.g. `/evals-run dart`). If no category is given, ask the user, or offer `pnpm evals:manifest -- --category <cat>` with no arg to list available categories.

## 🚫 Hard Rule — Blinding Order

**This is the one rule that makes the whole run meaningful. Do not skip or reorder it.**

For every `eval` and `pressure` case, you MUST:
1. Answer the **baseline** arm FIRST, from your own general knowledge — before opening that skill's `SKILL.md` or its `evals/evals.json` (assertions/expected_output would let you "cheat" the score).
2. Only THEN read the skill's `SKILL.md`.
3. Answer the **with-skill** arm, applying what you just read.

If you have already read a skill's `SKILL.md` earlier in this session (e.g. because a hook auto-loaded it), that skill's baseline arm is compromised — note this in the manifest metadata and either skip it or flag the result as non-blinded in the transcript.

## Steps

### Step 1 — Build the manifest

```bash
pnpm evals:manifest -- --category <category>
```

This creates `benchmarks/evals/runs/<category>-v<version>-<date>/` with:
- `manifest.json` — the list of skills and cases (evals, trigger checks, and — for guardrail skills — pressure scenarios), with per-arm status.
- `prompts/<skillName>/<caseId>.md` — the **blinded** prompt text only (no assertions, no expected_output).

Note the `runId` printed — you'll need it for scoring.

### Step 2 — Answer every case

For each skill in the manifest, for each case file under `prompts/<skillName>/`:

- **`eval-<n>.md` and `pressure-<n>.md`** (two arms each):
  1. Read the prompt. Write your answer to `answers/<skillName>/<caseId>.baseline.md` using ONLY your own knowledge — do not open `SKILL.md` or `evals/evals.json` yet.
  2. Read `skills/<category>/<skillName>/SKILL.md`.
  3. Write your answer to `answers/<skillName>/<caseId>.with-skill.md`, applying the skill's guidance.
- **`trigger-<n>.md`** (single arm): decide, from the skill's name + one-line description only (not the full body), whether this skill should activate for the prompt. Write the answer to `answers/<skillName>/<caseId>.md` starting with exactly `TRIGGER: yes` or `TRIGGER: no` on its own line, followed by a one-sentence justification.

Answer honestly and independently per case — do not look ahead at other cases' expected content, and do not copy phrases from one skill's `SKILL.md` into another skill's answers.

You do not need to answer every case in one sitting. Re-running this workflow with the same `runId` resumes: skip cases whose answer file already exists.

### Step 3 — Fill in run metadata

Edit `benchmarks/evals/runs/<runId>/manifest.json` → `metadata`: set `agent` (e.g. "Claude Code", "GitHub Copilot", "Codex", "Antigravity"), `model` if known, and `completedAt`.

### Step 4 — Score and report

```bash
pnpm evals:score -- --run <runId>
pnpm evals:report
```

`score` reads every committed transcript, applies the assertions from `evals/evals.json` deterministically, and writes `results.json`. It will print `⚠️ incomplete` for any skill with unanswered arms — go back to Step 2 if so. `report` aggregates all committed runs into `evals-report.md` at the repo root, and archives this run under `benchmarks/evals/archive/`.

### Step 5 — Show the summary and offer to commit

Show the user the per-skill baseline/with-skill/delta table from the score output. Then offer, in one commit (same pattern as the benchmark report):

```bash
git add benchmarks/evals/runs/<runId> benchmarks/evals/archive/<runId>.md benchmarks/evals/history.json evals-report.md
git commit -m "evals: live run for <category> (<runId>)"
```

Do not push without explicit user confirmation.

## Re-running

To refresh a category later, just run this workflow again — it creates a new `runId` (new date), so history accumulates rather than overwriting. `evals-report.md` always reflects the latest run per category, and `benchmarks/evals/history.json` keeps every run.

## Verifying a run afterward (yours or someone else's)

Anyone with the repo can check a committed run without re-running any agent:

```bash
pnpm evals:verify -- --run <runId>   # one run
pnpm evals:verify -- --all           # every committed run
```

This re-scores the committed transcripts from scratch and diffs the result against the committed `results.json` — it fails loudly on any mismatch (tampering, drift, or a scorer bug) and flags transcripts that look copy-pasted from `expected_output`. The same check is available via the MCP `verify_eval_run` tool, and is wired into CI.

## 🚫 Anti-Patterns

- **No peeking**: never read a skill's `evals/evals.json` assertions or `SKILL.md` before writing that case's baseline answer.
- **No reusing a compromised baseline**: if you already loaded a skill's `SKILL.md` earlier in the session, don't backfill a "clean" baseline for it — flag it instead.
- **No hand-editing `results.json`**: it is generated by `pnpm evals:score`; if a score looks wrong, fix the transcript or the assertions in `evals/evals.json`, then re-score.
- **No partial commits**: don't commit a run whose manifest still shows `pending` arms — finish or explicitly document what's incomplete.

