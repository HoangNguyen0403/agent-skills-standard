---
description: Unified developer workflow for fixing bugs. Analyzes issue-tracker context, cross-checks docs/code, proposes a solution, implements the fix, verifies locally, and delivers a PR/MR.
---

# 🛠 Dev-Fix — Professional Bug Remediation

This workflow manages the bug-fix lifecycle from issue analysis to PR/MR delivery. It enforces a strict **Propose -> Approve -> Verify** cycle using native artifacts.

## Input

`/dev-fix <issue-url-or-key>`

## Workflow

### Step 0: Environment Prep (Turbo)

// turbo

1. **Sync Registry**: `git pull origin main` in the standard repo.

### Step 1: Research & Discovery (Implementation Plan Phase)

> [!TIP]
> **Sub-Agent Delegation**: If your platform supports sub-agents, delegate ticket extraction to `specialist-jira-analyst` and context lookup to `specialist-codebase-scout`. If sub-agents are NOT supported, execute these steps yourself.

1.  **Analyze Ticket**: Use installed Jira/GitHub/GitLab/ADO MCP first; otherwise use exported ticket text. Extract `Reproduce steps`, `Expected Result`, and `Actual Result`.
2.  **Cross-Check Context**: Use knowledge-base MCP when configured; otherwise use local code search. Locate relevant code.
3.  **Create Implementation Plan**:
    - Use the **Implementation Plan Template** below.
    - Initialize project-local `docs/prd/prd-plan-[slug].md`.
    - **Goal**: Clear description of the root cause.
    - **Proposed Changes**: Exact files and logic to be modified.
    - **Verification Plan**: Detail which QE skill will be used to verify the fix _locally_ before PR.
    - Do not propose code changes until repro steps, expected result, and root cause hypothesis are explicit.
4.  **HARD STOP**: Request user approval for the implementation plan.
5.  **Readiness Gate**: Run `implementation-readiness`; code only after READY or approved PARTIAL.

### Step 2: Implementation (TDD Phase)

> [!TIP]
> **Sub-Agent Delegation**: For the actual fix, delegate the TDD loop to `specialist-tdd-implementer`. If sub-agents are NOT supported, execute the TDD loop yourself using the TDD skill matched in `AGENTS.md`.

1.  **Worktree Branching**: Create a new worktree for the fix using `git worktree add ../<ticket-key> -b fix/<ticket-key>` and `cd` into it.
2.  **Task Tracking**:
    - Use the **Task Template** below.
    - Initialize project-local `docs/srs/srs-task-list.md`.
3.  **Code**: Implement the fix using `common-tdd` or the `@specialist-tdd-implementer` sub-agent. Follow `common-best-practices` and service-specific `AGENTS.md` rules.
    - Delete any pre-test implementation spike before starting the TDD loop.

### Step 3: Local Verification (Enterprise Standard)

Do NOT rely on "it builds" — verify the fix against the issue reproduction steps.

1.  **Launch Dev Server**: Run the local dev environment for the service.
2.  **Execute QE Audit**:
    - **Web**: Load `quality-engineering-playwright-cli`. Run the reproduction steps. Capture "After" snapshots.
    - **Mobile**: Load `quality-engineering-appium-mcp`. Run the reproduction steps on an emulator.
3.  **Final Verdict**: Compare results against the issue `Expected Result`. If any sub-3px regressions exist, fix them now.
    - No success claim without fresh local evidence in `docs/srs/srs-walkthrough.md`.

### Step 4: Deliver PR

1.  **Commit**: Generate a commit message using `caveman-commit`.
2.  **PR/MR Details**: Draft provider-appropriate PR/MR notes and link the source issue.
3.  **Walkthrough**:
    - Use the **Walkthrough Template** below.
    - Create project-local `docs/srs/srs-walkthrough.md` with evidence of the local verification.

---

## Artifact Templates

### Implementation Plan Template

```md
# Implementation Plan: [Name]

## Goal

## Proposed Changes

## Task Slices

| Slice   | Scope   | Verification   |
| ------- | ------- | -------------- |
| [slice] | [scope] | [verification] |

## Risks

## Verification Plan

## Next Workflow
```

### Task Template

```md
# Task: [Name]

## Scope

## Checklist

- [ ] [task]

## Decisions

## Evidence

## Next Workflow
```

### Walkthrough Template

```md
# Walkthrough: [Name]

## Scope

## Acceptance Criteria

## Evidence

| Check   | Result              | Evidence   |
| ------- | ------------------- | ---------- |
| [check] | [PASS/FAIL/BLOCKED] | [evidence] |

## Risks

## Next Workflow
```

## Cost Report

Call `get_session_cost` and output telemetry here before ending.

## 🚫 Anti-Patterns

- **No Blind Implementation**: Never write code before the implementation plan is approved.
- **No Orphan Sessions**: Always `close` browser/appium sessions used during verification.
- **No skipping local verify**: "I checked it manually" is not enough. Provide snapshots/logs in the project-local `docs/srs/srs-walkthrough.md`.
