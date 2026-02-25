---
description: Benchmark AI skill effectiveness by measuring implementation quality against legacy constraints. The agent auto-selects a Legacy Trap and grades output against active skills. Works on any tech stack.
---

# 📊 Skill Benchmark Workflow

> **Goal**: Quantify how much active skills improve implementation quality. The agent auto-selects a Legacy Trap, builds a scorecard, refactors, and produces a compliance delta + skill applicability report.

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

## Step 3 — Build Scorecard & Execute

Build the scorecard from active P0/P1 skills, then perform the refactoring in the same step. For each change made, cite the skill rule being applied.

**Scorecard** (fill in only rows relevant to the selected file):

| Skill              | P-Level | Failure Pattern                   | Success Pattern               |
| ------------------ | ------- | --------------------------------- | ----------------------------- |
| Security           | P0      | Hardcoded secrets                 | `process.env.*` or vault      |
| Architecture       | P0      | Fetch/logic in UI component       | Service layer or custom hook  |
| Pages Router Guard | P0      | Introduces `app/` patterns        | Stays in `pages/` conventions |
| State Management   | P1      | Bare `useSelector` / store import | Typed domain hook             |
| Styling            | P1      | Hardcoded `px` values             | CSS variables / design tokens |
| i18n               | P1      | Raw JSX strings                   | `FormattedMessage` / `t()`    |

---

## Step 4 — Benchmark Report

```
Task:   [What was refactored]
File:   [path/to/file]
Date:   [Date]
```

| Criteria  | P-Level | Status | Evidence          |
| --------- | ------- | ------ | ----------------- |
| _[Skill]_ | P0/P1   | ✅/❌  | _[One-line note]_ |

**Compliance Score**:

- Before: `X / N` = **X%**
- After: `Y / N` = **Y%**
- **Δ Delta: +Z%** 🚀

---

## Step 5 — Skill Applicability Report

Evaluate every skill in `AGENTS.md` against the actual project to identify noise.

| Skill          | Applicable?                  | Reason       | Recommendation     |
| -------------- | ---------------------------- | ------------ | ------------------ |
| _[skill/name]_ | ✅ YES / ⚠️ NO / ❌ CONFLICT | _[Evidence]_ | Keep / **Exclude** |

**Summary**: `X applicable`, `Y to exclude`

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

| Failure         | Root Cause                | Fix                                   |
| --------------- | ------------------------- | ------------------------------------- |
| Skill ignored   | Trigger not matching file | Refine `packages`/`files` in registry |
| Rule too vague  | Anti-pattern unclear      | Add explicit "❌ Never do X" example  |
| Pattern missing | No reference code         | Add to `references/` folder           |
| Skills conflict | Two skills contradict     | Ensure P0 overrides P1                |
