---
description: Run an AI-assisted PR code review using multi-layer lenses with confidence scoring.
---

# 🕵️‍♂️ AI Code Review Orchestrator

> **Goal**: Evaluate PR diffs for security, logic, and architecture.

---

## Step 1 — Scope & Skills

1. Check scope: `git diff origin/<base>...HEAD --name-only`.
2. Sync requirements: if a ticket key or PR URL exists, fetch the intent.
3. Load global skills: `common-code-review`, `common-security-audit`, `common-owasp`, `common-llm-security`.
4. Load framework skills: P0/P1 rules from `AGENTS.md`.

---

## Step 2 — Multi-Layer Review (Applying Lenses)

Run the following lenses from [lenses.md](../../skills/common/common-code-review/references/lenses.md) against the diff:

1. **Security (Mandatory)**: [Lens 1](../../skills/common/common-code-review/references/lenses.md#lens-1-security-mandatory)
2. **Logic & Correctness**: [Lens 2](../../skills/common/common-code-review/references/lenses.md#lens-2-architecture--correctness)
3. **Silent Failures**: [Lens 3](../../skills/common/common-code-review/references/lenses.md#lens-3-silent-failures--error-handling)
4. **Type Design**: [Lens 4](../../skills/common/common-code-review/references/lenses.md#lens-4-type-design)
5. **AI Safety**: (If LLM code exists) [Lens 5](../../skills/common/common-code-review/references/lenses.md#lens-5-ai--llm-security)
6. **Testing**: [Lens 6](../../skills/common/common-code-review/references/lenses.md#lens-6-test-coverage--doc-accuracy)

---

## Step 3 — Confidence Filter & Report

1. Confidence filter: report findings only when confidence is `>= 76/100`.
2. Report format: use [common-code-review/references/report.md](../../skills/common/common-code-review/references/report.md).

---

## Step 4 — Verdict

1. Present the report.
2. Ask for one verdict: `APPROVE`, `CHANGES REQUESTED`, or `BLOCKED`.

---

## Step 5 — Batch Reporting

1. Do not post the full report as one comment.
2. Post each finding as a separate thread at the file and line.
3. Post one summary verdict comment.

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
