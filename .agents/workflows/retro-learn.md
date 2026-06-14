---
description: Convert delivery findings into skill, eval, workflow, and documentation improvements.
---

# Retro Learn Workflow

Goal: Turn defects, missed expectations, and delivery friction into durable standards improvements.

## Steps

1. Gather evidence:
   - Review findings
   - Bugs found during verification
   - Security findings
   - User corrections
   - Failed or slow checks
   - Token or context pain
   - `session-report` artifacts
2. Classify:
   - Skill rule gap
   - Eval coverage gap
   - Workflow gap
   - Documentation gap
   - Tooling gap
   - Specialist gap
   - Environment-only issue
3. Decide action:
   - Existing skill should prevent it: update `SKILL.md` and `evals/evals.json`.
   - No skill covers it: propose a new skill.
   - Workflow caused drift: update `.agents/workflows`.
   - Specialist caused drift: add budget, fallback, or output-format rule.
   - Tooling can catch it: add or update an audit script.
4. Verify learning:
   - Run changed skill validation.
   - Run eval alignment.
   - Record remaining follow-ups.

## Output Template

```md
# Retro: [Name]

## Evidence

## Root Causes

| Finding | Category | Action |
| --- | --- | --- |
| [finding] | [category] | [action] |

## Skill Or Eval Updates

## Runtime Contract

## Handoff Payload

## Blocking Questions

## Next Workflow

## Follow-Ups

## Cost Report
Call `get_session_cost(workflow="retro-learn")` before final handoff.
```
