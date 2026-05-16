---
name: brainstorm-feature
description: "Clarify a rough product or engineering idea into a decision-ready product brief."
metadata:
  triggers:
    keywords:
    - brainstorm feature
    - workflow
---
# Brainstorm Feature Skill

> [!IMPORTANT]
> Clarify a rough product or engineering idea into a decision-ready product brief.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Brainstorm Feature Workflow

Goal: Convert vague intent into a compact product brief before PRD or technical planning.

## Steps

1. Gather intent:
   - Target user
   - Pain or opportunity
   - Desired outcome
   - Constraints
   - Non-goals

2. Explore options:
   - List 3 viable approaches.
   - For each, capture benefit, cost, risk, and unknowns.
   - Mark one recommended approach.

3. Pressure-test:
   - Check security, privacy, accessibility, performance, data, and rollout risks.
   - Identify assumptions that need user confirmation.
   - Identify existing repo patterns to reuse.

4. Decide:
   - Ask only for unresolved product decisions.
   - Record accepted approach and rejected alternatives.
   - Route next step to `plan-feature` when intent is actionable.

## Output Template

Save or present:

```md
# Product Brief: [Name]

## Goal

## Target Users

## Problem

## Recommended Approach

## Alternatives Considered

| Option | Benefit | Cost | Risk |
| --- | --- | --- | --- |
| [option] | [benefit] | [cost] | [risk] |

## Constraints

## Non-Goals

## Open Questions

## Next Workflow
plan-feature
```

