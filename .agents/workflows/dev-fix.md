---
description: Unified developer workflow for fixing bugs. Analyzes JIRA, cross-checks context, proposes a solution via implementation_plan.md, implements the fix, verifies locally with QE skills, and delivers a PR.
---

# 🛠 Dev-Fix — Professional Bug Remediation

This workflow manages the entire lifecycle of a bug fix, from initial JIRA analysis to PR delivery. It enforces a strict **Propose -> Approve -> Verify** cycle using native Antigravity artifacts.

## Input

`/dev-fix <jira-url-or-key>`

## Workflow

### Step 0: Environment Prep (Turbo)

// turbo
1. **Sync Registry**: `git pull origin main` in the standard repo.

### Step 1: Research & Discovery (Implementation Plan Phase)

> [!TIP]
> **Sub-Agent Delegation**: If your platform supports sub-agents (e.g., Claude, OpenCode, Gemini, Kiro), immediately delegate steps 1 and 2 below to your JIRA Analyst sub-agent (e.g., `@specialist-jira-analyst`). If sub-agents are NOT supported (e.g., Antigravity, Windsurf), you must execute these steps yourself.

1.  **Analyze Ticket**: Read the JIRA bug. Extract `Reproduce steps`, `Expected Result`, and `Actual Result`.
2.  **Cross-Check Context**: Search Confluence for related logic/specs. Locate the relevant code in the repository.
3.  **Create Implementation Plan**: 
    - Use the **Implementation Plan Template** below.
    - Initialize project-local `docs/specs/implementation-plan-[slug].md`.
    - **Goal**: Clear description of the root cause.
    - **Proposed Changes**: Exact files and logic to be modified.
    - **Verification Plan**: Detail which QE skill (`playwright-cli` or `appium-mcp`) will be used to verify the fix *locally* before PR.
4.  **HARD STOP**: Request user approval for the implementation plan.
5.  **Readiness Gate**: Run `implementation-readiness`; code only after READY or approved PARTIAL.

### Step 2: Implementation (TDD Phase)

> [!TIP]
> **Sub-Agent Delegation**: For the actual fix, delegate the TDD loop to your TDD Implementer sub-agent (`@specialist-tdd-implementer`). If sub-agents are NOT supported, execute the TDD loop yourself using `common-tdd`.

1.  **Worktree Branching**: Create a new worktree for the fix using `git worktree add ../<ticket-key> -b fix/<ticket-key>` and `cd` into it.
2.  **Task Tracking**: 
    - Use the **Task Template** below.
    - Initialize project-local `docs/templates/task.md`.
3.  **Code**: Implement the fix using `common-tdd` or the `@specialist-tdd-implementer` sub-agent. Follow `common-best-practices` and service-specific `AGENTS.md` rules.

### Step 3: Local Verification (Enterprise Standard)

Do NOT rely on "it builds" — verify the fix against the JIRA reproduction steps.

1.  **Launch Dev Server**: Run the local dev environment for the service.
2.  **Execute QE Audit**:
    - **Web**: Load `quality-engineering-playwright-cli`. Run the reproduction steps. Capture "After" snapshots.
    - **Mobile**: Load `quality-engineering-appium-mcp`. Run the reproduction steps on an emulator.
3.  **Final Verdict**: Compare results against the `Expected Result` in JIRA. If any sub-3px regressions exist, fix them now.

### Step 4: Deliver PR

1.  **Commit**: Generate a commit message using `caveman-commit`.
2.  **PR Details**: Draft the PR description in JIRA wiki markup (for easy copy-pasting to JIRA later).
3.  **Walkthrough**: 
    - Use the **Walkthrough Template** below.
    - Create project-local `docs/templates/walkthrough.md` with evidence of the local verification.

---

## Artifact Templates

### Implementation Plan Template
```md
# Implementation Plan: [Name]

## Goal

## Proposed Changes

## Task Slices

| Slice | Scope | Verification |
| --- | --- | --- |
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

| Check | Result | Evidence |
| --- | --- | --- |
| [check] | [PASS/FAIL/BLOCKED] | [evidence] |

## Risks

## Next Workflow
```

## Cost Report

Call `get_session_cost` and output telemetry here before ending.

## 🚫 Anti-Patterns

- **No Blind Implementation**: Never write code before the implementation plan is approved.
- **No Orphan Sessions**: Always `close` browser/appium sessions used during verification.
- **No skipping local verify**: "I checked it manually" is not enough. Provide snapshots/logs in the project-local `docs/templates/walkthrough.md`.