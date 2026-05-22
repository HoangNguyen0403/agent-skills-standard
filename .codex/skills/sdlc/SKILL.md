---
name: sdlc
description: "Route a task to the next synced SDLC workflow based on current artifacts and repo state."
metadata:
  triggers:
    keywords:
    - sdlc
    - workflow
---
# Sdlc Skill

> [!IMPORTANT]
> Route a task to the next synced SDLC workflow based on current artifacts and repo state.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# SDLC Router Workflow

Goal: Select the next native workflow without loading every workflow body.

## Steps

1. Inspect state:
   - User request
   - Baseline reference: `docs/requirements-standards-baseline.md`
   - Existing ticket, BRD-lite brief, PRD, SRS/FRS design, implementation plan, task list, walkthrough, release notes, and retro
   - Jira, ADO, Zephyr, or other MCP context when already configured
   - Changed files and current test status

2. Choose next workflow:
   - Unclear idea or missing business case (BRD-lite / Why) -> `brainstorm-feature`
   - Business direction clear but product scope unclear (PRD / What) -> `plan-feature`
   - PRD exists but technical behavior/contracts unclear (SRS/FRS / How) -> `design-solution`
   - BRD-lite, PRD, or SRS/FRS exists but readiness unclear -> `implementation-readiness`
   - Approved plan needs code -> `implement-feature`
   - Bug ticket needs fix -> `dev-fix`
   - PR or ticket needs multi-lens review -> `review-ticket`
   - Code complete but unproven -> `verify-work`

3. Report only:
   - Recommended workflow
   - Required input artifact
   - Blocking gaps
   - Verification command

## Output Template

```md
# SDLC Route

## Recommended Workflow

## Requirement Layer

## Required Input

## Blocking Gaps

## Verification Command

## Cost Report
```

