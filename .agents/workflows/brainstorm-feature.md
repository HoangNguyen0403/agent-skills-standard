---
description: Clarify a rough product or engineering idea into a BRD-lite brief (Why) with measurable business value.
---

# Brainstorm Feature Workflow (BRD-lite / Why)

Goal: Convert vague intent into a compact BA-owned BRD-lite brief before PM PRD planning or technical design.

## Steps

1. Gather intent:
   - Load baseline BRD section and `common-business-requirements`.
   - Draft a provisional brief before asking.
   - Capture objective, sponsor, validation owner, stakeholders, users, pain/opportunity, value hypothesis, SMART metric, constraints, glossary, non-goals, and delivery context.
2. Explore options:
   - List 3 viable approaches.
   - Capture benefit, cost, risk, and unknowns for each.
   - Include funding/priority rationale.
   - Mark one recommended approach.
3. Pressure-test:
   - Keep BRD solution-free; route functional behavior to PRD/SRS.
   - Check security, privacy, accessibility, performance, data, rollout risks, and measurable approval criteria.
   - Treat non-critical unknowns as assumptions.
   - Split stakeholder asks into candidate `REQ-*` placeholders and flag platform, market, permission, and edge-case gaps for PM.
4. Decide:
   - Ask only true blocking product decisions, max 3 at a time.
   - Include a recommended default and 2-3 options for each question.
   - Record accepted approach and rejected alternatives.
   - Continue on non-critical assumptions; return BLOCKED only for missing owner, value metric, or scope fence.
   - Save to `docs/brd/brd-[slug].md` when writes are allowed and route to `plan-feature`.

## Runtime Contract

- Use for rough feature, ops, or process-change ideas before PRD.
- Required inputs: rough intent plus any known owner, metric, or scope fence.
- Return BLOCKED only for missing owner, measurable value, or clear scope boundary.

## Handoff Payload

- `slug`, executive summary, business objective, SMART metric, recommended approach, alternatives, constraints, non-goals, open questions, PM handoff checklist.

## Blocking Questions

- Ask max 3 at a time with a recommended default and 2-3 options.

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
## Offshore Delivery Context
## Recommended Approach
## Alternatives Considered

## Stakeholders

## Constraints
## Non-Goals
## Glossary
## PM Handoff Checklist

## Open Questions
## Next Workflow
plan-feature
## Cost Report
Call `get_session_cost(workflow="brainstorm-feature")` before final handoff.
```
