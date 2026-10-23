# PRD: Provider-Neutral Delegation

slug: provider-neutral-delegation
status: draft_for_design
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
brief_approval: approved(requesting_operator, 2026-10-23)
implementation_approval: not_granted
activation_status: not_required

## Purpose and approved baseline

Source: [approved direction brief](../brd/brd-provider-neutral-delegation.md), including its Value and Measurement Contract. Evidence: [review](../../artifacts/subagent-optimization-review.md), F1–F10. The brief's goal is the objective reference for every requirement below; no new business scope is introduced.

Problem: fresh workers can receive incomplete standards or task constraints; canonical execution rules conflict with host policy; format exports are mistaken for runtime parity; current evidence does not establish accepted-task economics.

Outcome: workers receive the minimum complete authorized contract, hosts disclose their actual capabilities, and maintainers can evaluate delegation by full-task outcomes rather than worker count or parent tokens.

Accountability: repository maintainer owns product scope and release acceptance; engineering lead owns technical design; independent QA/reviewer owns validation. These are role assignments for planning, not invented named-person commitments. Assign eligible implementation owners before dispatch.

## Goals and guardrails

Primary metric: full-task cost per accepted result on matched repeated task-class trials. Establish baseline before numerical savings targets. Report acceptance, false positives, retries, latency and usage coverage separately. Unknown usage prevents monetary savings claims, not all useful correctness reporting.

Guardrails: no loss of applicable global constraints; no approval or account-boundary bypass; no self-supplied human approval; no false native-capability or enforcement claim; immutable retrievable acceptance evidence; existing required independent reviews remain required.

No fabricated latency SLA, billing rate or target saving. Prompt length is a diagnostic measure, not the acceptance criterion.

## Actors and use cases

- **Repository maintainer:** publishes consistent canonical standards and decides promotion/rollback; cannot treat publication as host activation.
- **Orchestrator:** prepares a bounded assignment and selects only eligible supported execution; cannot invent unavailable permissions or approve premium spend.
- **Worker:** executes its assignment, consults applicable standards and returns a receipt; cannot widen authority, recursively delegate, or approve its own work.
- **Independent reviewer:** checks contract/evidence and findings; cannot supply required human approval.
- **Host integrator:** demonstrates native invocation, permission and telemetry behavior for a specific host surface/version; file export alone is not that demonstration.
- **Evaluation owner:** compares accepted outcomes and complete usage; cannot omit failed attempts from task economics.

Developer-tool channels: CLI, IDE and supported hosted agent surfaces. Mobile application behavior, market variants and feature toggles are not in scope. ACs below describe host behavior rather than inventing WEB/MOBILE product parity.

## Scope inventory

All leaves are in_scope and map to the requirement with the same number:

1. Deliver worker standards -> REQ-001.
2. Preserve assignment constraints -> REQ-002.
3. Bind host operations -> REQ-003.
4. Govern recovery/escalation -> REQ-004.
5. Verify native support -> REQ-005.
6. Bound work and preserve review/evidence -> REQ-006.
7. Measure task economics -> REQ-007.
8. Discover installed workflows -> REQ-008.
9. Publish consistent canonical exports -> REQ-009.
10. Minimize worker bootstrap/routing -> REQ-010.
Excluded: new orchestration service; private profile names/model IDs in shared policy; broad skill rewrites; altering host approval controls; production actions; automatic release/merge; cross-account fallback; arbitrary web/mobile functionality.
No approved capability is deferred. Paid or account-specific native runs are authorization-gated acceptance work, not silently removed scope.

## Requirement registry

All statuses are proposed elaborations of the approved direction; no implementation is marked complete. Every requirement retains its source brief trace.

| ID | Required outcome | Priority | Accountable engineering owner | Evidence finding | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Required content reaches the requesting worker context at the applicable revision | P0 | MCP delivery owner | F1 | BRD-OBJ-001 |
| REQ-002 | Standalone packets preserve applicable authority, invariants and acceptance | P0 | Packet/helper owner | F2 | BRD-OBJ-001 |
| REQ-003 | Canonical operations bind to explicitly supported host capabilities | P0 | Host-contract owner | F4, F5 | BRD-OBJ-001 |
| REQ-004 | Recovery follows authorized failure-specific routes | P0 | Delegation-policy owner | F3 | BRD-OBJ-001 |
| REQ-005 | Native support and enforcement claims have host-specific evidence | P1 | Provider-export owner | F4 | BRD-OBJ-001 |
| REQ-006 | Coherent work, independent acceptance and durable evidence survive lifecycle changes | P0 | Delegation-policy owner | F6, F7 | BRD-OBJ-001 |
| REQ-007 | Outcome/cost evidence covers every actor and attempt | P1 | Telemetry/evaluation owner | F8 | BRD-OBJ-001 |
| REQ-008 | MCP discovery and native invocation share the installed workflow catalog | P1 | Workflow-install owner | F9 | BRD-OBJ-001 |
| REQ-009 | Canonical changes produce consistent exports and revision-bound rollback evidence | P1 | Integration/release owner | F7 and all fixes | BRD-OBJ-001 |
| REQ-010 | Workers consult applicable standards without repeating global intake | P1 | Worker-bootstrap/routing owner | F10 | BRD-OBJ-001 |

## User stories and atomic acceptance

The brief's AC-001–AC-010 remain parent acceptance groups. Each atomic scenario has a unique canonical ID; its original group-relative scenario key is retained in parentheses. Mapping:

| Parent group | Atomic criteria |
| --- | --- |
| AC-001 | AC-101–AC-104 |
| AC-002 | AC-105–AC-108 |
| AC-003 | AC-109–AC-111 |
| AC-004 | AC-112–AC-115 |
| AC-005 | AC-116–AC-118 |
| AC-006 | AC-119–AC-124 |
| AC-007 | AC-125–AC-128 |
| AC-008 | AC-129–AC-130 |
| AC-009 | AC-131–AC-133 |
| AC-010 | AC-134–AC-136 |

Each scenario's Then is one observable result. Status: proposed; validation owner for all groups is the independent QA/reviewer.
Archived assignment, receipt and evidence artifacts preserve the original reviewed short IDs as historical records; this live-document mapping does not rename or rewrite them.

### REQ-001 / BRD-OBJ-001 / AC-001 — Deliver standards

As a fresh worker, I want complete applicable standards so that another actor's history cannot remove my instructions.
- **AC ID**: AC-001 (parent group for REQ-001)
- **AC ID**: AC-101 (group 1, scenario a) — Given a parent already received a skill, when a fresh child requests that skill, then the child receives its required body.
- **AC ID**: AC-102 (group 1, scenario b) — Given a sibling received a skill, when another sibling requests it, then the second sibling receives its required body.
- **AC ID**: AC-103 (group 1, scenario c) — Given prior delivery of revision A, when revision B is required, then revision A cannot satisfy delivery of revision B.
- **AC ID**: AC-104 (group 1, scenario d) — Given no trustworthy context identity, when required standards are requested, then another context's load history cannot suppress the body.

### REQ-002 / BRD-OBJ-001 / AC-002 — Preserve assignment

As an orchestrator, I want a standalone bounded packet so that fresh workers need not infer plan-level rules.
- **AC ID**: AC-002 (parent group for REQ-002)
- **AC ID**: AC-105 (group 2, scenario a) — Given a task governed by plan-level authority and invariants, when its packet is prepared, then those applicable constraints are present in the standalone packet.
- **AC ID**: AC-106 (group 2, scenario b) — Given a task with declared dependency output, when its packet is prepared, then that dependency evidence is accessible by the assigned worker.
- **AC ID**: AC-107 (group 2, scenario c) — Given missing required ownership, AC or verification information, when preparation is attempted, then dispatch is withheld with the exact missing prerequisite.
- **AC ID**: AC-108 (group 2, scenario d) — Given unrelated plan tasks, when one packet is prepared, then unrelated task bodies are excluded.

### REQ-003 / BRD-OBJ-001 / AC-003 — Bind host operations

As a host integrator, I want semantic operation requirements so that one workflow can run through different native mechanisms.
- **AC ID**: AC-003 (parent group for REQ-003)
- **AC ID**: AC-109 (group 3, scenario a) — Given the same semantic assignment on two capable hosts, when each binding executes it, then each returns a receipt satisfying the same acceptance contract.
- **AC ID**: AC-110 (group 3, scenario b) — Given an unavailable required lifecycle or permission capability, when delegation is prepared, then the affected operation is reported unsupported instead of claimed successful.
- **AC ID**: AC-111 (group 3, scenario c) — Given an ineligible provider/account/profile, when execution selection is evaluated, then no task context is sent to that route.

### REQ-004 / BRD-OBJ-001 / AC-004 — Govern recovery

As a maintainer, I want distinct recovery routes so that failures cannot silently authorize spend or exposure.
- **AC ID**: AC-004 (parent group for REQ-004)
- **AC ID**: AC-112 (group 4, scenario a) — Given only a retry count, when a premium route is considered, then it remains unauthorized.
- **AC ID**: AC-113 (group 4, scenario b) — Given a missing prerequisite rather than exhaustion, when recovery is evaluated, then provider-exhaustion fallback is not selected for that failure.
- **AC ID**: AC-114 (group 4, scenario c) — Given an observed exhaustion event and an eligible authorized fallback, when recovery occurs, then its receipt identifies the exhaustion evidence and selected authorized route.
- **AC ID**: AC-115 (group 4, scenario d) — Given defective output, when a corrective attempt is assigned, then its brief identifies the concrete failed acceptance criterion rather than restarting unrelated intake.

### REQ-005 / BRD-OBJ-001 / AC-005 — Verify native support

As a maintainer, I want versioned support evidence so that serialized configuration is not mistaken for a working subagent.
- **AC ID**: AC-005 (parent group for REQ-005)
- **AC ID**: AC-116 (group 5, scenario a) — Given a claimed supported host surface/version, when its conformance scenario runs, then native discovery and bounded worker invocation are evidenced.
- **AC ID**: AC-117 (group 5, scenario b) — Given a required tool/filesystem/network restriction, when a prohibited operation is attempted in a safe synthetic scenario, then the claimed enforcement result is observed or the claim is marked unsupported.
- **AC ID**: AC-118 (group 5, scenario c) — Given a surface without verified native nesting, when its support is reported, then it is not labeled equivalent to a nested-worker surface.

### REQ-006 / BRD-OBJ-001 / AC-006 — Bound lifecycle and acceptance

As an orchestrator, I want coherent task boundaries and durable receipts so that execution can resume without losing independent acceptance.
- **AC ID**: AC-006 (parent group for REQ-006)
- **AC ID**: AC-119 (group 6, scenario a) — Given a bounded fix to the same assignment, when that worker resumes, then its existing authority and task boundary remain unchanged.
- **AC ID**: AC-120 (group 6, scenario b) — Given dependency-ready disjoint assignments, when concurrency is authorized, then each has one nonoverlapping implementation owner.
- **AC ID**: AC-121 (group 6, scenario c) — Given a required independent review, when task acceptance is evaluated, then the implementer's own verdict cannot satisfy that review.
- **AC ID**: AC-122 (group 6, scenario d) — Given workspace cleanup, when cleanup completes, then required handoff evidence remains retrievable.
- **AC ID**: AC-123 (group 6, scenario e) — Given an explicit permitted inline exception, when the execution path is recorded, then it is not simultaneously prohibited by another canonical rule.
- **AC ID**: AC-124 (group 6, scenario f) — Given cancellation or timeout, when lifecycle status is reported, then the assignment is not represented as completed/verified solely because it stopped running.

### REQ-007 / BRD-OBJ-001 / AC-007 — Measure task economics

As an evaluation owner, I want complete-task comparisons so that local token reductions cannot masquerade as savings.
- **AC ID**: AC-007 (parent group for REQ-007)
- **AC ID**: AC-125 (group 7, scenario a) — Given a task with parent, workers, review and failed attempts, when usage is aggregated, then every expected actor/attempt is covered or explicitly listed missing.
- **AC ID**: AC-126 (group 7, scenario b) — Given incomplete usage/rates, when the report is rendered, then a monetary savings claim is withheld.
- **AC ID**: AC-127 (group 7, scenario c) — Given matched repeated baseline/current/proposed trials, when results are compared, then failed and cancelled attempts remain in task-cost accounting.
- **AC ID**: AC-128 (group 7, scenario d) — Given provider token fields with overlapping reasoning/output semantics, when cost is calculated, then the same billed usage is not counted twice.

### REQ-008 / BRD-OBJ-001 / AC-008 — Discover workflows

As an operator using a provider-only installation, I want required workflow lookup to find what native invocation uses.
- **AC ID**: AC-008 (parent group for REQ-008)
- **AC ID**: AC-129 (group 8, scenario a) — Given an installed provider workflow, when MCP catalog lookup is requested, then it resolves the same canonical workflow revision as native invocation.
- **AC ID**: AC-130 (group 8, scenario b) — Given the workflow is not installed, when it is requested, then lookup reports it unavailable rather than fabricating an executable workflow.

### REQ-009 / BRD-OBJ-001 / AC-009 — Publish consistent exports

As a registry maintainer, I want reproducible publication so that fixes do not diverge across mirrors.
- **AC ID**: AC-009 (parent group for REQ-009)
- **AC ID**: AC-131 (group 9, scenario a) — Given a canonical source change, when existing regeneration/alignment tooling runs, then the resulting exports match the approved source revision.
- **AC ID**: AC-132 (group 9, scenario b) — Given a promoted candidate that fails a guardrail, when rollback is selected by the owner, then its previous approved registry revision and affected activation state are identifiable.
- **AC ID**: AC-133 (group 9, scenario c) — Given repository publication approval only, when release status is reported, then host activation is not claimed authorized.

### REQ-010 / BRD-OBJ-001 / AC-010 — Minimize bootstrap

As an assigned worker, I want exact applicable standards so that bootstrap does not consume work on unrelated global intake.
- **AC ID**: AC-010 (parent group for REQ-010)
- **AC ID**: AC-134 (group 10, scenario a) — Given a valid assigned packet, when worker bootstrap executes, then it does not repeat parent global workflow discovery/intake.
- **AC ID**: AC-135 (group 10, scenario b) — Given a held-out worker-routing case, when standards are selected, then required standards are returned without the case's identified irrelevant keyword/composite matches.
- **AC ID**: AC-136 (group 10, scenario c) — Given bootstrap optimization, when required body delivery is checked, then the worker still receives applicable authoritative standards.

INVEST review: stories have distinct actors/value and testable outcomes; shared contracts are explicit dependencies rather than claimed independent implementations. REQ-005 and REQ-007 execution remain conditional on account/budget/runtime access, not on weakening their acceptance.

## Shared rules and truth table

Authority/data eligibility always precede dispatch. Required controls always precede execution. Missing usage is unknown, never zero. Profile/model tiers are capability hints, not authorization. Human approval remains external to agent verdicts.

| Eligible route | Required control available | Separately gated approval | Observable decision |
| --- | --- | --- | --- |
| No/unknown | Any | Any | No dispatch to that route |
| Yes | No/unknown | Any | Report affected operation unsupported; do not claim control |
| Yes | Yes | Required but absent | Pause the gated action |
| Yes | Yes | Present/not required | May execute within assigned scope |

An alternative inline/manual path is allowed only if the applicable host policy explicitly permits it; absence of nesting does not automatically grant an exception.

## Non-functional constraints and evidence

- Preserve safety, applicable data/account separation, source provenance and required independence; use synthetic fixtures for negative permission scenarios.
- No global latency/token target without baseline. Record payload size, bootstrap calls and wall time as diagnostics.
- File references must be accessible from the assigned worker's actual environment; remote/isolated contexts cannot assume a shared filesystem.
- Record selected host/surface/version, task/parent/actor/revision identities, required capability evidence, status, verification references, usage coverage and obstacles without logging secrets or cross-client context.
- Extend existing journals/exporters. No new service, database migration or API promise is approved by this PRD. Technical schema/API decisions belong to design.

## Ownership / RACI

| Activity | Accountable | Responsible | Consulted / informed |
| --- | --- | --- | --- |
| Product scope and acceptance | Repository maintainer | PM/BA planning role | Engineering, independent QA |
| Trust/context and technical contracts | Engineering lead | MCP/host-contract owners | Security/architecture reviewer, maintainer |
| Packet/policy/export work | Engineering lead | One bounded owner per task | Independent reviewer |
| Outcome/cost verification | Validation owner (independent QA) | Telemetry/evaluation owner | Maintainer, host integrator |
| Release and activation decisions | Repository maintainer | Release owner | Human acceptance owner, engineering |

Backend responsibilities map to MCP/CLI owners. Frontend/mobile roles are not applicable; no UI delivery is included. The requesting operator retains direction approval; required later human approvals are not supplied by agents.

## Risks, decisions and rollout

Accepted decisions: preserve architecture; separate semantic requirements from host binding; retain premium/account controls; measure accepted-task economics; no wholesale rewrite.

Owned design decisions: trustworthy context/delivery identity (MCP delivery owner); packet completeness/schema and revision semantics (packet owner); supported operation/version matrix and artifact transport (host-contract owner); canonical installed workflow catalog (workflow-install owner); provider usage normalization and conformance evidence (telemetry/export owners). These block their implementation slices until design is reviewed, not this requirements elaboration.

Value risk: delegation may be faster but costlier; measure task-class tradeoffs. Feasibility risk: host permissions/telemetry differ; disclose unavailable controls. Usability risk: more bootstrap gates can add overhead; use focused worker bootstrap. Viability risk: provider drift and paid trials; version support evidence and gate spend.

Rollout: repository-local conformance and deterministic behavior first, authorized host smoke next, authorized repeated canary comparisons last. No activation, paid trials or releases are scheduled by this plan. A supported-provider claim needs its runtime evidence; otherwise report not_verified. Promotion preserves all required behavior/approval controls and records measured tradeoffs and rollback version.

## Trace, change log and handoff

Implementation slices and verification lanes: [delivery plan](../plans/provider-neutral-delegation.md). Technical design is required before coding because delivery identity, authority and host-control boundaries change. No SRS is claimed complete.

2026-10-23: elaborated approved REQ-001–REQ-010 and AC groups into atomic scenarios without changing approved scope. BRD approval is recorded; this PRD and delivery plan remain drafts for technical design, not implementation authorization.

feature_status: requirements_ready
completed_evidence: approved direction; source review; observed MCP omission; standalone brief smoke
missing_evidence: technical design decisions; native conformance; full-task trials
recommended_next_workflow: design-solution
cost: unavailable (host usage/pricing not supplied)
