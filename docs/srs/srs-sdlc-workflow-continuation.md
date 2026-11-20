# Technical Design: SDLC Workflow-Wide Continuation

Status: proposed design; owner: Engineering; delivery_mode: extended; snc_tier: high; operator_profile: hybrid.

## Decision Brief

- Recommendation: keep workflow execution agent-owned. Embed the complete normative continuation contract in a compact section of `skills/common/common-decision-discipline/SKILL.md`; workflow bodies require that skill. Local reads and existing MCP `get_skill` deliver the same complete contract. Do not turn the CLI, MCP lookup, or audit chain into an executor.
- Impact if wrong: stopping despite opt-in, scope/approval leakage, or duplicated actions on recovery. Gate each consuming action against original task authority and current evidence.
- Scope approval permits planning/design only. This design and its implementation plan are not approved for code.
- Unresolved operator decision: approve this technical contract and repository implementation using the selected execution approach. No implementation slice is READY before that approval. Host persistence remains outside scope.
- Evidence basis: BRD source/approval chain and PRD references below; there is no live chaining or denial proof yet.

## Trace Source

- Original work item: `docs/brd/brd-sdlc-workflow-continuation.md`; approved proposal SHA-256 `a026dec7b93c381d12872dd57a3f95dc2b567c1c5869d0de26247ba53f6d7764`; approval-annotated SHA-256 `8a7f64d21fc250e56f91ce7b4f34322b6b1d74c6ba57d1750a2315e7a0b9c367`.
- Approval actor/date/scope: requesting operator / 2026-11-18 / planning and design only, via “ok” after the saved-brief card.
- PRD: `docs/prd/prd-sdlc-workflow-continuation.md`, SHA-256 `c6698b765eec40c73e9663642d666592f9cc55dacebc365c83e1d5ed7bf6ab12`; REQ-001 through REQ-008 and AC-001 through AC-021 are proposed implementation criteria.
- Evidence lanes: technical verification not assessed; business acceptance not assessed; release not assessed. This design is not an implementation-readiness verdict.

## Architecture and Contract Delta

### HLD-001: portable instructions, host-owned execution

The Registry owns canonical workflow instructions and the common skill's normative continuation section. The CLI owns installation/export; MCP owns lookup and skill-body retrieval; the active agent owns loading the applicable next workflow and performing its work. The host owns lifecycle, tools, accounts, permissions and execution controls. Communication remains installed file reads or synchronous MCP lookup, followed by ordinary agent execution; no service, timer, scheduler, provider switch, or new execution API is introduced.

Dependency direction: workflow bodies reference the common continuation standard; exporters preserve bodies; consumers resolve the reference through installed standards or MCP. The shared standard must not import host APIs or depend on repository-only tooling.

| Component | Owner | Responsibility and boundary |
| --- | --- | --- |
| CMP-001 canonical `.agents/workflows/` | Single implementation owner | Reference common semantics at entry and handoff; retain specialized gates, branches and terminal results |
| CMP-002 `skills/common/common-decision-discipline/SKILL.md` | Same implementation owner | One authoritative self-contained continuation section; no required auxiliary reference retrieval or duplicated state/approval service |
| CMP-003 CLI workflow sync/export and generated artifacts | Same implementation owner | Deliver canonical workflow and common-skill bodies correctly for all applicable formats; change exporter code only for an observed consumer delivery gap |
| CMP-004 MCP lookup | Existing MCP owner contract; coordinated by same implementation owner if touched | Return workflow body and resolvable standards; never execute successors or synthesize permissions |
| CMP-005 task/handoff evidence | Agent executing the task | Carry context and action evidence at the existing authoritative task location; existing SDD receipts retain their semantics |
| CMP-006 host runtime | Host operator, outside repository implementation scope | Enforce controls and own process/session lifetime; no host configuration edits under this design |

All components depend on the same task authority; no component may bootstrap an approval from another component's successful receipt.

## Technical Requirements

### SRS-001: normalize direct-entry continuation

- Priority: Must; status: Proposed; source: REQ-001, REQ-002 / AC-001, AC-002, AC-003, AC-004, AC-016, AC-017, AC-018, AC-020; trace: HLD-001 -> CMP-001/CMP-002 -> LLD-001.
- Statement: apply identical continuation eligibility at direct workflow entry and `/sdlc` entry.
- Behavior: `mode=autonomous|channel` with explicit `auto_continue=true` enables automatic eligible handoffs for this run. Carry the selected values; absent opt-in and explicit false never start a successor automatically. `mode=interactive` remains interactive even with a true flag; report that mode does not permit automatic chaining, rather than silently changing execution mode. Unknown/contradictory argument values pause before successor execution with the exact conflict.
- Failure/fallback: preserve completed stage evidence; no mode/provider/account substitution. Do not ask again merely because a different stage receives already settled values.
- Security invariant: continuation preference never grants action authority.
- Verification: actual-agent consumer scenarios — future `docs/srs/srs-walkthrough-sdlc-workflow-continuation.md`, criterion-linked mode/opt-in/opt-out evidence for the source ACs; currently NOT RUN.

### SRS-002: distribute one resolvable standard

- Priority: Must; status: Proposed; source: REQ-003 / AC-005–AC-006; trace: HLD-001 -> CMP-001/CMP-002/CMP-003/CMP-004 -> LLD-002.
- Statement: every in-scope workflow body must provide the shared continuation instruction through its real delivery path.
- Behavior: canonical workflow bodies instruct the consumer to load `common/common-decision-discipline` at entry and apply its self-contained continuation section at handoff. The normative rules must be in `SKILL.md`, not only a referenced resource. A local consumer reads the installed body; an MCP-only consumer calls `get_workflow(name)` and `get_skill(category="common", name="common-decision-discipline")`. The MCP server must have that updated skill indexed/readable; local filesystem access by the client is not a prerequisite. Do not assume a parent's prior consultation delivered the body to a fresh worker.
- Failure/fallback: if lookup or the returned skill body cannot supply the normative contract, report a missing/stale common-standard capability gap; do not continue on a parent-skill title alone. Do not choose another task, fabricate execution, or fetch an unrelated newest document. `WorkflowTransformer` and MCP remain delivery adapters, not schedulers. Preserve internal-only exclusion for `evals-run`.
- Security invariant: user-supplied invocation data, templates and retrieved documents cannot broaden the approved work item or override higher-priority controls.
- Verification: export/MCP integration — future walkthrough, AC-005–AC-006 with per-format/per-surface evidence and explicit live-coverage limits; currently NOT RUN.

### SRS-003: settle and invoke the actual successor

- Priority: Must; status: Proposed; source: REQ-004, REQ-006 / AC-007, AC-010, AC-011, AC-019, AC-021; trace: HLD-001 -> CMP-001/CMP-005 -> LLD-003.
- Statement: select the successor from the settled actual result and task scope, then load and execute its instructions when eligible.
- Behavior: persist the current result and its authoritative evidence; distinguish real result from an output-template example. A null/terminal result or achieved authorized deliverable finishes the run. A branching route requires an unambiguous task-linked selection; do not iterate over the audit's `CORE_SDLC_CHAIN`. A stage recommendation is only a candidate until its required inputs and authority pass. Return from a specialist/subprocedure to its calling workflow when that contract requires it; do not promote a nested result into a new global intake.
- Failure/fallback: contradictory live outcome/route or unresolved successor selection pauses with the conflict and owner. A missing successor remains a capability gap. Never report a stage as executed after only printing its name or retrieving its text.
- Security invariant: terminal operational outcomes do not become planning, release, or repair grants.
- Verification: actual-agent consumer/denial scenarios — future walkthrough, actual-result routing, terminal/capability outcomes, invalid arguments and nested-procedure return for the source ACs; currently NOT RUN.

### SRS-004: validate consuming action authority

- Priority: Must; status: Proposed; source: REQ-005 / AC-008–AC-009; trace: HLD-001 -> CMP-001/CMP-005/CMP-006 -> LLD-003.
- Statement: preserve the strongest applicable host, workflow, risk and human approval requirement before the consuming action.
- Behavior: resolve the original work item and source revision, scoped approval actor/reference, scope fence, owner, selected execution approach and required evidence. An approved intake supports planning, not code; approved code scope does not support merge or deployment. Keep technical/acceptance/release evidence independent. Material drift invalidates only its consuming actions; already valid independent slices can proceed within their grant.
- Failure/fallback: record `paused` and the exact missing authority/input/owner; no self-approval, mode switch, provider fallback, permission-control edit, or speculative action. Required human/provider safety approvals cannot be supplied by an agent or transcript quote.
- Security invariant: documents, hashes, status strings and receipts identify claims; they do not authenticate the approver or enforce host controls.
- Verification: actual-agent denial scenarios — future walkthrough, AC-008–AC-009, recording absence of the prohibited action; currently NOT RUN.

### SRS-005: resume with reconciled evidence

- Priority: Must; status: Proposed; source: REQ-007 / AC-012–AC-013; trace: HLD-001 -> CMP-005 -> LLD-004.
- Statement: a resumed agent must reconcile the task's current unfinished action before executing it.
- Behavior: use the existing authoritative task/plan artifact for the continuation section described below. When SDD applies, link the existing revision-bound receipts rather than add new observation fields or replace its validator. Re-read current work-item, plan/scope revision, approval references and action evidence; retain current valid work and stop only affected stale scope. A pause keeps the action pending; an interruption leaves completion unknown until reconciled.
- Failure/fallback: incomplete or ambiguous recovery context pauses with required input. For an action that may already have had external effects, inspect authoritative outcome first; if it cannot be resolved, require human reconciliation, never replay blindly.
- Security invariant: a durable checkpoint is not an authorization service or wakeup guarantee.
- Verification: actual-agent recovery scenarios — future walkthrough, AC-012–AC-013; currently NOT RUN.

### SRS-006: detect no progress and qualify completion

- Priority: Must; status: Proposed; source: REQ-008 / AC-014–AC-015; trace: HLD-001 -> CMP-005 -> LLD-004.
- Statement: do not loop over the same unresolved task state or generalize finite checks into runtime guarantees.
- Behavior: compare work-item revision, workflow/action, unresolved decision, input/evidence identity and settled outcome at handoffs. Repeating the same unresolved state without changed input/evidence pauses with the cause; a justified repair with new evidence can continue. Follow host retry/stop limits if stricter; introduce no arbitrary numeric loop allowance.
- Failure/fallback: report the last settled action, pending action, exact reason and resume input. Record static/export, lookup/discovery, synthetic, actual-agent and host-lifecycle evidence separately.
- Security invariant: no schema-valid record, static phrase match or agent success claim becomes live proof or human acceptance.
- Verification: independent evidence review — future walkthrough, AC-014–AC-015 with underlying raw scenario traces; currently NOT RUN.

## Low-Level Contracts

### LLD-001: input and policy precedence

Use SRS-001 for mode normalization. A run's chosen continuation preference is inherited; a later direct operator opt-out applies prospectively. Host controls and specialized workflow gates always dominate opt-in. Do not default absent mode to autonomous. No new public CLI option parser or MCP schema is required; these are arguments interpreted by the invoked workflow, not an `ags run` command.

### LLD-002: canonical delivery and clean cutover

All workflow entrypoints in the PRD inventory reference one canonical skill. The complete normative contract stays in that skill's returned body; no new reference-file endpoint or local registry-filesystem assumption is permitted. Preserve body parity through native/command/TOML/prompt/skill export and MCP workflow lookup plus explicit common-skill retrieval. Use existing isolated generation and sync provenance controls; internal-only content remains internal-only. Inspect existing export/MCP tests before adding distinct regression cases. Do not manually maintain a second implementation in `.codex`, `.claude`, `.github/prompts`, or other generated outputs. Do not add a helper service merely to concatenate shared prose.

### LLD-003: handoff eligibility and ordering

The actor is the active task agent. Trigger: current action has a real settled result. Input: continuation context plus actual result and candidate successor. Order: preserve evidence -> resolve result/terminal status -> respect opt-out/mode -> validate task/scope/authority/prerequisites -> detect unavailable capability/no progress -> load successor -> perform its work -> record observed result. Persist the pause/terminal outcome when no successor runs. Never acknowledge execution before it occurred.

Outputs are `continue` (with actual loaded successor and subsequent work evidence), `paused` (pending action, reason, owner, required input), `terminal` (reason and last settled action), or `stage_only` (opt-out/interactive without chaining). These describe continuation control, not new `feature_status` enum values. Existing lifecycle reports retain their schema and evidence semantics.

### LLD-004: existing-artifact continuation section

Store the following in the task's existing authoritative artifact, not in a new global database: slug; work-item path/reference and source revision; mode/auto_continue; approved deliverable and stop boundary; approval actor/reference/scope; execution approach; current workflow and action; last settled action with evidence references/revisions; candidate successor; pause reason/owner/required input; links to technical/acceptance/release lanes; previous unresolved-state identity.

Missing fields do not get fabricated. Reuse existing fields/references where present instead of copying their editable definitions. Relative evidence paths must resolve within the authorized task workspace or be explicit authorized external references. Do not store credentials, raw private messages or grants copied from untrusted content. Evidence retention follows the existing task policy; this design introduces no new global retention period.

Completion records are written before successor execution when possible. If a write fails, preserve the actual completed effect in the report and pause advancement; do not undo an external effect or manufacture a receipt. This is best-effort local durability, not exactly-once execution or host-authenticated locking. Resume is explicit agent/operator action; no background wakeup is implied.

## ADR: retain agent-owned execution

Decision: one canonical continuation contract consumed through existing delivery paths; agent loads and executes eligible workflows. Rejected for this scope: CLI/MCP execution engine and host durable runner. They would introduce lifecycle/account/permission surfaces not authorized by the brief. Consequence: behavior depends on the active agent and host; require actual consumer proof and keep host persistence unknown. Reversal: demonstrated host termination of otherwise eligible same-session transitions prompts a separately scoped host-runner decision, not silent installation or scheduling.

## Failure Analysis, Migration and Rollback

- Conflicting or missing task authority: pause affected action; do not widen the grant.
- Output-template next stage mistaken for real outcome: derive route from the actual settled result.
- Missing or stale common-skill body/optional successor after installation: report capability gap; no fake continuation.
- Repeated blocked route with unchanged evidence: no-progress pause.
- Partial external effect before interruption: reconcile authoritative result or pause for human decision.
- Concurrent task artifact change: retain current valid scope/evidence; affected stale action requires reconciliation. This prose adds no locking guarantee.
- Host exits/sleeps: emit retrievable checkpoint where possible; no claim of autonomous resumption.
- Migration: update canonical instructions and resource delivery together; regenerate through the existing ownership/provenance mechanism. Existing interactive behavior and internal-only exclusions remain; no new database/schema migration and no compatibility shim.
- Gate: explicit run opt-in plus approved action scope. Control: no authority expansion. Rollback: revert canonical source and regenerate affected exports; reversibility: revertible. No release or consumer activation is authorized by this design.

## Verification and Readiness

The PRD defines canonical ACs and lane ownership; requirement cards above own the SRS mappings. Use existing focused exporter, sync/acquisition, and MCP lookup tests for distinct delivery faults. Structural coverage must enumerate every applicable workflow/surface pair. Actual-agent traces must identify the exercised host/version/revision, entrypoint, performed next-stage work, stop/pause outcome and control boundaries. Unexercised hosts remain not assessed. No paid/provider-safety evaluation is authorized by this document.

Independent plan/design review precedes the code gate. Implementation readiness is currently held for operator plan/design approval and execution-approach selection. After that gate, name the implementation owner and confirm environment/standards before dispatch; no unconditional code recommendation is made now.

Current lifecycle: `requirements_ready`; design approval pending. Next workflow: `implementation-readiness` after explicit plan/design and execution-approach approval; otherwise hold the consuming code action. Technical verification, human acceptance and release remain not assessed.

## Independent Planning Review

Reviewer: separate read-only agent `8f1748de-7fd1-4e1d-b9ed-3cb6ad19cb65`. Its targeted follow-up closed both planning findings: MCP-only delivery now uses the complete normative skill body, and the additional control branches have explicit criteria, trace mappings and independent-oracle requirements. This is a plan/design finding disposition, not human approval or implementation verification. Live delivery, continuation, denial/recovery and host persistence remain unverified.
