---
name: skill-benchmark
description: "Benchmark AI skill effectiveness by measuring implementation quality against legacy constraints."
metadata:
  internal: true
  triggers:
    keywords:
    - skill benchmark
    - workflow
---
# Skill Benchmark Skill

> [!IMPORTANT]
> Benchmark AI skill effectiveness by measuring implementation quality against legacy constraints.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# 📊 Skill Benchmark Orchestrator

> **Goal**: Quantify how much active skills improve implementation quality. Deliver a prioritized compliance delta and skill applicability report.

---

## Step 1 — Project Context & Active Skills

Identify the tech stack and all active skills in `AGENTS.md`.

```bash
# 1. Total source files and lines changed
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | sort -rn | head -20
# 2. Check active skill registry
cat AGENTS.md | head -80
```

---

## Step 2 — Auto-Select a Legacy Trap

Pick the file automatically. Rank candidates by the severity of anti-patterns:

- 🔴 **P0**: Hardcoded secrets; Logic inside UI components.
- 🟠 **P1**: Wrong Router pattern; Global state for local concerns; Missing design tokens.
- 🟡 **P2**: Raw user-facing strings (i18n).

---

## Step 3 — Build Eval-Driven Scorecard

Source scorecard from `evals/evals.json`. Distinguish structural checks, textual transcript assertions, and executable verifier outcomes. Never add canned assertion keywords to skills to artificially inflate scores (no answer-anchor padding).
Follow the Scorecard Rubric in `<SKILLS>/common/common-skill-creator/references/benchmark.md` when synced:

1. Read `<SKILLS>/<category>/<skill>/evals/evals.json`.
2. Generate columns for **Failure Pattern** and **Success Pattern**.
3. Refactor the file, citing the exact skill rule for each change.
4. For guardrail skills, read `pressure_scenarios`, `rationalizations`, `red_flags`, and `behavior_assertions`.

---

## Step 4 — Benchmark Report & Evidence Breakdown

Output scorecard and evidence breakdown using templates in `<SKILLS>/common/common-skill-creator/references/benchmark.md` when synced.

- **Score Before vs After**: Report structural, textual transcript, and executable pass rates separately.
- **Evidence Type**: Explicitly label transcript text matches vs deterministic executable outcomes.
- **Behavior Coverage**: Pressure scenarios, rationalizations, red flags, behavior assertions.

---

## Step 5 — Skill Applicability, Ablation & Iteration

For every failure or candidate rule, evaluate using the Iteration Table and ablation criteria in `benchmark.md`:
1. Signal not matching file? → Refine trigger.
2. Rule ineffective? → Clarify procedural logic; do not pad canned keywords.
3. Conflict? → Ensure P0 overrides P1.
4. Baseline model passes or repeated ablation shows zero delta? → Flag as retirement candidate; preserve safety controls until deterministic enforcement exists.
### Suggested .skillsrc Exclusions

Recommend any skills that are noisy or non-applicable for the project.

```yaml
exclude:
  - [skill-id] # reason
```

