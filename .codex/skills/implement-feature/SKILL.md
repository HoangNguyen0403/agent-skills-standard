---
name: implement-feature
description: "Implement an approved feature plan with fresh-context slices, TDD, evidence, and PR-ready output."
metadata:
  triggers:
    keywords:
    - implement feature
    - workflow
---
# Implement Feature Skill

> [!IMPORTANT]
> Implement an approved feature plan with fresh-context slices, TDD, evidence, and PR-ready output.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Implement Feature Workflow

Goal: Build an approved feature through TDD slices and route completed work to verification.

## Steps

1. Load plan:
   - PRD or ticket
   - Technical design if present
   - Implementation plan
   - Matched framework and common skills
2. Prepare workspace:
   - Confirm clean or intentionally dirty git state.
   - Create branch or worktree only when project workflow expects it.
   - Initialize or update `docs/templates/task.md` with small vertical slices.
3. Implement slices:
   - For each slice, write or update the failing test first.
   - Implement the smallest passing code.
   - Refactor without expanding scope.
   - Keep slice evidence near the task item.
   - Use sub-agents only when the runtime supports them and ownership is disjoint.
4. Maintain context hygiene:
   - Start fresh context for large independent slices when possible.
   - Preserve decisions in `docs/templates/task.md` or `docs/specs/implementation-plan-[slug].md`.
   - Avoid carrying raw logs; summarize failures and fixes.
5. Prepare handoff:
   - Run local automated checks.
   - Capture evidence in `docs/templates/walkthrough.md`.
   - Route next step to `verify-work`.

## Output

## Output Template

```md
# Implementation Handoff: [Name]

## Completed Slices

## Tests Run

## Changed Contracts

## Evidence

## Known Risks

## Next Workflow

verify-work

## Cost Report
```

