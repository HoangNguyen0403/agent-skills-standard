---
description: Unified developer workflow for implementing new features. Translates a PRD/Story into an implementation plan, builds the feature using TDD, verifies functionality locally capturing evidence, and delivers a PR.
---

# 🚀 Implement-Feature — Professional Feature Delivery

This workflow manages the entire lifecycle of building a new feature, from taking an approved PRD or User Story through to final local verification and PR delivery. It enforces a strict **Plan -> Implement -> Verify -> Deliver** cycle.

## Input

`/implement-feature <jira-url-or-key-or-prd-path>`

## Workflow

### Step 0: Environment Prep (Turbo)

// turbo
1. **Sync Registry**: `git pull origin develop` in the standard repo.
### Step 1: Requirements Breakdown (Implementation Plan Phase)

> [!TIP]
> **Sub-Agent Delegation**: If your platform supports sub-agents (e.g., Claude, OpenCode, Gemini, Kiro), immediately delegate steps 1 and 2 below to your JIRA Analyst sub-agent (`@specialist-jira-analyst`). If sub-agents are NOT supported (e.g., Antigravity, Windsurf), execute these steps yourself.

1.  **Analyze Specs**: Read the target JIRA Epic/Story or local PRD file. Extract `Acceptance Criteria (ACs)`, `Design References`, and `Data Requirements`.
2.  **Cross-Check Context**: Search the codebase for existing patterns, shared components, or previous implementations.
3.  **Create Implementation Plan**: Initialize `implementation_plan.md`.
    - **Goal**: Clear description of the feature to be built.
    - **Proposed Changes**: Detail the exact architecture, new files to create, and existing files to modify.
    - **Verification Plan**: Detail the test strategy (TDD loop) and which QE skill (`playwright-cli` or `appium-mcp`) will be used to verify the feature *locally* before PR.
4.  **HARD STOP**: Request user approval for the `implementation_plan.md`.

### Step 2: Implementation (TDD Phase)

> [!TIP]
> **Sub-Agent Delegation**: For the coding phase, delegate the TDD loop to your TDD Implementer sub-agent (`@specialist-tdd-implementer`). Provide it with the relevant files from your `implementation_plan.md`. If sub-agents are NOT supported, execute the TDD loop yourself using `common-tdd`.

1.  **Worktree Branching**: Create a new worktree for the feature using `git worktree add ../<ticket-key> -b feat/<ticket-key>-<feature-name>` and `cd` into it.
2.  **Task Tracking**: Initialize `task.md`. Break down the implementation into atomic commits.
3.  **TDD Loop**: Implement the feature using `common-tdd` (Red-Green-Refactor) or the `@specialist-tdd-implementer` sub-agent.
    - Write a failing test for the first AC.
    - Implement the bare minimum to pass.
    - Refactor.
4.  **Enforce Best Practices**: Apply `common-best-practices` and domain-specific skills (e.g., `typescript-best-practices`, `common-ui-design`) throughout implementation.

### Step 3: Local Verification (Enterprise Standard)

Do NOT rely on unit tests alone — verify the full feature against the Acceptance Criteria end-to-end.

1.  **Launch Dev Server**: Run the local dev environment.
2.  **Execute QE Audit**:
    - **Web**: Load `quality-engineering-playwright-cli`. Walk through the newly built user flows. Capture screenshots/videos demonstrating the ACs are met.
    - **Mobile**: Load `quality-engineering-appium-mcp`. Run the flows on an emulator and capture evidence.
3.  **Final Verdict**: Cross-reference the captured flows against the PRD/JIRA. Address any missed requirements or UI bugs immediately.

### Step 4: Deliver PR

1.  **Commit**: Generate atomic commit messages using `caveman-commit`.
2.  **PR Details**: Draft the PR description outlining the "What" and "Why".
3.  **Walkthrough**: Create `walkthrough.md` embedding the local verification evidence (screenshots/videos) to prove the feature works as intended.

---

## 🚫 Anti-Patterns

- **No Blind Implementation**: Never write production code before the `implementation_plan.md` is approved and a failing test is written.
- **No Skipping Local Verify**: Unit tests passing is not enough. Provide end-to-end snapshots/logs in the `walkthrough.md` to prove the UI/UX is correct.
- **No Monolithic PRs**: Keep commits small and mapped to individual ACs.
