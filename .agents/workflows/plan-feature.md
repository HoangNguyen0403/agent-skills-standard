---
description: Plan a feature from BRD-lite brief or clear intent into PRD (What), decisions, implementation plan, and task slices.
---

# Feature Planning Workflow (PRD / What)

Goal: Produce a PM-owned decision-complete PRD, delivery plan, and IT Department handoff before code starts.

## Steps
1. Load context:
   - Load baseline PRD section and search `docs/brd/` for the matching `[slug]`.
   - If multiple candidates exist and intent is unclear, ask the user to choose/input the target slug.
   - Load BRD-lite, ticket text, existing specs, repo patterns, `common-product-requirements`, `quality-engineering-business-analysis`, and matched framework skills.
   - Carry forward BRD objective IDs, SMART metric, scope fence, assumptions, glossary, risks, and delivery context.
2. Interview:
   - Draft a provisional PRD direction from current context before asking.
   - Ask only for business logic, scope, constraints, and acceptance criteria that cannot be inferred.
   - Ask max 3 blocking decisions at a time; include a recommended default and 2-3 options for each.
   - Treat non-critical unknowns as explicit assumptions.
   - Confirm problem statement, assumptions, target users, JTBD/use cases, platforms, data, analytics, security, performance, rollout, and non-goals.
   - Confirm each requirement has owner, priority, and status.
   - Confirm success metrics and guardrails that must not regress.
   - Stop when requirements are actionable.
3. Draft PRD:
   - Save to `docs/prd/prd-[slug].md` when file writes are allowed.
   - Keep "what" separate from "how".
   - Add stable requirement IDs and AC IDs.
   - Use Given/When/Then AC when behavior can be misread.
   - Check user stories for specific persona, business value, INVEST, happy path, edge path, and negative path.
   - Link each requirement back to BRD-lite business objective.
   - Include risk categories, rollout/ops, decision log, analytics/telemetry, and changelog.
   - Mark unresolved blocking product decisions as blockers.
   - Include a RACI table for BA, PM, architect, backend, frontend, mobile, QA, release, and business/UAT approver when more than one delivery role is involved.
4. Create implementation plan:
   - Define components, contracts, data changes, migrations, risks, and verification.
   - Slice work into fresh-context tasks.
   - Map each task slice to requirement IDs, AC IDs, likely owner role, repo/module, expected artifact, and verification lane.
   - Identify whether `design-solution` is required before coding.
5. Route:
   - Continue when assumptions are non-critical; return BLOCKED for missing owner, untestable AC, approval, or release constraint.
   - Architecture unclear -> `design-solution`; approved build-ready plan -> `implement-feature`.

## Runtime Contract
- Use after BRD-lite or when clear feature intent exists but PRD does not.
- Required inputs: BRD-lite or equivalent intent, plus enough context to name users, goals, and constraints.
- Return BLOCKED only for missing owner, untestable AC, approval, or release constraint.
## Handoff Payload
- `slug`, PRD path, requirement IDs, AC IDs, decisions, RACI, rollout notes, task slices, verification plan, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Output Template
```md
# Feature Plan: [Name]
## PRD
## Problem Statement
## Goals And Guardrails
## Personas / JTBD
## Use Cases
## Requirement Trace
## User Stories And ACs
## Decisions
| Decision   | Choice   | Reason   |
| ---------- | -------- | -------- |
| [decision] | [choice] | [reason] |
## RACI / IT Department Handoff
## Analytics / Telemetry
## Risks And Assumptions
## Rollout / Ops
## Implementation Plan
## Task Slices
## Verification Plan

## Next Workflow
design-solution | implement-feature
## Cost Report
Call `get_session_cost(workflow="plan-feature")` before final handoff.
```
