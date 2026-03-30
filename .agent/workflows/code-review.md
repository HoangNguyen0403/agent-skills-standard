---
description: Run an AI-assisted PR code review using multi-layer lenses with confidence scoring.
---

# 🕵️‍♂️ AI Code Review Orchestrator

> **Goal**: Evaluate PR diffs for security, logic, and architecture. Deliver a confidence-filtered report and a mandatory skill feedback loop.

---

## Step 1 — Scope & Skills

1. **Check Scope**: `git diff origin/<base>...HEAD --name-only` — state file count and lines changed.
2. **Load Global Skills**: `common-code-review`, `common-security-audit`, `common-owasp`, `common-llm-security`.
3. **Load Framework Skills**: P0/P1 rules only from `AGENTS.md`.

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

1. **Confidence Filter**: Only report findings **≥76/100 confidence**.
2. **Report Format**: Use the **Review Finding Template** in:
   [common-code-review/references/report.md](../../skills/common/common-code-review/references/report.md)

---

## Step 4 — Implementation Planning

Ask: "Implement fixes for any of these now?"
If YES: Initialize `task.md` and apply `common-tdd` for code changes.

---

## Step 5 — Skill Feedback Loop (Mandatory)

For every **BLOCKER** or **MAJOR** finding, answer:
_"Was there an active skill that should have prevented this?"_

1. **YES**: Fix the skill's `SKILL.md` (Anti-Patterns) and `evals/evals.json`.
2. **NO**: If recurring, create a new skill via `common-skill-creator`.
