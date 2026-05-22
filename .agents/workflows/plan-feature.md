---
description: Plan a feature from BRD-lite brief or clear intent into PRD (What), decisions, implementation plan, and task slices.
---

# Feature Planning Workflow (PRD / What)

Goal: Produce a decision-complete PRD and implementation plan before code starts.

## Steps

1. Load context:
   - Load baseline: `docs/requirements-standards-baseline.md` (PRD section).
   - BRD-lite brief, ticket, or user request.
   - Jira/GitHub/GitLab/ADO MCP ticket data when configured; otherwise local ticket text.
   - Existing specs, design references, and repo patterns.
   - `common-product-requirements`, `quality-engineering-business-analysis`, and matched framework skills.
2. Interview:
   - Ask only for business logic, scope, constraints, and acceptance criteria that cannot be inferred.
   - Confirm target users, platforms, data, security, performance, rollout, and non-goals.
   - Confirm each requirement has owner, priority, and status.
   - Stop when requirements are actionable.
3. Draft PRD:
   - Save to `docs/specs/prd-[slug].md` when file writes are allowed.
   - Keep "what" separate from "how".
   - Add stable requirement IDs and AC IDs.
   - Link each requirement back to BRD-lite business objective.
   - Mark unresolved items as blockers, not assumptions.
4. Create implementation plan:
   - Define components, contracts, data changes, migrations, risks, and verification.
   - Slice work into fresh-context tasks.
   - Identify whether `design-solution` is required before coding.
5. Route:
   - Architecture unclear -> `design-solution`.
   - Plan approved and build-ready -> `implement-feature`.

## Output

## Output Template

```md
# Feature Plan: [Name]

## PRD

## Requirement Trace

## Decisions

| Decision   | Choice   | Reason   |
| ---------- | -------- | -------- |
| [decision] | [choice] | [reason] |

## Implementation Plan

## Task Slices

## Verification Plan

## Next Workflow

design-solution | implement-feature

## Cost Report
```
