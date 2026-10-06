---
description: "Deep audit of a skills directory against the Skill Creator standard. Produces a scored report and phased remediation plan."
---

# ⚔️ Battle Test Orchestrator

> **Goal**: Evaluate every `SKILL.md` in the target directory against `common-skill-creator`. Deliver a quantified health report and prioritized remediation plan.

---

## Step 1 — Target Discovery & Tech Stack

Identify the tech stack and all skill files.

```bash
# Count total skills per category
find . -name "SKILL.md" | sed 's|/[^/]*/SKILL.md||' | sort | uniq -c
```

---

## Step 2 — Frontmatter Audit (Breadth Scan)

Run scans to detect format and structure violations.

1. **Check for missing mandatory sections**: `grep -rL "triggers:\|priority:\|Anti-Patterns" <SKILLS>/`
2. **Check for broad glob triggers**: `grep -r "src/\*\*" <SKILLS>/`
3. **Check for length limits**:
   `find . -name "SKILL.md" -exec awk 'END{if(NR>100) print FILENAME": "NR" lines"}' {} \;`

---

## Step 3 — Deep Audit & Evidence Classification

Evaluate skills against `<SKILLS>/common/common-skill-creator/references/rubric.md`:

1. **Structural Checks**: Line count (≤100), frontmatter schema, surgical triggers.
2. **Textual Utility**: Actionability, procedural clarity; verify NO answer-anchor padding.
3. **Executable Outcomes**: Runnable verification commands, deterministic test/verifier pass.
4. **Rule Retirement & Ablation**: Identify retirement candidates via repeated ablation; preserve safety controls until deterministic runtime replacements exist.

---

## Step 4 — Scored Report

**Scoring Algorithm**: Start at 100 points for each category. Apply deductions for findings (🔴-15 / 🟠-8 / 🟡-3 / 🔵-1). Deduct for answer-anchor padding or bloated narrative.

### 📊 Report Format

Output the report using the **Battle Test Report** and **Phased Plan** templates in:
`<SKILLS>/common/common-skill-creator/references/rubric.md` when synced.

## Step 5 — Interactive Follow-up

1. "Generate a `task.md` for Phase 1 remediation?"
2. "Fix the worst offender in [category] now?"
3. "Deep-dive audit on a specific category (e.g., `security`)?"
