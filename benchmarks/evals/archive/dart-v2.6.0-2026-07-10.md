# 🧪 Live Skill Evals Report

> Generated: 2026-07-10T03:06:37.369Z
> Measured, not structural: each eval prompt is answered twice by an agent — once with no skill in context (baseline), once with the skill's SKILL.md loaded (with-skill) — then scored deterministically against the assertions in evals/evals.json.
> Runs are agent-generated (subjective), scoring is deterministic (verifiable). See [docs/EVALS.md](docs/EVALS.md) for how to run your own category and verify any run in this report.

## 🔢 Executive Summary (latest run per category)

| Metric | Value |
| --- | --- |
| Categories with a live run | **1** |
| Skills covered (latest runs) | **3** |
| Avg. baseline pass rate | **11%** |
| Avg. with-skill pass rate | **100%** |
| Avg. delta (with-skill − baseline) | **89%** |
| Avg. trigger precision (should_not_trigger) | **100%** (3 skills) |

## 📦 Per-Category Results (latest run)

| Category | Run | Scored | Skills | Baseline | With-Skill | Delta | Trigger Precision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dart | `dart-v2.6.0-2026-07-10` | 2026-07-10 | 3 | 11% | 100% | +89% | 100% |

## 📋 Per-Skill Detail (latest run per category)

| Skill | Category | Baseline | With-Skill | Delta | Trigger | Guardrail |
| --- | --- | --- | --- | --- | --- | --- |
| `dart-language` | dart | 33% | 100% | +67% | 100% | no |
| `dart-best-practices` | dart | 0% | 100% | +100% | 100% | no |
| `dart-tooling` | dart | 0% | 100% | +100% | 100% | no |

## 🛡️ How to Verify This Report

1. **Clone the repo**, `pnpm install`.
2. **Re-score committed transcripts**: `pnpm evals:verify -- --all` (or `--run <runId>` for one run) — recomputes scores from the committed answer transcripts and diffs against the committed `results.json`. Any tampering or drift fails loudly.
3. **Regenerate this report**: `pnpm evals:report`.
4. **Run your own category**: see [docs/EVALS.md](docs/EVALS.md) — any agent session can do this with no API key; it only needs to read/write files and run `pnpm` scripts in this repo.

> Trust model: generation (the transcripts) is agent-driven and therefore subjective; scoring (assertions -> pass/fail) is deterministic string-matching over the committed transcripts, reproducible by anyone via `pnpm evals:verify` or the MCP `verify_eval_run` tool — no API key required for either.
