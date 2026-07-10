---
name: retro-learn
description: "Convert delivery findings into skill, eval, workflow, and documentation improvements."
metadata:
  triggers:
    keywords:
    - retro learn
    - workflow
---
# Retro Learn Skill

> [!IMPORTANT]
> Convert delivery findings into skill, eval, workflow, and documentation improvements.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


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

## Runtime Contract
- Use after delivery findings, corrections, or friction need converting into durable standards improvements.
- Required inputs: review findings, verification results, or session-report artifacts to classify.
- Return BLOCKED only when no evidence exists to classify.
## Handoff Payload
- `slug`, root causes, skill/eval updates, follow-ups, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Retro: [Name]

## Evidence

## Root Causes

| Finding | Category | Action |
| --- | --- | --- |
| [finding] | [category] | [action] |

## Skill Or Eval Updates

## Outcome Report
feature_status: implemented
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: none

## Next Workflow

## Follow-Ups

## Cost Report
Call `get_session_cost(workflow="retro-learn")` before final handoff.
```

