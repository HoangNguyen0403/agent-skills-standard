---
description: Verify feature, bug, UI, API, mobile, security, or deployment work against acceptance criteria.
---

# Verify Work Workflow

Goal: Prove the delivered change works against explicit acceptance criteria before handoff.

## Steps
1. Load scope:
   - BRD-lite, PRD, SRS/FRS, ticket, implementation plan, release note, acceptance criteria, non-goals, changed files, and matched skills.
2. Select verification lanes:
   - Unit/component, integration/API, E2E/visual, mobile, security, migration, or deployment smoke.
3. Execute:
   - Run the smallest reliable automated checks first.
   - Use Playwright/Appium only when user-facing behavior changed.
   - Use Zephyr/Jira/GitHub/GitLab/ADO MCPs only when configured; otherwise record local evidence.
   - If external MCP is unavailable, ask for exported ticket/PR/TC data or mark that lane BLOCKED.
   - **Capture Evidence**: logs, screenshots, traces, or terminal output summaries.
   - **Comparative Audit**: If it's a bug fix, prove the "Before" (failure) vs "After" (success).
4. Judge:
   - PASS: all acceptance criteria proven.
   - FAIL: original bug or missed requirement still reproducible.
   - BLOCKED: environment, credentials, or approval prevents proof.
5. Record evidence:
   - If verification reveals behavior drift, require PRD/SRS updates before PASS.
   - Update traceability notes from BRD objective -> PRD requirement -> SRS/FRS contract -> **verification evidence**.
   - Update project-local `docs/srs/srs-walkthrough.md`.
   - Route next step back to implementation or `dev-fix`.

## Runtime Contract
- Use after implementation, before handoff, or when validating a bug fix.
- Required inputs: explicit scope plus acceptance criteria or expected behavior.
- Return BLOCKED only when environment, credentials, or approval prevents proof.
## Handoff Payload
- verification report, AC trace, comparative evidence, risks observed, updated walkthrough path, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Artifact Template
```md
# Walkthrough: [Name]

## Scope

## Acceptance Criteria Trace

| AC ID   | Status    | Proof / Evidence Link |
| ------- | --------- | --------------------- |
| [ac-id] | PASS/FAIL | [link/summary]        |

## Comparative Evidence (Before vs After)

## Negative Testing Proof (Fail Cases)

## Evidence (Screenshots/Logs)

## Risks Observed

## Next Workflow
```

## Output Template
```md
# Verification Report: [Name]
## Scope
## Checks Run (Lanes)
## Acceptance Criteria Status
## Requirement Trace Status (Business -> Test)
## Observed Risks & Edge Cases

## Next Workflow
implement-feature | dev-fix
## Cost Report
Call `get_session_cost(workflow="verify-work")` before final handoff.
```
