---
description: "Implement an approved feature plan with benefit-based placement, TDD, revision-bound evidence, and PR-ready output."
---

# Implement Feature Workflow

Goal: Build an approved feature through bounded TDD slices and route settled work to verification.

## Steps

1. **Load plan**: Match PRD/ticket, SRS/FRS, implementation plan, REQ/AC trace, and skills; carry `delivery_mode`, work item @ revision, owner, approval ref, `snc_tier`/`model_tier`.
   `brief` mode uses the approved record's observable criteria in place of PRD/SRS/REQ/AC ids; never restart intake or invent ids.
   Sensitive or scope-grown change reopens only affected slices and restores the design/approval floor; high tier adds architecture-guard and security-reviewer before `verify-work`.
2. **Prepare workspace**: Confirm clean or intentional dirty state; create a branch/worktree only when expected; provision lockfile deps before tests.
   Report install failures exactly; never claim skipped checks passed.
3. **Bound ownership**: Give each slice an owner, files, observable outcome, acceptance criteria, in/out scope, authority, delegated method choices, criteria refs (REQ/AC or brief criteria), required evidence, stop condition, lane, approval, receipt;
   record the work item @ revision once and link criteria/lanes instead of restating them. Standalone packet, never inferred plan authority.
   Blocked slices name blocker, owner, and required input while ready slices proceed.
4. **Check slice freshness** before starting any slice: a recorded decision whose `invalidates:` list intersects the slice's REQ/AC/SRS ids and that no newer approval has resolved
   marks it `BLOCKED-STALE`. Invalidation binds to the approval it supersedes (`supersedes_approval:`), not a calendar date; semantics live only in `common-decision-discipline` → Decision Record.
   Route only the invalidated items to `plan-feature`/`design-solution`; unaffected slices keep their approved revision and continue. No full re-plan.
5. **Implement slices**: Take placement from `common-subagent-driven-development` §1; delegate only for a named benefit or host requirement, and keep coupled sequential work in one context.
   Dispatch one owner per disjoint, dependency-ready slice; workers bootstrap from their packet and request only the standards it names. Resolve discoverable facts from the packet, repository, and named standards before asking; ask only a material decision tools cannot resolve. Choose method inside the packet's delegated choices; an unrelated improvement is a proposal, not scope expansion.
   TDD: record contract, distinct fault, smallest honest layer, minimal cases, and focused command; write the failing test first and observe expected RED.
   Setup errors (compile, syntax, fixtures) are `invalid_red`, never behavioral RED; a pre-repair snapshot alone is `frozen_snapshot_red`; tests after code leave original RED `NOT RUN`.
   Implement the smallest passing change without scope expansion; run focused checks foreground, single-run, no peer mutation.
   Derive counts from raw runner output; reject early zero-exit completions and no-listener runs (zero assertions executed).
   Keep revision-bound receipts for applicable gates (source-ready, focused, consumer-smoke, review, acceptance): contract, RED/GREEN, smoke, command/result, limits; unexecuted checks are `NOT RUN`.
6. **Independent review**: Review each slice in a fresh owner/context against its ACs and evidence; implementer self-review never satisfies this gate. Record review mode, findings, settled revision.
7. **Recover by cause**: Missing prerequisite → `needs_context`/`blocked` with the exact item; defective output → one corrective assignment naming the cited evidence, failed AC, repair boundary, and required verification;
   unchanged evidence → stop and name the missing input instead of retrying or switching method; exhaustion → only an eligible, already-authorized fallback with evidence recorded; safety or design conflict → human decision. Retries never authorize premium.
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

- `slug`, carried `operator_profile`, `delivery_mode`, work-item reference plus source revision, approval reference, `snc_tier`, `model_tier`, completed slices, tests run, changed contracts, requirement trace, delegation packets, evidence-lane refs (technical/acceptance/release), risks, outcome report, next workflow.
- Carry `repository_status` and `activation_status` separately; include authorized next action, settled revision, and evidence links. Publication approval does not grant deployment authority.

## Blocking Questions

- Resolve discoverable facts from the packet, repository, and named standards first; ask max 3 only when the answer changes the result or safety boundary; give a recommended default plus 2–3 options.

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
- **Source-Ready:** [Git SHA + dirty-identity; check statuses explicitly recorded: build/lint/typecheck as PASS | FAIL | NOT RUN | NOT APPLICABLE]
- **Focused Checks:** [Test runner command, raw test count/membership from runner output, RED status (expected_red | frozen_snapshot_red | not_run), GREEN result]
- **Consumer-Smoke:** [Real producer→consumer entrypoint, outward side effects verified | NOT APPLICABLE with scope reason]
- **Independent Review:** [Reviewer identity, spec compliance and code quality verdicts | NOT APPLICABLE with scope reason]
- **Human Acceptance:** [Human partner / operator sign-off status (Approved | Pending | NOT APPLICABLE with scope reason)]

## Known Risks

## Delegation Packets

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: implement-feature, started_at: "[timestamp]",
 completed_at: "[timestamp]", feature_status: "[evidence-derived status]", requirement_trace: {brd_objectives: [], requirements: [],
 acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [],
 recommended_next_workflow: "[evidence-selected workflow or null]", cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
verify-work when the settled evidence proves the approved criteria; dev-fix for an observed defect; null when the slice is not settled.
```

## Cost Report

Call `get_session_cost(workflow="implement-feature")` before handoff (or with `outcome="implemented"`, `completion={role: "orchestrator", activeTasks: 0, pendingTasks: 0}` when orchestrator/unassigned on local stdio with workers/checks settled and consent enabled to trigger preparation; workers never pass completion).
