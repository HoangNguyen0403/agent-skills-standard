---
description: Implement an approved feature plan with benefit-based placement, TDD, revision-bound evidence, and PR-ready output.
---

# Implement Feature Workflow

Goal: Build an approved feature through bounded TDD slices and route settled work to verification.

## Steps

1. **Load plan**: Find matching PRD/ticket, SRS/FRS, implementation plan, REQ/AC trace, and skills. Ask if target is ambiguous; route missing trace/test lanes to `plan-feature`, `design-solution`, or `implementation-readiness`. Carry `snc_tier`/`model_tier`; high tier adds `specialist-architecture-guard` and `specialist-security-reviewer` before `verify-work`.
2. **Prepare workspace**: Confirm clean or intentional dirty state; create a branch/worktree only when expected. Provision lockfile dependencies before tests. Report install failures exactly; never claim skipped checks passed.
3. **Bound ownership**: Assign each slice one owner; the recorded implementation context may own several coupled slices. Record exact files, goal/deliverable, in/out scope, authority, REQ/AC IDs, required standards, and verification receipt. Prepare a standalone assignment packet; a slice must not depend on inferred plan-level authority.
4. **Implement slices**:
   - Apply the canonical placement decision in `common-subagent-driven-development` §1 before editing: delegate only for a named benefit or a host requirement. Coupled sequential work under a host that permits main-loop implementation stays in one implementation context.
   - Dispatch one owner per disjoint, dependency-ready slice with a recorded benefit; sequence only real dependencies. Worker bootstrap reads its packet and requests only the exact standards it names; do not repeat parent workflow discovery or global intake.
   - Record observable contract, distinct fault, smallest honest layer, minimal cases, and exact focused command before testing.
   - Write/update the failing test first; observe expected RED before implementation. Characterize legacy behavior only when needed.
   - Implement the smallest passing change; refactor without scope expansion.
   - Run focused checks foreground, single-run, sequentially, with no peer mutation; classify invalid RED, unexpected GREEN, timeout, or infrastructure failure.
   - Keep concise revision-bound receipts: changed contract, RED/GREEN evidence, behavior smoke, command/result, and limitations.
5. **Independent review**: Review each slice in a separate owner/context against its ACs and evidence. Implementer self-review does not satisfy this gate, whether the implementer ran in the main loop or in a worker. Record review mode, open findings, and the settled revision.
6. **Recover by cause**: Missing prerequisite → report `needs_context`/`blocked` with the exact item. Defective output → one corrective assignment naming the failed AC. Observed provider exhaustion → only an eligible, already-authorized fallback, with the evidence recorded. Consequential safety/design issue → human decision. Retry count alone never authorizes premium.
7. **Preserve context**: Carry decisions, owner, active slice, and evidence links in the task/plan artifact. Summarize logs; keep source artifacts retrievable. Archive required packets, reports, and receipts at durable references before workspace cleanup.
8. **Settle before shared checks**: Every owner pauses edits and reports a settled revision. Run one final covering gate, including behavior smoke, foreground/sequentially with no peer mutation. Then run the whole-branch independent review; it is required regardless of placement. Later edits invalidate affected evidence; rerun those gates and never weaken checks. A cancelled or timed-out run is not a pass.
9. **Handoff**: Report final gate/smoke receipts and update REQ/AC trace and walkthrough evidence. Continue only within recorded authority; route to `verify-work`.

## Runtime Contract

- Use for approved plans ready to build; TDD, bounded ownership, revision-bound evidence, independent review.
- Required inputs: PRD/ticket with stable REQ/AC trace, owner, and required SRS/test lanes.
- Choose placement per `common-subagent-driven-development` §1: delegate only for a named benefit or a host requirement. Plan approval does not authorize merge, deployment, premium spend, or a different execution mode.
- Required independent review and the final whole-branch review survive either placement; missing nesting support or missing isolation stops only the affected operation.
- Return `needs_context` or `blocked` when required trace, owner, test lanes, authority, required standards, or enforceable isolation are missing.

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
