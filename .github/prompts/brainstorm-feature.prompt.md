---
description: "Clarify a rough product or engineering idea into a BRD-lite brief (Why) with measurable business value."
---

# Brainstorm Feature Workflow (BRD-lite / Why)

Goal: Convert vague intent into a compact BRD-lite brief before PRD or technical planning.

## Steps

1. Gather intent:
   - Load baseline: `docs/requirements-standards-baseline.md` (BRD section).
   - Load `common-business-requirements`.
   - Business objective
   - Stakeholders and impacted teams
   - Current state (AS-IS) and desired state (TO-BE)
   - Target user
   - Pain or opportunity
   - Desired outcome and value hypothesis
   - Constraints
   - Non-goals
2. Explore options:
   - List 3 viable approaches.
   - Capture benefit, cost, risk, and unknowns for each.
   - Include funding/priority rationale.
   - Mark one recommended approach.
3. Pressure-test:
   - Check security, privacy, accessibility, performance, data, and rollout risks.
   - Define measurable success metrics and approval criteria.
   - Identify assumptions that need user confirmation.
   - Identify existing repo patterns to reuse.
4. Decide:
   - Ask only for unresolved product decisions.
   - Record accepted approach and rejected alternatives.
   - Save BRD-lite brief to `docs/specs/product-brief-[slug].md` when writing files is allowed.
   - Route next step to `plan-feature` when intent is actionable.

## Output

## Output Template

```md
# BRD-lite Brief: [Name]

## Business Objective

## Target Users

## Problem

## AS-IS To TO-BE

## Success Metrics

## Recommended Approach

## Alternatives Considered

## Stakeholders

## Constraints

## Non-Goals

## Open Questions

## Next Workflow

plan-feature

## Cost Report
```
