---
description: Benchmark AI skill effectiveness by measuring implementation quality against legacy constraints.
---

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

Source your scorecard from `evals/evals.json`, not from hardcoded patterns.
Follow the Scorecard Rubric in `<SKILLS>/common/common-skill-creator/references/benchmark.md` when synced:

1. Read `<SKILLS>/<category>/<skill>/evals/evals.json`.
2. Generate columns for **Failure Pattern** and **Success Pattern**.
3. Refactor the file, citing the exact skill rule for each change.
4. For guardrail skills, read `pressure_scenarios`, `rationalizations`, `red_flags`, and `behavior_assertions`.

---

## Step 4 — Benchmark Report & Compliance Delta

Output the scorecard and compliant score using the templates in `<SKILLS>/common/common-skill-creator/references/benchmark.md` when synced.

- **Compliance Score Before vs After**.
- **Δ Delta: +Z%** 🚀.
- **Eval Alignment**: How well does the skill teach what the eval tests?
- **Behavior Coverage**: pressure scenarios, rationalizations, red flags, behavior assertions.

---

## Step 5 — Skill Applicability & Iteration

For every `❌ FAIL`, identify the root cause using the **Iteration Table** in:
`<SKILLS>/common/common-skill-creator/references/benchmark.md` when synced.

1. Signal not matching file? → Refine trigger.
2. Rule too vague? → Add Anti-Pattern rule.
3. Conflict? → Ensure P0 overrides P1.
4. Guardrail weak under pressure? → Add rationalization counters and red flags.

### Suggested .skillsrc Exclusions

Recommend any skills that are noisy or non-applicable for the project.

```yaml
exclude:
  - [skill-id] # reason
```
