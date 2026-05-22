---
description: "Implement an approved feature plan with fresh-context slices, TDD, evidence, and PR-ready output."
---

# Implement Feature Workflow

Goal: Build an approved feature through TDD slices and route completed work to verification.

## Steps

1. Load plan:
   - PRD or ticket
   - SRS/FRS technical design if present
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
   - If behavior or scope changes, update `docs/specs/prd-[slug].md` and `docs/specs/srs-[slug].md` before closing the slice.
   - Avoid carrying raw logs; summarize failures and fixes.
5. Prepare handoff:
   - Run local automated checks.
   - Update requirement trace notes for changed AC coverage.
   - Capture evidence in `docs/templates/walkthrough.md`.
   - Route next step to `verify-work`.

## Output

## Output Template

```md
# Implementation Handoff: [Name]

## Completed Slices

## Tests Run

## Changed Contracts

## Requirement Trace Updates

## Evidence

## Known Risks

## Next Workflow

verify-work

## Cost Report
```
