---
description: Benchmark AI skill effectiveness by measuring implementation quality against legacy constraints. The agent auto-selects a Legacy Trap and grades output against active skills. Works on any tech stack.
---

# 📊 Skill Benchmark Workflow

> **Goal**: Quantify how much active skills improve implementation quality. The agent auto-selects a Legacy Trap, builds a scorecard driven by the skills' own evals, refactors, and produces a compliance delta + skill applicability report.

---

## Step 1 — Discover Project & Active Skills

```bash
cat AGENTS.md | head -80                                    # Active skills
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | sort -rn | head -20  # Largest files
```

---

## Step 2 — Auto-Select a Legacy Trap

**Agent picks the file automatically.** Rank candidates by the severity of anti-patterns present:

| Priority | Signal                                          |
| -------- | ----------------------------------------------- |
| P0       | Hardcoded secrets / API keys                    |
| P0       | Business logic inside UI components             |
| P1       | Wrong Router pattern (App vs Pages mismatch)    |
| P1       | Global state used for local/URL-driven concerns |
| P1       | Hardcoded pixel values or missing design tokens |
| P2       | Raw user-facing strings (i18n violations)       |

> **Report**: State the selected file and justify the choice before proceeding.

---

## Step 3 — Build Eval-Driven Scorecard & Execute

**Source your scorecard from `evals/evals.json`, not from hardcoded patterns.**

For each active P0/P1 skill relevant to the selected file:

1. Read `skills/<category>/<skill>/evals/evals.json`
2. Use the eval `assertions` as the **Success Pattern** column
3. Use the `not_contains` assertions and SKILL.md anti-patterns as the **Failure Pattern** column
4. Perform the refactoring, citing the exact skill rule for each change

**Scorecard** (rows generated from active skill evals for the selected file):

| Skill          | P-Level | Failure Pattern (from `not_contains` assertions / Anti-Patterns) | Success Pattern (from `contains` assertions) |
| -------------- | ------- | ---------------------------------------------------------------- | -------------------------------------------- |
| _[skill name]_ | P0/P1   | _[anti-pattern or not_contains value]_                           | _[expected assertion value]_                 |

> **Eval Alignment check**: For each skill used, note how many of its eval assertion values appear in SKILL.md. Low alignment (<70%) means the skill may not teach what the eval tests — flag it in Step 6.

---

## Step 4 — Benchmark Report

```text
Task:   [What was refactored]
File:   [path/to/file]
Date:   [Date]
```

| Criteria      | P-Level | Status | Evidence                |
| ------------- | ------- | ------ | ----------------------- |
| _[Skill]_     | P0/P1   | ✅/❌  | _[One-line note]_       |
| Eval Coverage | —       | ✅/⚠️  | _[X evals, Y% aligned]_ |

**Compliance Score**:

- Before: `X / N` = **X%**
- After: `Y / N` = **Y%**
- **Δ Delta: +Z%** 🚀

**Eval Alignment** (with-vs-without-skill proxy):

- Skills with full eval coverage (≥3 evals, ≥2 assertions, has `should_not_trigger`): `A / total`
- Avg alignment across used skills: `B%`
- Any skill below 70%: list them → action in Step 6

---

## Step 5 — Skill Applicability Report

Evaluate every skill in `AGENTS.md` against the actual project to identify noise.

| Skill          | Applicable?                  | Has Evals? | Eval Aligned? | Recommendation     |
| -------------- | ---------------------------- | ---------- | ------------- | ------------------ |
| _[skill/name]_ | ✅ YES / ⚠️ NO / ❌ CONFLICT | ✅/❌      | ✅/⚠️/n/a     | Keep / **Exclude** |

**Summary**: `X applicable`, `Y to exclude`, `Z with low eval alignment`

### Suggested .skillsrc Exclusions

```yaml
nextjs:
  ref: nextjs-vX.X.X
  exclude:
    - skill-name # reason

database:
  ref: database-vX.X.X
  exclude:
    - skill-name # reason
```

> ⚠️ Never exclude P0 security or architecture skills without strong justification.

---

## Step 6 — Iteration

For every `❌ FAIL`, identify root cause:

| Failure            | Root Cause                            | Fix                                                                    |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| Skill ignored      | Trigger not matching file             | Refine `packages`/`files` in registry                                  |
| Rule too vague     | Anti-pattern unclear                  | Add `**No X**: Do Y.` line to SKILL.md                                 |
| Pattern missing    | No reference code                     | Add to `references/` folder                                            |
| Skills conflict    | Two skills contradict                 | Ensure P0 overrides P1                                                 |
| Missing evals      | No `evals/evals.json`                 | Create evals with ≥3 prompts, ≥2 assertions each, `should_not_trigger` |
| Low eval alignment | SKILL.md missing key terms            | Add the missing assertion values from evals into SKILL.md guidelines   |
| Eval misalignment  | Evals test things skill doesn't teach | Either update SKILL.md to cover them or update evals to match scope    |
