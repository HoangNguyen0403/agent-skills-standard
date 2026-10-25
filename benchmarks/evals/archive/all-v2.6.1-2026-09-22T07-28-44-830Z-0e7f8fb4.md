# 🧪 Live Skill Evals Report

> Generated: 2026-10-25T14:54:44.735Z
> Measured transcript-assertion evidence, not structural or executable task verification: outcome assertions are evaluated against transcripts from isolated evaluation workers. Workers are instructed not to use tools and have read-only filesystem capability, but neither tool-use prohibition nor tool invocation is host-enforced or retained here; tool-free execution is unverified. Trigger arms receive only the skill name and description.
> Historical v1 runs remain readable through the compatibility adapter. v2 metrics report case pass rate, assertion pass rate, trigger recall, trigger specificity, and balanced trigger accuracy.
> Activation metrics are omitted for legacy trigger evidence until a clean activation-evidence v2 run replaces it.

## 🔢 Executive Summary (latest complete partition per category)

| Metric | Value |
| --- | --- |
| Categories with a live run | **0** |
| Catalog release status | **NOT READY** |
| Outcome readiness | **READY** |
| Activation readiness | **READY** |
| Evidence mode | **mixed** |
| Protocol provenance | **unknown** |
| Unresolved protocol contributors | **0** |
| Strict outcome-ready skills | **0/0** |
| Activation-ready skills | **0/0** |
| Strict release-ready skills | **0/0** |
| Skills covered (unique category/skill) | **0** |
| Avg. baseline case pass rate | **0%** |
| Avg. with-skill case pass rate | **0%** |
| Avg. delta (valid baselines only) | **0%** |
| Avg. assertion pass rate | **n/a** |
| Avg. balanced trigger accuracy | **n/a** (0 skills) |
| Avg. trigger recall | **n/a** |
| Avg. trigger specificity | **n/a** |
| Skills meeting ≥90% recall and specificity | **0/0** |

## 📦 Per-Category Results (latest complete partition)

| Category | Run | Scored | Protocol | Skills | Baseline | With-Skill | Delta | Assertions | Trigger Recall | Trigger Specificity | Balanced Trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 📋 Per-Skill Detail (latest complete partition per category)

| Skill | Category | Protocol | Baseline Cases | With-Skill Cases | Delta | With-Skill Assertions | Recall | Specificity | Balanced | Guardrail |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 🛡️ How to Verify This Report

1. `pnpm evals:verify -- --all` — re-score committed transcripts from each run's immutable `inputs.json` snapshot.
2. `pnpm evals:report` — regenerate the deterministic category projection, history, and archive.
3. Root, CLI, and MCP verification must report the same result for the same run.
