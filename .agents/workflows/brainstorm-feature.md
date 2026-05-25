---
description: Clarify a rough product or engineering idea into a BRD-lite brief (Why) with measurable business value.
---

# Brainstorm Feature Workflow (BRD-lite / Why)

Goal: Convert vague intent into a compact BRD-lite brief before PRD or technical planning.

## Steps

1. Gather intent:
   - Load baseline: `docs/requirements-standards-baseline.md` (BRD section).
   - Load `common-business-requirements`.
   - Executive summary: purpose, desired outcome, sponsor, validation owner.
   - Business objective
   - Stakeholders and impacted teams
   - Current state (AS-IS) and desired state (TO-BE)
   - Target user
   - Pain or opportunity
   - Desired outcome and value hypothesis
   - SMART metric: baseline, target, and date
   - Cost-benefit or value hypothesis
   - Constraints, glossary terms, and non-goals
2. Explore options:
   - List 3 viable approaches.
   - Capture benefit, cost, risk, and unknowns for each.
   - Include funding/priority rationale.
   - Mark one recommended approach.
3. Pressure-test:
   - Keep BRD solution-free; route functional behavior to PRD/SRS.
   - Check security, privacy, accessibility, performance, data, and rollout risks.
   - Define measurable success metrics and approval criteria.
   - Identify assumptions that need user confirmation.
   - Identify existing repo patterns to reuse.
   - Add Mermaid AS-IS/TO-BE process diagram when workflow complexity affects approval.
4. Decide:
   - Ask only for unresolved product decisions.
   - Record accepted approach and rejected alternatives.
   - Save BRD-lite brief to `docs/specs/product-brief-[slug].md` when writing files is allowed.
   - Route next step to `plan-feature` when intent is actionable.

## Output

## Output Template

```md
# BRD-lite Brief: [Name]
## Executive Summary
## Business Objective
## SMART Success Metric
## Target Users
## Problem
## AS-IS To TO-BE
## Stakeholders And Validation Owner
## Success Metrics
## Cost-Benefit / Value Hypothesis
## Recommended Approach
## Alternatives Considered
## Stakeholders
## Constraints
## Non-Goals
## Glossary
## Open Questions
## Next Workflow

plan-feature
## Cost Report
```
