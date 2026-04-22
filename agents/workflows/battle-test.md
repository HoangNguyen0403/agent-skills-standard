---
description: Deep audit of a skills directory against the Skill Creator standard. Produces a scored report and phased remediation plan.
---

# ⚔️ Battle Test Orchestrator

> **Goal**: Evaluate every `SKILL.md` in the target directory against the [Skill Creator Standard](../../skills/common/common-skill-creator/SKILL.md). Deliver a quantified health report and prioritized remediation plan.

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

1. **Check for missing mandatory sections**: `grep -rL "triggers:\|priority:\|Anti-Patterns" skills/`
2. **Check for broad glob triggers**: `grep -r "src/\*\*" skills/`
3. **Check for length limits**: 
   `find . -name "SKILL.md" -exec awk 'END{if(NR>100) print FILENAME": "NR" lines"}' {} \;`

---

## Step 3 — Deep Audit & Scoring

Pick every P0 (CRITICAL) and a random sample of P1/P2 skills. Evaluate them against the **Grading Rubric** in:
[common-skill-creator/references/rubric.md](../../skills/common/common-skill-creator/references/rubric.md)

1. **Trigger Accuracy**: File patterns + keywords?
2. **Format Quality**: `**No X**: Do Y.` anti-patterns?
3. **Verification**: Mandatory checklists?
4. **Token Efficiency**: Under 100 lines? Imperative mood?

---

## Step 4 — Scored Report

**Scoring Algorithm**: Start at 100 points for each category. Apply deductions for findings (🔴-15 / 🟠-8 / 🟡-3 / 🔵-1).

### 📊 Report Format

Output the report using the **Battle Test Report** and **Phased Plan** templates in:
[common-skill-creator/references/rubric.md](../../skills/common/common-skill-creator/references/rubric.md)

---

## Step 5 — Interactive Follow-up

1. "Generate a `task.md` for Phase 1 remediation?"
2. "Fix the worst offender in [category] now?"
3. "Deep-dive audit on a specific category (e.g., `security`)?"
