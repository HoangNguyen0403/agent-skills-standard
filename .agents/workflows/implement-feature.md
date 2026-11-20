---
description: Implement an approved feature plan with benefit-based placement, TDD, revision-bound evidence, and PR-ready output.
---

# Implement Feature Workflow

Goal: Build an approved feature through bounded TDD slices and route settled work to verification.

## Steps

1. **Load plan**: Match PRD/ticket, SRS/FRS, implementation plan, REQ/AC trace, and skills; carry `delivery_mode`, work item @ revision, owner, approval ref, `snc_tier`/`model_tier`.
   `brief` mode uses the approved record's observable criteria in place of PRD/SRS/REQ/AC ids; never restart intake or invent ids.
   Sensitive or scope-grown change reopens only affected slices and restores the design/approval floor; high tier adds architecture-guard and security-reviewer before `verify-work`.
2. **Prepare workspace**: Confirm clean or intentional dirty state; create a branch/worktree only when expected; provision lockfile deps before tests.
   Report install failures exactly; never claim skipped checks passed.
3. **Bound ownership**: Give each slice an owner, files, goal, in/out scope, authority, criteria refs (REQ/AC or brief criteria), lane, approval, receipt;
   record the work item @ revision once and link criteria/lanes instead of restating them. Standalone packet, never inferred plan authority.
   Blocked slices name blocker, owner, and required input while ready slices proceed.
4. **Check slice freshness** before starting any slice: a recorded decision whose `invalidates:` list intersects the slice's REQ/AC/SRS ids and that no newer approval has resolved
   marks it `BLOCKED-STALE`. Invalidation binds to the approval it supersedes (`supersedes_approval:`), not a calendar date; semantics live only in `common-decision-discipline` → Decision Record.
   Route only the invalidated items to `plan-feature`/`design-solution`; unaffected slices keep their approved revision and continue. No full re-plan.
5. **Implement slices**: Take placement from `common-subagent-driven-development` §1; delegate only for a named benefit or host requirement, and keep coupled sequential work in one context.
   Dispatch one owner per disjoint, dependency-ready slice; workers bootstrap from their packet and request only the standards it names.
   TDD: record contract, distinct fault, smallest honest layer, minimal cases, and focused command; write the failing test first and observe expected RED.
   Setup errors (compile, syntax, fixtures) are `invalid_red`, never behavioral RED; a pre-repair snapshot alone is `frozen_snapshot_red`; tests after code leave original RED `NOT RUN`.
   Implement the smallest passing change without scope expansion; run focused checks foreground, single-run, no peer mutation.
   Derive counts from raw runner output; reject early zero-exit completions and no-listener runs (zero assertions executed).
   Keep revision-bound receipts for applicable gates (source-ready, focused, consumer-smoke, review, acceptance): contract, RED/GREEN, smoke, command/result, limits; unexecuted checks are `NOT RUN`.
6. **Independent review**: Review each slice in a fresh owner/context against its ACs and evidence; implementer self-review never satisfies this gate. Record review mode, findings, settled revision.
7. **Recover by cause**: Missing prerequisite → `needs_context`/`blocked` with the exact item; defective output → one corrective assignment naming the failed AC;
   exhaustion → only an eligible, already-authorized fallback with evidence recorded; safety or design conflict → human decision. Retries never authorize premium.
8. **Preserve context**: Carry decisions, owner, active slice, and evidence links in the plan artifact; summarize logs; archive packets, reports, and receipts at durable refs before cleanup.
9. **Settle before shared checks**: Every owner pauses edits and reports a settled revision; run one final covering gate including real producer→consumer smoke for boundary slices.
   Run the whole-branch review (either placement) and `pnpm snc:diff --declared <snc_tier>`; apply a higher tier's gates. Later edits invalidate affected evidence; cancelled runs never pass.
10. **Handoff**: Report gate/smoke receipts and update the requirement trace where that lane applies; run only the audit its lane requires (governed docs
    `rtk pnpm audit:trace --slug <slug> --required`; run records `rtk pnpm audit:outcome --records --required --slug <slug> --workflow <workflow> --run-id <run-id>`).
    Brief tickets take no document-trace gate. Human acceptance stays pending until an authorized human acts; technical verification, business acceptance, and release are separate.
## Runtime Contract
- **Use for**: approved plans ready to build; TDD, bounded ownership, revision-bound evidence, independent review.
- **Required inputs**: REQ/AC trace or approved `brief` criteria, owner, triggered SRS/test lanes, authority, required standards, enforceable isolation.
- **Missing input** → `needs_context` or `blocked`; plan approval never authorizes merge, deploy, premium spend, or a mode change.
- Independent review and the whole-branch review survive either placement; missing nesting support or isolation stops only that operation.
- Load `common-decision-discipline` §8 at entry and every handoff: settled results select successors; specialized gates dominate.
## Handoff Payload

- `slug`, `operator_profile`, `delivery_mode`, work item @ revision, approval, tiers, slices, tests, contracts, trace, packets, evidence lanes, risks, outcome, next workflow.
- `repository_status` and `activation_status` stay separate; publication approval does not grant deployment authority.
## Blocking Questions

- Ask max 3 only when the answer changes the result or safety boundary; give a recommended default plus 2–3 options.

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
### Layered Acceptance
- **Source-Ready:** [Git SHA + dirty-identity; build/lint/typecheck as PASS | FAIL | NOT RUN | NOT APPLICABLE]
- **Focused Checks:** [Runner command, raw count/membership, RED status (expected_red | frozen_snapshot_red | not_run), GREEN result]
- **Consumer-Smoke:** [Real producer→consumer entrypoint, outward side effects verified | NOT APPLICABLE with scope reason]
- **Independent Review:** [Reviewer identity, spec compliance and code quality verdicts | NOT APPLICABLE with scope reason]
- **Human Acceptance:** [Sign-off status (Approved | Pending | NOT APPLICABLE with scope reason)]
## Known Risks
## Delegation Packets
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: implement-feature, started_at: "[timestamp]",
 completed_at: "[timestamp]", feature_status: implemented, requirement_trace: {brd_objectives: [], requirements: [],
 acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [],
 recommended_next_workflow: verify-work, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
verify-work
```
## Cost Report
Call `get_session_cost(workflow="implement-feature")` before handoff; workers never pass `completion`, and orchestrators add it only when tasks are settled and consent is enabled.
