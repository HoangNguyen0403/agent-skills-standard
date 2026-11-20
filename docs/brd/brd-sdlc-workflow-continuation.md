# Brief: SDLC Workflow-Wide Continuation

lane: direction; snc_tier: high; approval: approved(requesting operator, 2026-11-18; planning only)

- Slug: `sdlc-workflow-continuation`
- Operator profile: hybrid
- Delivery mode: extended
- SNC: S=2 N=1 C=2 total=5 tier=high. Cross-workflow behavior and authority propagation require technical design and independent review; no authorization boundary may be weakened.
- Lifecycle: `requirements_ready` for the approved direction; implementation/design approval and all execution evidence remain separate.

## Decision Card

Outcome: invoking any SDLC workflow directly can continue through its applicable, authorized downstream stages without routine “continue?” prompts.

Recommendation: define shared continuation semantics for workflow entrypoints and handoffs, preserving existing human and host authorization gates. Bind continuation to the work item, current scope, approval references, selected execution mode, and a defined stopping point. A next-workflow recommendation alone is not execution.

Scope: direct entry, inherited run context, eligible stage execution, meaningful pause reasons, and resumable checkpoints. Non-goals: bypassing approvals, inventing host permissions, deployment or premium authority, or promising survival after the host ends a session.

Strongest objection: prompt-level contracts cannot guarantee that a host keeps an agent running. First prove the same-session path and report unsupported host behavior explicitly. Reverse the workflow-only approach if that probe shows the host terminates execution despite a valid continuation contract.

Approval granted: this direction and its requirements for planning/design only, by the operator's “ok” after the saved-brief approval card. No implementation, merge, spend, release, deployment, or runtime activation authority.

## You Said / I Assumed

You said workflows finish without triggering the next stage and ask too much for unattended/overnight use. You corrected the initial router-only interpretation: the same behavior occurs when invoking other SDLC workflows directly. Your subsequent “yes” confirms that corrected workflow-wide scope.

The previous router-only interpretation is superseded; it is retained here as correction history, not active scope.

I assumed: the repository maintainer is the decision owner; Engineering owns the continuation contract and QA owns behavioral validation. Role assignments are proposed, not authenticated account or deployment grants. Host persistence remains a separate assessment; no host configuration changes are authorized.

Agent-proposed success example: an approved direct implementation invocation completes applicable review and verification without asking whether to start each stage.

Agent-proposed anti-goal: treating an unattended preference or `auto_continue=true` as authority to merge, deploy, purchase, switch accounts, or skip human acceptance.

## Contract

### Outcome and constraints

- Cover the SDLC router and every supported direct workflow entrypoint participating in an SDLC handoff.
- Continue eligible downstream work rather than merely announcing its name.
- Reuse approved scope, evidence, and decisions rather than repeat intake.
- Preserve required safety/authorization gates and evidence-lane separation.
- Maintain usable pause/resume context. (assumed elaboration)
- Keep canonical behavior provider-neutral; host settings remain host-owned. (assumed constraint)

### Non-goals

- No removal of required approvals or independent review.
- No inference of deployment, merge, premium, provider, account, or execution-mode permission.
- No automatic execution of a fixed chain when the work item requires a different route or a terminal result.
- No guarantee that instructions keep a terminated or sleeping host alive. Host restart/wakeup implementation is outside this proposal. (assumed scope fence)

### Objectives and candidate acceptance criteria

- **Objective ID**: BRD-OBJ-001 — remove avoidable stage-boundary interruptions for direct and router entrypoints; PRD REQ-001 through REQ-004.
- **Objective ID**: BRD-OBJ-002 — preserve task-scoped authority and produce actionable pause/resume outcomes; PRD REQ-005 through REQ-008.
- A direct workflow can advance to its applicable next workflow when the task authorizes continuation and all prerequisites are satisfied. (assumed formalization)
- Stage-boundary confirmation alone is not requested again within already approved scope. (assumed formalization)
- A missing authorization or consequential decision pauses the consuming action with the exact required input; independent authorized work remains eligible. (assumed formalization)
- Terminal/null handoffs terminate rather than invent a next stage. (assumed formalization)
- Resumption validates current scope and evidence before continuing. (assumed formalization)

Baseline interruption rate and overnight completion rate: unknown; measure first. No numerical reliability or duration target has been supplied.

## Direction Options and Recommendation

### A. Shared workflow continuation contract — recommended first

Define one canonical continuation rule used at direct entry and stage completion; carry task context and durable handoff references through the real export and MCP retrieval paths.

- Load-bearing assumption: the active host permits the agent to load and execute the next workflow within the same run.
- Evidence limits: current-host end-to-end chaining and interruption recovery have not been exercised.
- Decisive trade-off: portable, small adoption surface versus no host wakeup guarantee.
- Proof: a real direct invocation reaches authorized technical verification without routine stage prompts, and negative scenarios pause without unauthorized actions.
- First failure: a satisfied handoff ends the run instead of invoking the next workflow.
- Worst case: ambiguous authority is mistaken for permission; mitigate with fail-closed gates and independent review.
- Cost to abandon: revise the contract/export integration; no new service or production state is committed by this proposal.

### B. Host-controlled durable runner — conditional alternative, not authorized

Use a host adapter to schedule/resume eligible stages after an agent turn/session ends, retaining the same scope and authority checks.

- Load-bearing assumption: an authorized host exposes durable scheduling and enforceable execution controls.
- Evidence limits: host lifecycle APIs, required settings, account eligibility, and costs have not been assessed for this feature.
- Decisive trade-off: stronger lifecycle control versus host coupling, activation, and operational burden.
- Proof: an authorized host demonstrably resumes an interrupted task without duplicate consequential actions or approval bypass.
- First failure: no supported lifecycle interface or insufficient enforcement.
- Worst case: repeated or unauthorized work after restart; requires separate design and human authorization.
- Cost to abandon: host-specific integration and operations work; do not start it based on this brief.

The riskiest assumption is operational: prompt-level handoff can execute the next stage on the target host. Cheapest decisive test: an authorized, repository-only direct-entry consumer run; observe the actual next-stage invocation and the terminal/pause outcome. No paid evaluation or runtime activation is granted here.

## Evidence

| Claim | Status | Source and limit |
| --- | --- | --- |
| Stopping and excessive prompts occur with router and direct invocation | confirmed(conversation: user report and scope correction) | Reproduction accepted; no rerun needed to establish symptom |
| Exporter advertises `auto_continue` | confirmed(cli/src/services/utils/WorkflowTransformer.ts:31-32) | Text declaration, not execution semantics |
| Native and Copilot exports do not receive the same injected argument wrapper as command/TOML/skill exports | confirmed(cli/src/services/utils/WorkflowTransformer.ts:81-107,147-165,175-204,228-249) | Structural export observation; consumer behavior not tested |
| MCP workflow retrieval returns workflow text | confirmed(mcp/src/tools/index.ts:851-875) | Does not itself invoke the next workflow |
| Existing policy forbids redundant phase confirmations within approved deliverables | confirmed(skills/common/common-decision-discipline/SKILL.md:63-74) | Instruction, not host enforcement |
| Existing progress receipts are not wakeup or approval services | confirmed(skills/common/common-subagent-driven-development/references/progress-receipts.md:1-3,46-48) | Reuse where applicable; no capability replacement implied |
| Scope approval and downstream action authority differ | confirmed(.agents/workflows/plan-feature.md:13-33); confirmed(.agents/workflows/implement-feature.md:26-38) | Preserve boundary during remediation |
| Current host can persist an overnight chain | unknown | Needs an authorized host-specific behavior probe |

Evidence revisions (SHA-256 of inspected source bytes):

- `.agents/workflows/sdlc.md`: `c01b6859517a61f0b190f4925fc85e2c6d50937ffce9391896b5bfa57626ec32`
- `.agents/workflows/plan-feature.md`: `a113400bea827830d410e6d37bf590b1ab6dda203d4c388e0da66779f591b9c0`
- `.agents/workflows/implement-feature.md`: `80faa49615552734aedeaeb5ec3f7187467aff3649d985b7d50d5d4c8f5d721a`
- `cli/src/services/utils/WorkflowTransformer.ts`: `7c4755718f2edfdef3032743222e2a52c79b8ddc97e2551b2bd93f1cf8279433`
- `mcp/src/tools/index.ts`: `624975cf868238f1161a0a2b41756a4c484502b5cc30179b6ea213531c1f80e6`
- `skills/common/common-decision-discipline/SKILL.md`: `21b902698f865eefcd8c07aa7133a795a1798a4fb856e9063e07ceaa69f8aeab`
- `skills/common/common-subagent-driven-development/references/progress-receipts.md`: `0431dae7b24f570da2646caa5cf18f5c5e60b4cc47d040e1a9377e195964868f`

## Planner Check

- Confirmed scope applies to individual SDLC workflows, not only `/sdlc`.
- No fixed ordered list is treated as an execution engine.
- The earlier “yes” confirmed scope; the later “ok” approved the saved direction and once-per-run opt-in for planning. Neither authorizes implementation, provider changes, or runtime activation.
- Minor builder decisions: reuse local document/export patterns and existing receipt mechanisms; formatting and internal names may be chosen by Engineering without further intake.
- Consequential decisions: default continuation semantics, authority validation, stop-point semantics, checkpoint freshness, and host capability failure behavior belong to technical design; these are not delegated as minor choices.
- Independent check: separate read-only reviewer `8f1748de-7fd1-4e1d-b9ed-3cb6ad19cb65` found scope and authority boundaries preserved and identified underspecified workflow/surface coverage. The proposed delivery boundaries below incorporate its requested coverage inventory and evidence separation. Reviewer completion is not human approval or live behavior verification.

### Proposed delivery boundaries, not an approved implementation plan

- Establish direct-entry continuation across canonical workflows, transformed exports, and MCP retrieval. Demonstrate an authorized direct invocation executing its applicable next stage, with the same policy visible through every supported delivery surface.
- Establish meaningful pause/resume behavior using existing task and evidence receipts where applicable. Demonstrate missing authority, a changed work item, a terminal handoff, and an interrupted run without restarting settled intake or claiming host wakeup.
- Validate representative direct entries and the router against an independently reviewed authorization oracle. Observe actual stage invocation and outward results; static keyword checks alone do not prove chaining.
- Before claiming workflow-wide coverage, enumerate participating direct entrypoints and supported delivery surfaces, and map each to its expected continue, pause, or terminal outcome. Record structural/export coverage separately from actual consumer runs; unsupported or unexercised combinations remain explicitly unverified. Include missing authority, changed scope, and terminal handoffs in behavioral scenarios. This coverage inventory is required planning output, not proof supplied by a single successful chain.
- Keep one implementation owner for the coupled shared contract/export integration; independent review remains separate. No worker implementation assignment is authorized by this sequence.

### Proposed operating default

Opt in once at any workflow entry using `mode=autonomous auto_continue=true`, then inherit that preference through eligible handoffs. Explicit `auto_continue=false` stops chaining. Interactive invocation without continuation authorization remains interactive. The operator approved this direction for planning; the arguments do not yet implement it. Execution must remain within the authorized deliverable and stop conditions; no new permission is inferred from either flag.

Decision owner: requesting operator. Settled by the planning approval: once-per-run opt-in, not repeated stage approval. Technical implementation/design authorization remains separate.

### Correction retrospective candidate

`IMP-sdlc-direct-entry-scope`: proposed; root cause `workflow` / scope interpretation. The initial response over-emphasized `/sdlc`; the operator clarified that direct workflow invocation has the same symptom. Proposed prevention: a held-out direct-entry scenario requiring workflow-wide scope and separate router/direct-entry evidence. Owner: registry maintainer (proposed). Mechanism verification: not run; adoption and maintenance authorization: pending. No trigger miss was established, and no instruction, policy, registry, or personal-memory changes are authorized by this candidate.

## Approval

- Confirmed scope actor: requesting operator in this conversation.
- Confirmed scope date: 2026-11-18.
- Confirmed scope: workflow-wide continuation for router and direct entry; no implementation permission.
- Authority source: operator's “ok” following the saved-brief decision card approving once-per-run opt-in for planning, not implementation; no stable message identifier is exposed.
- Approved proposal source: `docs/brd/brd-sdlc-workflow-continuation.md` before this approval annotation, SHA-256 `a026dec7b93c381d12872dd57a3f95dc2b567c1c5869d0de26247ba53f6d7764`.
- Direction approval: approved(requesting operator, 2026-11-18), limited to planning/design.
- Authority: planning/design handoff only. Implementation, merge, spend, release, deployment, and runtime activation remain unauthorized.
- Reopen: only changed or newly proposed policy, not the settled direct-entry scope.
- Evidence lanes: technical verification `not assessed`; business acceptance `not assessed`; release `not assessed`.

## Outcome Report

Machine handoff is maintained outside this human brief. `feature_status: requirements_ready`; `recommended_next_workflow: plan-feature`. Technical verification, business acceptance, and release remain not assessed.

## Next Workflow

`plan-feature`, then applicable `design-solution` within the approved planning scope. Stop before implementation until the high-tier plan/design and execution approach are explicitly approved.

## Cost Report

Host token usage and prices are unavailable. No cost or overnight reliability claim is made.
