---
name: code-review
description: "Run an AI-assisted PR code review using multi-layer lenses with confidence scoring."
metadata:
  triggers:
    keywords:
    - code review
    - workflow
---
# Code Review Skill

> [!IMPORTANT]
> Run an AI-assisted PR code review using multi-layer lenses with confidence scoring.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# 🕵️‍♂️ AI Code Review Orchestrator

> **Goal**: Evaluate PR diffs for security, logic, and architecture.

---

## Step 1 — Scope & Skills

1. Check scope: `git diff origin/<base>...HEAD --name-only`.
2. Sync requirements: if a ticket key or PR URL exists, fetch the intent.
3. Load global skills: `common-code-review`, `common-security-audit`, `common-owasp`, `common-llm-security`.
4. Load framework skills: P0/P1 rules from `AGENTS.md`.
5. If ticket/PR context exists, prefer `review-ticket` for specialist fanout.

---

## Step 2 — Multi-Layer Review (Applying Lenses)

Load `common-code-review`. If synced references are available, use `<SKILLS>/common/common-code-review/references/lenses.md`; otherwise apply these lenses directly:

1. **Security (Mandatory)**.
2. **Logic & Correctness**.
3. **Silent Failures**.
4. **Type Design**.
5. **AI Safety** if LLM code exists.
6. **Vibe Security** using `<SKILLS>/common/common-security-audit/references/vibe-security-scan.md` for AI-generated or fast-moving changes.
7. **Testing**.

---

## Step 3 — Confidence Filter & Report

1. Confidence filter: report findings only when confidence is `>= 76/100`.
2. Report format: use `<SKILLS>/common/common-code-review/references/report.md` if synced; otherwise use the Output Template below.

---

## Step 4 — Verdict

1. Present the report.
2. Ask for one verdict: `APPROVE`, `CHANGES REQUESTED`, or `BLOCKED`.

---

## Step 5 — Batch Reporting

1. Do not post the full report as one comment.
2. Post each finding as a separate thread at the file and line.
3. Post one summary verdict comment.
4. If using `review-ticket`, publish only after user approves `specialist-pr-commenter-batch`.

---

## Step 6 — Implementation Planning

1. Initialize `task.md`.
2. Apply `common-tdd` for code changes.

---

## Step 7 — Skill Feedback Loop (Mandatory)

For every `BLOCKER` or `MAJOR` finding, answer: "Was there an active skill that should have prevented this?"

1. **YES**: Fix the skill's `SKILL.md` (Anti-Patterns) and `evals/evals.json`.
2. **NO**: If recurring, create a new skill via `common-skill-creator`.

## Output Template

- Findings:
- Verdict:
- Next action:

