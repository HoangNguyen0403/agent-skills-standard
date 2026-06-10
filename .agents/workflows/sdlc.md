---
description: Route a task to the next synced SDLC workflow based on current artifacts and repo state.
---

# SDLC Router Workflow

Goal: Select the next native workflow without loading every workflow body, while preserving a traceable BA -> PM -> IT Department handoff for offshore delivery.

## Steps

1. Inspect state:
   - User request
   - **Context Resolution**:
     - Search `docs/brd/`, `docs/prd/`, and `docs/srs/` for a matching `[slug]` based on the user's intent or mentioned feature.
     - **Fallback (Implicit Intent)**: If no slug or feature is mentioned, check the **most recently modified** file in `docs/brd/` or check `git status` for newly created BRD files.
     - **Ambiguity Resolution**: If multiple candidates exist (e.g., 3 different features modified today), **you MUST list the candidates and ask the user to choose or input the target slug(s).**
     - **Multi-Select Intent**: If the user selects multiple slugs, ask if they want to:
       - **Focus**: Work on just one for now (Recommended for context hygiene).
       - **Consolidate**: Merge multiple BRDs into a single consolidated PRD/SRS.
       - **Sequence**: Process them one after another in this session.
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
   - BRD-lite, PRD, or SRS/FRS exists but readiness unclear -> `implementation-readiness`
   - Approved plan needs code -> `implement-feature`
   - Bug ticket needs fix -> `dev-fix`
   - PR or ticket needs multi-lens review -> `review-ticket`
   - Code complete but unproven -> `verify-work`

3. Enforce handoff quality:
   - BA output must include business objective, stakeholder/validation owner, AS-IS/TO-BE, SMART metric, scope fence, risks, assumptions, and BRD objective IDs.
   - PM output must link each PRD requirement and AC to a BRD objective, name requirement owners/status/priority, define rollout/ops, and identify whether `design-solution` is required.
   - IT Department handoff must include implementation owner candidates, affected repos/modules, test lanes, environments, release/rollback notes, and open blockers.
   - Never route directly to implementation when BRD/PRD/SRS trace or testable ACs are missing.

4. Report only:
   - Recommended workflow
   - Required input artifact
   - Blocking gaps
   - Verification command
   - Handoff owner and next accountable team member

## Output Template

```md
# SDLC Route

## Recommended Workflow

## Requirement Layer

## Handoff Owner

## Required Input

## Blocking Gaps

## Offshore Delivery Notes

## Verification Command

## Cost Report
```
