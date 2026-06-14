---
description: Clarify a rough product or engineering idea into a BRD-lite brief (Why) with measurable business value.
---

# Brainstorm Feature Workflow (BRD-lite / Why)

Goal: Convert vague intent into a compact BA-owned BRD-lite brief before PM PRD planning or technical design.

## Steps

1. Gather intent:
   - Load baseline: `docs/requirements-standards-baseline.md` (BRD section).
   - Load `common-business-requirements`.
   - Act as BA intake owner for IT Department delivery; PM is the next planning owner, not the BRD author.
   - Draft a provisional brief from the rough idea before asking.
   - Capture purpose, business objective, sponsor, validation owner, stakeholders, target users, pain/opportunity, and value hypothesis.
   - SMART metric: baseline, target, and date
   - Cost-benefit hypothesis, constraints, glossary terms, and non-goals
   - Offshore delivery context: business owner, product owner, delivery lead, QA owner, timezone/cadence constraints, dependency teams, target environments, and release window.
2. Explore options:
   - List 3 viable approaches.
   - Capture benefit, cost, risk, and unknowns for each.
   - Include funding/priority rationale.
   - Mark one recommended approach.
3. Pressure-test:
   - Keep BRD solution-free; route functional behavior to PRD/SRS.
   - Check security, privacy, accessibility, performance, data, and rollout risks.
   - Define measurable success metrics and approval criteria.
   - Treat non-critical unknowns as explicit assumptions.
   - Identify existing repo patterns to reuse.
   - Add Mermaid AS-IS/TO-BE process diagram when workflow complexity affects approval.
   - Split stakeholder asks into atomic candidate PRD requirements (`REQ-*` placeholders) and flag platform, market, permission, and edge-case gaps for PM.
   - Do not mark BA intake complete until the PM handoff contains enough context to draft PRD acceptance criteria without guessing.
4. Decide:
   - Ask only true blocking product decisions, max 3 at a time.
   - Include a recommended default and 2-3 options for each question.
   - Record accepted approach and rejected alternatives.
   - For autonomous/channel mode, continue when assumptions are non-critical; return BLOCKED only for missing owner, value metric, or scope fence.
   - Save BRD-lite brief to `docs/brd/brd-[slug].md` when writing files is allowed.
   - Route next step to `plan-feature` when the BRD-lite handoff is actionable.

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
## Constraints
## Non-Goals
## Glossary
## PM Handoff Checklist
## Runtime Contract
## Handoff Payload
## Blocking Questions
## Open Questions
## Next Workflow
plan-feature
## Cost Report
Call `get_session_cost(workflow="brainstorm-feature")` before final handoff.
```
