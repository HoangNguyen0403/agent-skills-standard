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

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


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
   - If stable `REQ-*`, `AC-*`, trace, or required SRS/test lanes are missing, stop and route to `plan-feature`, `design-solution`, or `implementation-readiness`.
2. Prepare workspace:
   - Confirm clean or intentionally dirty git state.
   - Create branch or worktree only when project workflow expects it.
   - Initialize or update `docs/srs/srs-task-list.md` with small vertical slices.
3. Implement slices:
   - For each slice, write or update the failing test first.
   - Consume the named `REQ-*` and `AC-*` for each slice; do not invent scope from code inspection.
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

## Runtime Contract
- Use for approved plans ready to build; failing test first, no pre-test implementation kept as reference.
- Required inputs: PRD/ticket with stable `REQ-*`/`AC-*` trace and required SRS/test lanes.
- Return BLOCKED only when required trace, owner, or test lanes are missing.
## Handoff Payload
- `slug`, `operator_profile` (carried, not re-inferred), completed slices, tests run, changed contracts, delegation packets, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Implementation Handoff: [Name]

## Completed Slices

## Tests Run

## Changed Contracts

## Requirement Trace Updates

## Evidence

## Known Risks

## Delegation Packets

## Outcome Report
feature_status: partially_implemented | implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: verify-work | plan-feature | design-solution
## Next Workflow
verify-work
## Cost Report
Call `get_session_cost(workflow="implement-feature")` before final handoff.
```

