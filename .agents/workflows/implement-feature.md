---
description: Implement an approved feature plan with fresh-context slices, TDD, evidence, and PR-ready output.
---

# Implement Feature Workflow

Goal: Build an approved feature through TDD slices and route completed work to verification.

## Steps

1. Load plan:
   - Search `docs/prd/` and `docs/srs/` for a matching `[slug]`; if absent, use the newest matching artifact.
   - If multiple candidates exist, ask the user to choose or input the target slug.
   - PRD or ticket
   - SRS/FRS technical design if present
   - Implementation plan
   - Matched framework and common skills
2. Prepare workspace:
   - Confirm clean or intentionally dirty git state.
   - Create branch or worktree only when project workflow expects it.
   - Initialize or update `docs/srs/srs-task-list.md` with small vertical slices.
3. Implement slices:
   - For each slice, write or update the failing test first.
   - Do not keep pre-test implementation code as "reference".
   - Implement the smallest passing code.
   - Refactor without expanding scope.
   - Keep slice evidence near the task item.
   - Use sub-agents only when the runtime supports them and ownership is disjoint.
   - If a fix path is unclear, stop and apply root-cause debugging before more code changes.
4. Maintain context hygiene:
   - Start fresh context for large independent slices when possible.
   - Preserve decisions in `docs/srs/srs-task-list.md` or `docs/prd/prd-plan-[slug].md`.
   - If behavior or scope changes, update `docs/prd/prd-[slug].md` and `docs/srs/srs-[slug].md` before closing the slice.
   - Avoid carrying raw logs; summarize failures and fixes.
5. Prepare handoff:
   - Run fresh local automated checks before claiming success.
   - Update requirement trace notes for changed AC coverage.
   - Capture evidence in `docs/srs/srs-walkthrough.md`.
   - For autonomous/channel mode, delegate only with disjoint files, owner, AC IDs, expected artifact, and verification command.
   - Route next step to `verify-work`.

## Output Template

```md
# Implementation Handoff: [Name]

## Completed Slices

## Tests Run

## Changed Contracts

## Requirement Trace Updates

## Evidence

## Known Risks

## Runtime Contract

## Handoff Payload

## Delegation Packets

## Blocking Questions

## Next Workflow

verify-work

## Cost Report
Call `get_session_cost(workflow="implement-feature")` before final handoff.
```
