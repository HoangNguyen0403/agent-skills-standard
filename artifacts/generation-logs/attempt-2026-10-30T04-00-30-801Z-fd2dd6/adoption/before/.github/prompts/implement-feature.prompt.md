---
description: "Implement an approved feature plan with benefit-based placement, TDD, revision-bound evidence, and PR-ready output."
---

# Implement Feature Workflow

Goal: Build an approved feature through bounded TDD slices and route settled work to verification.

## Steps

1. **Load plan**: Find the matching PRD/ticket, SRS/FRS, implementation plan, REQ/AC trace, and skills. Carry `delivery_mode`, authoritative work-item reference with source revision, owner, approval reference, and inherited `snc_tier`/`model_tier`. In `brief` mode the approved record's observable criteria replace formal PRD/SRS/REQ/AC IDs; never restart intake or invent IDs for a missing filename. A sensitive or scope-grown change reopens only the affected slices and restores the applicable design/approval floor. High tier adds `specialist-architecture-guard` and `specialist-security-reviewer` before `verify-work`. Ask only when the target remains ambiguous after reading the approved record.
2. **Prepare workspace**: Confirm clean or intentional dirty state; create a branch/worktree only when expected. Provision lockfile dependencies before tests. Report install failures exactly; never claim skipped checks passed.
3. **Bound ownership**: Assign each slice an owner, exact files, goal/deliverable, in/out scope, authority, criteria references (REQ/AC IDs when governed; the approved record's observable criteria otherwise), verification lane, approval reference, and verification receipt. Record the one authoritative work item and source revision once; slice rows link criteria and lanes instead of restating their definitions. Blocked slices name the blocker, its owner, and the required input while independent ready slices proceed. Prepare a standalone assignment packet; a slice must not depend on inferred plan-level authority.
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
9. **Handoff**: Report final gate/smoke receipts and update the requirement trace and walkthrough evidence where that lane applies. Run the required audit only for its evidence lane: governed documents `rtk pnpm audit:trace --slug <slug> --required`; required run records `rtk pnpm audit:outcome --records --required --slug <slug> --workflow <workflow> --run-id <run-id>`. Brief tickets acquire no document-trace gate; registry-wide discovery with no selector stays optional. Technical verification, business acceptance, and release stay separate referenced decisions; a passing check reports only technical verification. Continue only within recorded authority; route to `verify-work`.

## Runtime Contract

- Use for approved plans ready to build; TDD, bounded ownership, revision-bound evidence, independent review.
- Required inputs: PRD/ticket with stable REQ/AC trace or an approved `brief` record with observable criteria; owner; required SRS/test lanes for triggered risk.
- Choose placement per `common-subagent-driven-development` §1: delegate only for a named benefit or a host requirement. Plan approval does not authorize merge, deployment, premium spend, or a different execution mode.
- Required independent review and the final whole-branch review survive either placement; missing nesting support or missing isolation stops only the affected operation.
- Return `needs_context` or `blocked` when required trace or brief criteria, owner, test lanes, authority, required standards, or enforceable isolation are missing.

## Handoff Payload

- `slug`, carried `operator_profile`, `delivery_mode`, work-item reference plus source revision, approval reference, `snc_tier`, `model_tier`, completed slices, tests run, changed contracts, requirement trace, delegation packets, evidence-lane refs (technical/acceptance/release), risks, outcome report, next workflow.
- Carry `repository_status` and `activation_status` separately; include authorized next action, settled revision, and evidence links. Publication approval does not grant deployment authority.

## Blocking Questions

- Ask max 3 only when an answer changes the result or safety boundary; include a recommended default and 2-3 options.

## Output Template
```md
# Implementation Handoff: [Name]
## Delivery Mode And Work Item
- Mode: brief | standard | extended; work item + revision: [ref @ rev]; owner: [owner]; approval: [ref]
- Evidence lanes: technical [verify receipt ref], acceptance [not assessed], release [not assessed]
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
