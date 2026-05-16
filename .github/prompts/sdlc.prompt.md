---
description: "Route a task to the next synced SDLC workflow based on current artifacts and repo state."
---

# SDLC Router Workflow

Goal: Select the next native workflow without loading every workflow body.

## Steps

1. Inspect state:
   - User request
   - Existing ticket, PRD, implementation plan, task list, walkthrough, release notes, and retro
   - Jira, ADO, Zephyr, or other MCP context when already configured
   - Changed files and current test status

2. Choose next workflow:
   - Unclear idea -> `brainstorm-feature`
   - Clear feature but no PRD -> `plan-feature`
   - PRD exists but technical decisions missing -> `design-solution`
   - PRD/design exists but readiness unclear -> `implementation-readiness`
   - Approved plan needs code -> `implement-feature`
   - Bug ticket needs fix -> `dev-fix`
   - PR or ticket needs multi-lens review -> `review-ticket`
   - Code complete but unproven -> `verify-work`
   - Evidence needs AC mapping -> `traceability-audit`
   - Verified change needs deploy -> `deploy-release`
   - Shipped change needs communication -> `publish-notes`
   - Session needs permanent evidence -> `session-report`
   - Delivery produced lessons -> `retro-learn`

3. Report only:
   - Recommended workflow
   - Required input artifact
   - Blocking gaps
   - Verification command

## Output Template

```md
# SDLC Route

## Recommended Workflow

## Required Input

## Blocking Gaps

## Verification Command
```
