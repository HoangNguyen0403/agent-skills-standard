---
name: plan-feature
description: "Plan a feature from BRD-lite brief or clear intent into PRD (What), decisions, implementation plan, and task slices."
metadata:
  triggers:
    keywords:
    - plan feature
    - workflow
---
# Plan Feature Skill

> [!IMPORTANT]
> Plan a feature from BRD-lite brief or clear intent into PRD (What), decisions, implementation plan, and task slices.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Feature Planning Workflow (PRD / What)

Goal: Produce a PM-owned decision-complete PRD, delivery plan, and IT Department handoff before code starts.

## Steps

1. Load context:
   - Load baseline: `docs/requirements-standards-baseline.md` (PRD section).
   - Search `docs/brd/` for a matching `[slug]`; if absent, use the newest BRD.
   - If multiple candidates exist and intent is unclear, ask the user to choose/input the target slug.
   - BRD-lite brief, ticket, or user request.
   - Jira/GitHub/GitLab/ADO MCP ticket data when configured; otherwise local ticket text.
   - Existing specs, design references, and repo patterns.
   - `common-product-requirements`, `quality-engineering-business-analysis`, and matched framework skills.
   - BA handoff fields: BRD objective IDs, stakeholder/validation owner, AS-IS/TO-BE, SMART metric, scope fence, assumptions, glossary, risks, and candidate `REQ-*` placeholders.
   - IT Department delivery context: target repos, likely owners, dependency teams, environments, release window, support/ops expectations, and QA lane.
2. Interview:
   - Draft a provisional PRD direction from current context before asking.
   - Ask only for business logic, scope, constraints, and acceptance criteria that cannot be inferred.
   - Ask max 3 blocking decisions at a time; include a recommended default and 2-3 options for each.
   - Treat non-critical unknowns as explicit assumptions.
   - Confirm problem statement, assumptions, target users, JTBD/use cases, platforms, data, analytics, security, performance, rollout, and non-goals.
   - Confirm each requirement has owner, priority, and status.
   - Confirm success metrics and guardrails that must not regress.
   - Confirm offshore handoff needs: timezone/cadence, decision SLA, artifact source of truth, environment access, UAT owner, and release approver.
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
   - For autonomous/channel mode, continue when assumptions are non-critical; return BLOCKED for missing owner, untestable AC, approval, or release constraint.
   - Architecture unclear -> `design-solution`.
   - Plan approved and build-ready -> `implement-feature`.

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
## Runtime Contract
## Handoff Payload
## Blocking Questions
## Next Workflow
design-solution | implement-feature
## Cost Report
Call `get_session_cost(workflow="plan-feature")` before final handoff.
```

