---
description: Route a task to the next synced SDLC workflow based on current artifacts and repo state.
---

# SDLC Router Workflow

Goal: Select the next native workflow without loading every workflow body, while preserving a traceable BA -> PM -> IT Department handoff for offshore delivery.

## Steps

1. Inspect state:
   - User request
   - Search `docs/brd/`, `docs/prd/`, and `docs/srs/` for a matching `[slug]`; if absent, use the newest BRD or `git status`.
   - If multiple candidates exist, list them and ask whether to focus, consolidate, or sequence.
   - Baseline reference: `docs/requirements-standards-baseline.md`
   - Existing ticket, BRD-lite brief, PRD, SRS/FRS design, implementation plan, task list, walkthrough, release notes, and retro
   - Jira, ADO, Zephyr, or other MCP context when already configured
   - Changed files and current test status
   - Offshore delivery context: business owner, product owner, implementation owners, QA owner, timezone/cadence constraints, environments, release window, and dependency teams
   - Requirement trace health: `BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> test evidence`

2. Choose next workflow:
   - Unclear idea, missing business case, missing stakeholder owner, or missing measurable value (BRD-lite / Why, BA-owned intake) -> `brainstorm-feature`
   - BRD-lite exists or business direction is clear but product scope, priorities, acceptance criteria, rollout, or delivery plan are unclear (PRD / What, PM-owned planning) -> `plan-feature`
   - PRD exists but technical behavior/contracts unclear (SRS/FRS / How) -> `design-solution`
   - Architecture, auth, trust boundaries, compliance controls, or agent/runtime safety need deeper technical validation -> `design-solution`
   - BRD-lite, PRD, or SRS/FRS exists but readiness unclear -> `implementation-readiness`
   - Approved plan needs code -> `implement-feature`
   - Bug ticket needs fix -> `dev-fix`
   - Ticket or cross-functional change needs specialist fanout, AC coverage, and PR metadata review -> `review-ticket`
   - PR diff needs focused merge-risk review -> `code-review`
   - Code complete but unproven -> `verify-work`

3. Enforce handoff quality:
   - BA output must include business objective, stakeholder/validation owner, AS-IS/TO-BE, SMART metric, scope fence, risks, assumptions, and BRD objective IDs.
   - PM output must link each PRD requirement and AC to a BRD objective, name requirement owners/status/priority, define rollout/ops, and identify whether `design-solution` is required.
   - IT Department handoff must include implementation owner candidates, affected repos/modules, test lanes, environments, release/rollback notes, and open blockers.
   - Never route directly to implementation when BRD/PRD/SRS trace or testable ACs are missing.

4. Set runtime state:
   - Interactive: ask max 3 blocking questions.
   - Autonomous/channel: continue only when required artifacts and owners are known; otherwise return BLOCKED.
   - Emit next workflow, handoff payload, verification command, and owner.

## Output Template

```md
# SDLC Route

## Recommended Workflow

## Requirement Layer

## Handoff Owner

## Required Input

## Blocking Gaps

## Offshore Delivery Notes

## Runtime Contract

## Handoff Payload

## Blocking Questions

## Next Workflow

## Verification Command

## Cost Report
Call `get_session_cost(workflow="sdlc")` before final handoff.
```
