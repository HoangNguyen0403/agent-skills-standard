---
description: Deep audit of a skills directory against the Skill Creator standard. Produces a scored report and phased remediation plan. Works on any tech stack.
---

# ⚔️ Battle Test Workflow

> **Goal**: Evaluate every `SKILL.md` in the target skill directory against the [Skill Creator Standard](../.agent/skills/skill-creator/SKILL.md). Produce a quantified health report with a prioritized, phased remediation plan so any team can immediately start improving.

> [!IMPORTANT]
> **Token Efficiency First**:
>
> - Count before you read. Use `grep -c`, `wc -l`, and pattern signals for inventory.
> - Audit 100% of SKILL.md frontmatter via pattern matching. Read full body of P0 skills only.
> - Never repeat skill content verbatim in the report.

---

## Step 1 — Discover All Skills

```bash
# 1a. Count and list all SKILL.md files in the project
find . -name "SKILL.md" | sort

# 1b. Count total skills per category
find . -name "SKILL.md" | sed 's|/[^/]*/SKILL.md||' | sort | uniq -c

# 1c. Read the Skill Creator standard to internalize the grading rubric
cat .agent/skills/skill-creator/SKILL.md
```

---

## Step 2 — Frontmatter Audit (Breadth Scan)

Run the following signals **without opening each file**:

```bash
# 2a. Skills with NO triggers at all (critical gap)
grep -rL "triggers:" skills/ --include="SKILL.md"

# 2b. Skills with NO keywords trigger
grep -rL "keywords:" skills/ --include="SKILL.md"

# 2c. Skills with NO priority section
grep -rL "Priority:" skills/ --include="SKILL.md"

# 2d. Skills that over-use broad glob triggers (red flag)
grep -r "src/\*\*" skills/ --include="SKILL.md" -l

# 2e. Anti-pattern format violators (nested backtick instead of 'No X' format)
grep -r "^\- \*\*[^*]*\*\*: \`" skills/ --include="SKILL.md" -l

# 2f. Missing verification checklist
grep -rL "Verification Checklist\|Hardening Checklist" skills/ --include="SKILL.md"

# 2g. Skills exceeding 100-line limit
find . -name "SKILL.md" -exec awk 'END{if(NR>100) print FILENAME": "NR" lines"}' {} \;
```

---

## Step 3 — Deep Audit: P0 Skills (Critical Path)

Open and review every P0 (CRITICAL) skill fully. For each, evaluate:

| Dimension            | Check                                                                   | Max pts |
| -------------------- | ----------------------------------------------------------------------- | ------- |
| **Triggers**         | Has keywords? Has file patterns? Precise (not `src/**`)? Has composite? | 25      |
| **Anti-Patterns**    | Uses strict `**No X**: Do Y [≤15 words]` format? No nested backticks?   | 20      |
| **Verification**     | Has a mandatory checklist with testable pass/fail conditions?           | 20      |
| **Token Efficiency** | Under 100 lines? Uses imperative mood? No conversational filler?        | 20      |
| **References**       | Links to detailed examples vs inlining everything?                      | 15      |

---

## Step 4 — P1/P2 Skills Spot-Check

For non-critical skills, only verify:

1. **Trigger present** and non-trivial.
2. **Priority section** exists with severity label.
3. **Anti-pattern format** is compliant.

---

## Step 5 — Scored Report

### ⚖️ Scoring Algorithm

Score skills in each category **(100 points base)**:

| Deduction       | Condition                                                        | Points |
| --------------- | ---------------------------------------------------------------- | ------ |
| 🔴 **Critical** | No triggers on a P0 skill / Hardcoded secrets in skill content   | -15    |
| 🟠 **High**     | Anti-pattern format violations / Missing verification checklist  | -8     |
| 🟡 **Medium**   | Overly broad trigger / Missing priority severity label           | -3     |
| 🔵 **Low**      | Minor inconsistency (header naming, trailing whitespace, casing) | -1     |

**Scoring categories (report one score per category):**

1. 🎯 **Trigger Accuracy** — Precision and coverage of activations.
2. 💎 **Format Quality** — Compliance with Skill Creator anti-pattern standards.
3. 📚 **Content Depth** — Presence of actionable checklists and references.
4. 🏎️ **Token Efficiency** — Size, imperative mood, no redundancy.

---

Output the report in this format:

```
╔══════════════════════════════════════════════════════════════╗
║                    ⚔️  BATTLE TEST REPORT                    ║
║  Skills Directory: [path]     Overall Score: [X / 100]       ║
║  Tech Stack: [detected]       Date: [YYYY-MM-DD]             ║
╚══════════════════════════════════════════════════════════════╝

### 📊 Health Dashboard

| Category             | Score | Top Finding                      |
|----------------------|-------|----------------------------------|
| 🎯 Trigger Accuracy  | XX/100| [Worst offender]                 |
| 💎 Format Quality    | XX/100| [Worst offender]                 |
| 📚 Content Depth     | XX/100| [Missing item]                   |
| 🏎️ Token Efficiency  | XX/100| [Largest skill]                  |
| **Overall**          | XX/100|                                  |

### 🔴 CRITICAL FINDINGS (Fix First)
- **[C-001]** Trigger: [skill-id] has no triggers — agents will never load it.

### 🟠 HIGH FINDINGS
- **[H-001]** Format: [skill-id] uses nested backtick anti-pattern format.

### 🟡 MEDIUM FINDINGS
- **[M-001]** Trigger: [skill-id] uses `src/**` — overly broad.

### 🗺️ Phased Remediation Plan

| Phase   | Focus                  | Actions                                    |
|---------|------------------------|--------------------------------------------|
| Phase 1 | Trigger Hardening      | Fix P0 trigger gaps; add file+keyword pairs|
| Phase 2 | Format Standardization | Apply `**No X**: Do Y` to all anti-patterns|
| Phase 3 | Content Depth          | Add mandatory checklists to architecture skills|
| Phase 4 | Advanced Triggers      | Add composite (+) and exclude (!) triggers |
| Phase 5 | Deep Dives             | Create missing reference skills or guides  |
```

---

## Step 6 — Interactive Follow-up

After the report, ask:

1. "Generate a `task.md` for Phase 1 so we can start immediately?"
2. "Fix **[C-001]** now? I'll apply the trigger and regenerate the index."
3. "Deep-dive audit on a specific category (e.g., `angular` or `security`)?"
