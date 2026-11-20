# Feature Plan: SDLC Workflow-Wide Continuation

Status: proposed implementation plan; owner: repository maintainer; delivery_mode: extended; snc_tier: high; operator_profile: hybrid.

## Decision Brief

- Change: turn the approved workflow-wide, once-per-run continuation direction into requirements and bounded delivery work. This is not another intake round.
- Recommendation: one shared portable continuation contract, referenced by canonical workflow bodies so direct, exported, and MCP-loaded entrypoints receive the same semantics. Preserve workflow-specific routing and gates; no new runtime scheduler.
- Impact if wrong: false progress, skipped decisions, repeated work, or execution beyond the approved task. Verification must observe the next stage's work, not just its printed name.
- Evidence: approved direction and inspected exporter/retrieval paths; actual consumer continuation and overnight persistence remain unverified.
- Approval sought at the end of planning: high-tier design/implementation plan plus execution approach for repository-only work. No merge, deployment, release, premium, account, host-configuration, or runtime-activation permission.
- Decision owner: requesting operator. Engineering owns the implementation; QA owns behavioral verification; independent reviewer is not the implementer. These are assignment roles, not authenticated grants.
- No implementation slice is READY before plan/design authorization. Documentation planning may proceed under existing approval.

## Authority and Trace Source

- Slug: `sdlc-workflow-continuation`.
- BRD: `docs/brd/brd-sdlc-workflow-continuation.md`.
- Approved proposal bytes: SHA-256 `a026dec7b93c381d12872dd57a3f95dc2b567c1c5869d0de26247ba53f6d7764`; operator's “ok” after the linked-brief card approved once-per-run opt-in for planning, not implementation.
- Approval-annotation source revision (before trace-label-only normalization): SHA-256 `8a7f64d21fc250e56f91ce7b4f34322b6b1d74c6ba57d1750a2315e7a0b9c367`; later objective-label formatting preserves the approved meaning.
- Planning approval actor/date/scope: requesting operator / 2026-11-18 / this direction's planning and design only. Stable chat message ID unavailable; do not invent one.
- Objective refs: BRD-OBJ-001 and BRD-OBJ-002. Scope clarification and approved opt-in are settled; don't re-ask.

## Outcome and Guardrails

The operator can start from an individual workflow and obtain its applicable authorized downstream work without routine phase-boundary questions. The same contract applies to `/sdlc`; the router is not a required entrypoint.

Continuation preference and action authorization are separate inputs. Neither `mode=autonomous` nor `auto_continue=true` approves a plan, switches execution mode/account, accepts a release, grants provider access, or overrides host controls. Technical verification, human acceptance, and release retain separate evidence references.

Baseline interruption count, completion rate, duration targets, and budgets: unknown; measure first. No quantitative overnight guarantee is proposed.

## Scope Inventory

All entries below are current files under `.agents/workflows/`, not proof they are installed or executable on a particular host.

### Apply shared direct-entry behavior — in_scope

Router and delivery: `sdlc`, `brainstorm-feature`, `plan-feature`, `design-solution`, `implementation-readiness`, `implement-feature`, `dev-fix`, `code-review`, `verify-work`, `test-loop`, `verify-bug`, `uat-signoff`, `traceability-audit`, `deploy-release`, `publish-notes`, `session-report`, `retro-learn`.

Discovery, architecture, and operations: `discover-product`, `validate-product`, `review-product-value`, `system-design-session`, `review-system-design`, `codebase-review`, `incident-hotfix`, `monitor-respond`.

Adjacent entrypoints: `battle-test`, `create-stitch-design`, `review-stitch-design`, `cyber-exercise`, `cyber-purple-validation`, `cyber-triage`, `marketing-campaign`, `mcp-security-assessment`, `pentest`, `security-test`, `skill-benchmark`, `update-docs`, `zephyr-coverage-analysis`. Shared continuation is applicable only when their real result supplies an eligible task-linked successor. This does not add them to the core chain or authorize their external effects.

### Preserve distribution boundary — excluded

`evals-run` is internal-only (`cli/src/constants/index.ts:102-109`); do not export it or treat this plan as paid-evaluation permission. Internal repo usage keeps its existing controls.

### Surface inventory — in_scope

| Delivery surface | Current consumers | Structural expectation | Live execution status at planning |
| --- | --- | --- | --- |
| native markdown | Antigravity, Windsurf, Kiro | Full canonical continuation instructions survive installation | not assessed |
| command markdown | Claude, OpenCode, Roo | Same semantics survive command rendering and input wrapping | not assessed |
| TOML prompt | Gemini | Same semantics survive TOML parsing/escaping | not assessed |
| reusable prompt | Copilot | Same semantics survive prompt rendering | not assessed |
| skill markdown | Cursor, Trae, Codex | Same semantics survive skill generation and discovery | not assessed |
| MCP workflow lookup | configured MCP clients | Returned canonical body resolves the same continuation contract | not assessed |
| none / unavailable surface | hosts without a supported entrypoint | No fabricated installed entrypoint or successful invocation | unsupported or not assessed, per actual capability |

The participating workflow inventory and surface table are coverage obligations. Parameterized structural cases cover the complete applicable export set; actual-agent runs are recorded per exercised host/version/revision/entrypoint, never generalized to unexercised hosts. Optional workflows absent from a consumer install are missing capability, not an invitation to pick a different task.

### Exclusions

Host scheduling, restart/wakeup, host approval settings, new provider/accounts, new telemetry services, new release operations, and automatic promotion of review policy are excluded. Manual resumption with durable task context is in scope; automatic wakeup is not. No stage runs solely because it appears in `CORE_SDLC_CHAIN`.

## Canonical Requirements

All requirements below are proposed formalizations of the approved direction, not claims of implementation approval.

| ID | Requirement | Owner | Priority | Status | Objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Support once-per-run continuation from direct and router entrypoints. | Engineering | P0 | Proposed | BRD-OBJ-001 |
| REQ-002 | Preserve selected continuation mode across applicable handoffs without routine re-confirmation. | Engineering | P0 | Proposed | BRD-OBJ-001 |
| REQ-003 | Deliver the shared semantics through every applicable supported export and lookup surface. | Engineering | P0 | Proposed | BRD-OBJ-001 |
| REQ-004 | Execute the applicable next workflow rather than merely recommend it. | Engineering | P0 | Proposed | BRD-OBJ-001 |
| REQ-005 | Enforce the task's existing scope, authority, prerequisites, and independent human/host gates before every affected action. | Engineering | P0 | Proposed | BRD-OBJ-002 |
| REQ-006 | Distinguish successful terminal completion, opt-out, blocking input, and unavailable capability. | Engineering | P0 | Proposed | BRD-OBJ-002 |
| REQ-007 | Preserve enough revision-bound task context to resume without replaying settled work blindly. | Engineering | P0 | Proposed | BRD-OBJ-002 |
| REQ-008 | Report evidence honestly and stop no-progress loops without inventing success or next stages. | QA | P0 | Proposed | BRD-OBJ-002 |

## Canonical Acceptance Criteria

| ID | Req | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | A direct workflow invocation, autonomous mode, explicit continuation opt-in, and sufficient task authority | The stage completes with an eligible successor | The successor is loaded and its applicable work executes without a stage-boundary “continue?” prompt | QA | Actual-agent consumer scenario |
| AC-002 | REQ-001 | The same task is entered through `sdlc` | A stage transition becomes eligible | It applies the same continuation rule as direct entry | QA | Actual-agent consumer scenario |
| AC-003 | REQ-002 | An opted-in authorized run with carried task context | An ordinary eligible stage ends | The successor receives the same mode, scope, task revision, authority and stop conditions without repeated intake | QA | Actual-agent consumer scenario |
| AC-004 | REQ-002 | Explicit `auto_continue=false`, or no opted-in continuation | A stage ends | No automatic successor starts | QA | Actual-agent consumer scenario |
| AC-005 | REQ-003 | Each applicable workflow and supported export format | Real export/install/discovery is exercised | The consumer receives the shared contract without changed precedence or dropped references | QA | Export integration |
| AC-006 | REQ-003 | An MCP-only consumer with no local registry filesystem access and the common skill available to the MCP server | It calls `get_workflow` then `get_skill(category="common", name="common-decision-discipline")` | The returned skill body contains the complete normative continuation contract without requiring a separate reference-file fetch | QA | MCP integration |
| AC-007 | REQ-004 | A branching workflow result with a task-linked applicable route | Continuation is eligible | The chosen successor follows the actual result, not a fixed chain or an example in a template | QA | Actual-agent consumer scenario |
| AC-008 | REQ-005 | A successor requires authority not present in the current task grant | Its action becomes due | That action does not execute; the pause names the exact missing approval and owner | QA | Actual-agent denial scenario |
| AC-009 | REQ-005 | A proposed successor changes task scope or has stale consuming evidence | The handoff is assessed | Only the affected work pauses for correction; unrelated valid approvals are retained | QA | Actual-agent denial scenario |
| AC-010 | REQ-006 | A real terminal result or authoritative null successor | The stage completes | The run terminates without inventing another workflow or reporting a block | QA | Actual-agent consumer scenario |
| AC-011 | REQ-006 | A nonterminal handoff needs an uninstalled workflow/standard or unavailable host operation | The consumer attempts the transition | It reports a capability-specific pause and manual resume input, not a successful transition | QA | Actual-agent denial scenario |
| AC-012 | REQ-007 | A run pauses or is interrupted after durable task evidence exists | The operator resumes it | Current work-item identity, approved revisions, scope and evidence are checked before choosing the next unfinished action | QA | Actual-agent recovery scenario |
| AC-013 | REQ-007 | An earlier action may have performed a consequential effect but completion is uncertain | Recovery inspects the handoff | It reconciles authoritative evidence or pauses, rather than blindly replaying the effect | QA | Actual-agent recovery scenario |
| AC-014 | REQ-008 | A repeated workflow/decision state with no changed input or evidence | Routing would repeat the same work | The run pauses with the unresolved cause and required change, without an arbitrary successful terminal status | QA | Actual-agent consumer scenario |
| AC-015 | REQ-008 | Only serialization, static, or synthetic checks have run | Results are reported | They are distinguished from actual next-stage execution and host persistence; unexercised surfaces stay not assessed | QA | Independent evidence review |
| AC-016 | REQ-001 | Channel mode, explicit continuation opt-in, and an authorized task | A successor becomes eligible | The same continuation rule executes the successor without requiring an interactive stage confirmation | QA | Actual-agent consumer scenario |
| AC-017 | REQ-002 | Explicit interactive mode with `auto_continue=true` | The stage ends | The consumer preserves interactive mode and does not start an automatic successor | QA | Actual-agent consumer scenario |
| AC-018 | REQ-002 | No explicit mode with `auto_continue=true` | Entry arguments are interpreted | The consumer does not infer autonomous mode or start an automatic successor | QA | Actual-agent consumer scenario |
| AC-019 | REQ-006 | Conflicting or invalid mode/continuation argument values | A transition is assessed | The consumer pauses with the exact conflict before successor execution | QA | Actual-agent denial scenario |
| AC-020 | REQ-002 | An opted-in run followed by a direct operator opt-out | The next transition becomes eligible | No future automatic successor starts under the former preference | QA | Actual-agent consumer scenario |
| AC-021 | REQ-004 | A specialist/subprocedure whose contract returns to its calling workflow | It completes its assigned work | Control returns to that caller without launching a new global intake or unrelated chain | QA | Actual-agent consumer scenario |

## Continuation Decision Table

This table gives precedence; it does not override any workflow's specialized safety requirements.

| Condition | Action |
| --- | --- |
| Current action not settled, failed proof, or mandatory workflow gate pending | Retain workflow-specific recovery or pause; do not advance on a template's recommendation |
| Actual terminal/null result, or accepted deliverable reached | Finish the run |
| Explicit opt-out or absent continuation opt-in | Finish the current stage without automatic successor execution |
| Changed task, stale affected approval/evidence, missing authority or consequential decision | Pause the affected action with owner/input |
| Missing workflow, required standard, or host capability | Pause with capability gap and resume instructions |
| Successor selected, authorized, available, prerequisites satisfied, progress possible | Load and execute it within the existing run |
| Same unresolved state would repeat | Pause for a changed input/evidence; no busy retry |

## Delivery Plan and Ownership

Use one implementation owner for the coupled shared contract and distribution integration. Independent review is a separate context. Do not split canonical instructions, exports, and MCP delivery into competing implementations.

| Slice | Type and owned components | Complete observable deliverable | Criteria | Dependencies | Estimate/confidence |
| --- | --- | --- | --- | --- | --- |
| D1 | Feature; `.agents/workflows/*.md` except internal-only `evals-run`; normative section in `skills/common/common-decision-discipline/SKILL.md`; CLI export/lookup integration only where real entry paths need changes | A direct opted-in run consumes installed instructions and executes the eligible next stage while opt-out and terminal results stop | AC-001–AC-007, AC-010–AC-011, AC-016–AC-018, AC-020–AC-021 | Plan/design approval and eligible implementation route | M / medium |
| D2 | Feature; same single owner and shared contract; existing task/receipt integrations, not a separate state service | The direct consumer pauses safely, retains resumable context, and recovers without approval leakage, no-progress looping, or blind effect replay | AC-008–AC-009, AC-012–AC-014, AC-019 | D1; retain one owner for shared files | M / medium |
| D3 | Verification; separate QA/reviewer ownership, existing CLI/MCP suites and actual-agent fixtures/evidence; docs/architecture/changelog updates by implementation owner after proof | Workflow/surface coverage and actual consumer evidence are independently assessed without claiming overnight persistence | AC-005–AC-006, AC-015 plus exercised D1/D2 criteria | Settled D1/D2 source; no concurrent mutation during checks | M / low until host probe |

D1 and D2 are sequential because they share the core continuation contract. D3 preparation may proceed independently, but final execution/review uses settled source. No code owner has been dispatched.

Per D1/D2: gate = approved plan/design and explicit per-run continuation opt-in; control = existing authority never broadens; rollback = revert; reversibility = revertible. Shared standards are never activated by editing a consumer's installed copies manually. D3: gate = settled source and authorized test environment; control = no synthetic/live evidence conflation; rollback = revert; reversibility = revertible.

### Narrow verification plan — commands to run after implementation, not evidence already obtained

- Exporter target: `rtk pnpm --filter ./cli exec vitest run src/services/utils/__tests__/WorkflowTransformer.spec.ts`.
- Selected existing workflow acquisition/sync integration tests, adding new cases only for distinct faults not already covered; derive final focused command after the implementation owner inspects those files.
- MCP lookup target: identify the existing `getWorkflow` tests before changing behavior; no new endpoint or runtime executor is required by this plan.
- Trace lane: `rtk pnpm audit:trace --slug sdlc-workflow-continuation --required` when governed design/implementation trace is complete.
- Actual consumer: a repository-only fixture task with direct entry; record workflow invocations, performed work, pauses and terminal outcomes. Do not start a paid evaluation, provider-safety test, or runtime activation without its separate authorization. A missing authorization is an unassessed lane, not a reason to claim completion.
- Regenerate exports using the existing isolated generation path, respecting provenance/ownership controls; do not manually patch `.codex`, `.claude`, or other installed copies.
- Run only the narrow applicable checks; do not use repository-wide audits as a substitute for the consumer scenario.

### Independent scenario oracle and minimum consumer set

QA owns the expected-action oracle; a separate reviewer checks it against the approved direction, explicit task grants, and canonical AC rows before implementation evidence is scored. Expected actions and forbidden actions are recorded before the run, never copied from the candidate output. Synthetic workflow text, tool-call echoes and keyword presence cannot satisfy actual-agent criteria.

Minimum actual-agent cases are the distinct behavior classes in AC-001–AC-004, AC-007–AC-014, and AC-016–AC-021. A parameterized scenario may cover equivalent inputs, but every distinct branch needs an observed result. For denial cases retain evidence that the prohibited successor/action did not execute; for success retain the successor's performed-work evidence, not just a lookup call. AC-005–AC-006 cover complete applicable delivery combinations structurally/integration-wise; AC-015 independently reviews the claim/evidence boundary. These cases are requirements, not tests already run or paid-evaluation authority.

## Risks and Unresolved Inputs

- Runtime continuation support is unverified: Engineering owns a real same-session consumer probe before claiming unattended behavior. If it fails because the host ends the run, report the limit; host-runner work requires a separately scoped decision.
- Missing authorized live-driver/test-provider access blocks only that evidence lane; source and static checks do not prove AC-001.
- Proposed technical design and implementation plan require operator approval before code. Execution approach is not selected: recommend Subagent-Driven with one bounded implementation owner plus separate review; inline is an explicit exception, not assumed permission.
- Documentation and source fixtures may prove coverage/presence, never semantic enforcement or actual host wakeup.

## Status and Next Workflow

- Current lifecycle: `requirements_ready`, from the approved direction only; PRD/design implementation authority is pending.
- Planning handoff: `design-solution` using the same approved direction, without another scope interview.
- After design: `implementation-readiness`; no unconditional `implement-feature` recommendation while plan/design or execution approach is unapproved.
- Technical verification, human acceptance, release: not assessed. No execution run record is claimed by this planning document.

## Planning Verification Receipt

- Standard scoped command attempted: `rtk pnpm audit:trace --slug sdlc-workflow-continuation --required`. It could not start because this checkout has no installed `tsx`/`node_modules`; this is not a passing CLI invocation.
- Alternate execution: import the same `scripts/trace/index.ts` module through the available Bun-backed Eval runtime and call `run(['--root', cwd, '--slug', 'sdlc-workflow-continuation', '--required', '--json'])`.
- Initial document-link findings: BRD objectives lacked formal declaration labels; an abbreviated SRS source range omitted intermediate AC references. Corrected the declarations and explicit mappings without changing the approved scope.
- Final checker result: exitCode 0; `ok: true`; `issues: []`; `assurance: document-links-only`; `execution_evidence: not_evaluated`.
- Independent reviewer identified incomplete MCP-only resource resolution and uncovered control branches. The design now embeds the complete normative rules in the skill body returned by existing `get_skill`, and AC-016 through AC-021 plus the independent oracle cover those branches.
- Live chaining, host persistence, implementation tests and action-authorization enforcement remain NOT RUN / not assessed.
