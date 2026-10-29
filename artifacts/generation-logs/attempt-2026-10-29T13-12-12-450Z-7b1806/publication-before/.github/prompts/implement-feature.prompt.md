---
description: "Implement an approved feature plan with fresh-context slices, TDD, revision-bound evidence, and PR-ready output."
---

# Implement Feature Workflow

Goal: Build an approved feature through bounded TDD slices and route settled work to verification.

## Steps

1. **Load plan**: Find matching PRD/ticket, SRS/FRS, implementation plan, REQ/AC trace, and skills. Ask if target is ambiguous; route missing trace/test lanes to `plan-feature`, `design-solution`, or `implementation-readiness`. Carry `snc_tier`/`model_tier`; high tier adds `specialist-architecture-guard` and `specialist-security-reviewer` before `verify-work`.
2. **Prepare workspace**: Confirm clean or intentional dirty state; create a branch/worktree only when expected. Provision lockfile dependencies before tests. Report install failures exactly; never claim skipped checks passed.
3. **Bound ownership**: Assign each slice an owner, exact files, goal/deliverable, in/out scope, authority, REQ/AC IDs, and verification receipt.
4. **Implement slices**:
   - Record observable contract, distinct fault, smallest honest layer, minimal cases, and exact focused command before testing.
   - Write/update the failing test first; observe expected RED before implementation. Characterize legacy behavior only when needed.
   - Implement the smallest passing change; refactor without scope expansion.
   - Run focused checks foreground, single-run, sequentially, with no peer mutation; classify invalid RED, unexpected GREEN, timeout, or infrastructure failure.
   - Keep concise revision-bound receipts: changed contract, RED/GREEN evidence, behavior smoke, command/result, and limitations.
5. **Preserve context**: Carry decisions, owner, active slice, and evidence links in the task/plan artifact. Summarize logs; keep source artifacts retrievable.
6. **Settle before shared checks**: Every owner pauses edits and reports a settled revision. Run one final covering gate, including behavior smoke, foreground/sequentially with no peer mutation. Later edits invalidate affected evidence; rerun those gates and never weaken checks.
7. **Handoff**: Report final gate/smoke receipts and update REQ/AC trace and walkthrough evidence. Continue only within recorded authority; route to `verify-work`.

## Runtime Contract

- Use for approved plans ready to build; TDD, bounded ownership, revision-bound evidence.
- Required inputs: PRD/ticket with stable REQ/AC trace, owner, and required SRS/test lanes.
- Return BLOCKED only when required trace, owner, or test lanes are missing.

## Handoff Payload

- `slug`, carried `operator_profile`, `snc_tier`, `model_tier`, completed slices, tests run, changed contracts, requirement trace, delegation packets, risks, outcome report, next workflow.
- Carry `repository_status` and `activation_status` separately; include authorized next action, settled revision, and evidence links. Publication approval does not grant deployment authority.

## Blocking Questions

- Ask max 3 only when an answer changes the result or safety boundary; include a recommended default and 2-3 options.
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

{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: implement-feature, feature_status: implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: verify-work, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow

verify-work

## Cost Report

Call `get_session_cost(workflow="implement-feature")` before final handoff.
```
