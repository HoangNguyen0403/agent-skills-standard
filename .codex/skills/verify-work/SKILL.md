---
name: verify-work
description: "Verify feature, bug, UI, API, mobile, security, or deployment work against acceptance criteria."
metadata:
  triggers:
    keywords:
    - verify work
    - workflow
---
# Verify Work Skill

> [!IMPORTANT]
> Verify feature, bug, UI, API, mobile, security, or deployment work against acceptance criteria.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Verify Work Workflow

Goal: Prove the delivered change works against explicit acceptance criteria before handoff.

## Steps

1. Load scope:
   - BRD-lite, PRD, SRS/FRS, ticket, implementation plan, or release note.
   - Acceptance criteria and non-goals.
   - Changed files and matched skills.
2. Select verification lanes:
   - Unit or component tests
   - Integration or API tests
   - E2E or visual checks
   - Mobile emulator checks
   - Security checks
   - Migration or deployment smoke
3. Execute:
   - Run the smallest reliable automated checks first.
   - Use Playwright/Appium only when user-facing behavior changed.
   - Use Zephyr/Jira/GitHub/GitLab/ADO MCPs only when configured; otherwise record local evidence.
   - If external MCP is unavailable, ask for exported ticket/PR/TC data or mark that lane BLOCKED.
   - Capture logs, screenshots, traces, or command output summaries.
   - Re-run failed checks after fixes.
4. Judge:
   - PASS: all acceptance criteria proven.
   - FAIL: original bug or missed requirement still reproducible.
   - BLOCKED: environment, credentials, or approval prevents proof.
5. Record evidence:
   - If verification reveals behavior drift, require PRD/SRS updates before PASS.
   - Update traceability notes from BRD objective -> PRD requirement -> SRS/FRS contract -> verification evidence.
   - Update project-local `docs/templates/walkthrough.md`.
   - Route next step back to implementation or `dev-fix`.

## Output

## Artifact Templates

### Walkthrough Template

```md
# Walkthrough: [Name]

## Scope

## Acceptance Criteria

## Evidence

## Risks

## Next Workflow
```

## Output Template

```md
# Verification Report: [Name]

## Scope

## Checks Run

## Acceptance Criteria

## Requirement Trace Status

## Risks

## Next Workflow

implement-feature | dev-fix

## Cost Report
```

