# Feature Plan: Agent Harness Assurance Baseline

Status: approved delivery plan; owner: requesting operator
slug: agent-harness-improvement
operator_profile: technical; lane: direction; snc_tier: high; model_tier: strong; delivery_mode: extended
source_approval: approved(requesting operator, 2026-11-06)
plan_approval: approved(requesting operator, 2026-11-06)
execution_approach: not_selected
repository_status: planning_artifacts_only; activation_status: not_required

## Decision Brief

- **Changes since approved brief:** Decompose only the assurance-baseline first slice into bounded work packages and verification ownership. Preserve BRD-HAR-01, REQ-HAR-01 and AC-HAR-01–06. No authorization engine, profile changes, instruction rewrite, cache, or optimization experiment is added.
- **Recommendation:** Qualify the installed integration using existing capability records, conformance evidence, assignment/acceptance receipts and task economics. Produce a retained baseline and gap disposition, not a new runtime or monitoring store.
- **Impact if wrong:** A source-only or synthetic pass could become a false security guarantee; incomplete usage could become a false savings claim. Promotion rules and independent verification below prohibit both.
- **Evidence:** Reuse the approved [BRD and evidence ledger](../brd/brd-agent-harness-improvement.md), source snapshot approval state `57F6`, and its recorded versions/observations. The snapshot tag identifies the planning input in this conversation, not a durable commit identity. Capture source digests at execution. No fresh runtime, account, or model-efficacy claim is made by this plan.
- **Unresolved technical decisions:** Evidence placement/representation for Paseo+OMP, actual cross-route approval controls, safe denial probe interfaces, and native/Paseo actor correlation require `design-solution`. Owners and affected packages are recorded below; unknown support can remain unknown without inventing a control.
- **Approval recorded:** Requesting operator approved this delivery plan and progression to technical design with “ok” on 2026-11-06. This does not authorize implementation, dependency installation, live dispatch/probes, paid evaluations, premium calls, policy activation, publication, or deployment.
- **Independently ready work:** Packages A/B can be prepared from retained/public/read-only evidence after the appropriate execution approach is selected. Live portions of C/D require design, readiness, and scoped runtime authority. Package E can review available evidence but cannot declare missing C/D proof complete.

## Outcome And Guardrails

**Objective:** BRD-HAR-01. Establish what the harness guarantees, by which owner and revision, before committing to fixes or economic optimization.

**SMART metric carried forward:** Within 14 calendar days of separately authorized execution, classify all seven capability areas and the listed dispatch surfaces, retain evidence for every promoted support claim, and provide one assignment/acceptance/accounting walkthrough. The window starts only with execution authorization; it is not a delivery commitment made by this plan.

**Value hypothesis retained:** Operator overhead may justify later optimization. The proposed future 10% handling-time threshold is an unvalidated decision target, not a baseline result or acceptance condition for this assurance slice. Before C/D empirical execution, `validate-product` must establish authority, eligible data, finite exposure/budget/duration and a measurement contract, as required by the approved BRD. Later comparative ROI experimentation requires its own scoped validation decision; read-only drafting/design is unblocked.

**Guardrails:** No real premium invocation; no account/credential access or cross-client context; no protected external action; no policy weakening or bypass testing on shared resources; no hidden installs or generated-host edits. Support evidence must be route-, version-, operation- and control-specific. Worktrees are not sandboxes. Unknown cost is not zero. Worker completion is not independent acceptance. No numerical performance/financial improvement is claimed.

## Scope And Non-Goals

### In Scope

Containment tree; each leaf has one owning package and maps to the canonical REQ/AC tables:

- Establish assurance baseline — REQ-HAR-01.
  - Classify capabilities — in_scope, A, AC-HAR-01.
  - Map dispatch boundaries — in_scope, B, AC-HAR-02.
  - Qualify enforcement claims — in_scope, C, AC-HAR-03.
  - Trace lifecycle acceptance — in_scope, D, AC-HAR-04.
  - Reconcile task economics — in_scope, D, AC-HAR-05.
  - Disposition investment gaps — in_scope, E, AC-HAR-06.

Capabilities covered by A: intent/assignment, model/account authorization, context/memory, tools, recovery, verification and economics. Runtime owners contribute evidence to a single integration owner; they do not co-edit the baseline.

Dispatch surfaces covered by B: Paseo create_agent; model/settings update; CLI launch; schedule; heartbeat; OMP-native worker dispatch. A schedule that starts an agent and a heartbeat that prompts an existing agent are distinct paths. Do not assume either inherits a create-agent control. Account identity is metadata supplied by the operator/runtime, never inferred from model family or credentials.

### Out Of Scope

Changing authorization policy, implementing any missing grant service, new database/telemetry store, moving memory backends, migrating runtimes, changing model profiles, fixing all skill/eval readiness, dependency upgrades, production deployment, semantic result caching, or proving general model efficacy. No Web/Mobile UI, market variant or feature-toggle behavior is requested; this is a host/CLI/MCP assurance deliverable, not a UI user story.

### Deferred

Authorization fixes, instruction hygiene, durable-handoff improvements, placement/model/cache tuning and ROI experiments remain the candidate backlog in the approved BRD. Their inclusion there is not delivery authority. A failed baseline scenario creates a gap disposition, not automatic implementation scope.

## Requirements And Acceptance Criteria

This table is the delivery-level definition. The BRD retains the historical approved scope; its criteria are not edited or renumbered.

**Run-record serialization:** The existing Outcome RunRecord v1 validator accepts only numeric trace identifiers (`scripts/outcome/schema.ts:105–110`). The alias columns below provide one-to-one serialization names, not new requirements or replacement IDs. Human handoffs keep HAR IDs; machine traces use these aliases and link this PRD. BRD-HAR-01 maps to BRD-OBJ-001 solely for serialization. No validator change or second editable requirements database is proposed.

| Req ID | Serialization alias | Requirement | Product / engineering / verification owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-HAR-01 | REQ-001 | Deliver a revision-bound, evidence-qualified baseline of the current Paseo/OMP/standards integration and a justified gap/no-change/defer recommendation without introducing a replacement runtime. | Requesting operator / baseline integration owner / independent QA verifier | P0 | Proposed delivery detail under approved BRD scope | BRD-HAR-01 |

Each AC has one acceptance owner and one verification lane. Packages reference IDs rather than redefining criteria.

| AC ID | Serialization alias | Req ID | Given | When | Then | Acceptance owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-HAR-01 | AC-001 | REQ-HAR-01 | The seven capability areas and an identified installed/source snapshot | The integration owner publishes the baseline | Every area has an owner, actual entrypoint, version/revision or explicit missing identity, controlling configuration evidence or an explicit missing/unavailable configuration-evidence limitation, evidence references and a qualified support state; absent evidence is not reported as unsupported capability. | Independent QA verifier | Manual version-bound evidence review |
| AC-HAR-02 | AC-002 | REQ-HAR-01 | The six dispatch surfaces in the scope inventory | The runtime evidence owners map their control paths | Each surface names its enforcement owner, trusted authority source, existing control/entrypoint reused or an explicit finding that no applicable control has been established, and known evidence/unknowns; a guarantee from one surface is not transferred to another without matching proof. | Independent QA verifier | Manual cross-entrypoint boundary review |
| AC-HAR-03 | AC-003 | REQ-HAR-01 | A proposed enforcement claim, its stated controls and separately authorized safe probe environment | The runtime verifier evaluates allow/deny evidence | The claim is promoted only with retained actual-boundary allow and denial evidence for the stated controls, including absent/expired approval and wrong project/account where those controls are claimed; missing, synthetic, stale or unavailable evidence leaves the claim unverified rather than passed. | Independent runtime/security verifier | Isolated host conformance scenario |
| AC-HAR-04 | AC-004 | REQ-HAR-01 | One authorized non-sensitive task, bounded run limits and an independent reviewer | The verifier follows assignment, execution and acceptance and examines stopped/recovered states | A correlated receipt shows assignment through notification and independently accepted result; cancellation/timeout is never completion, and recovered state identifies persisted evidence and required revalidation. | Independent QA verifier | Bounded cross-runtime lifecycle scenario |
| AC-HAR-05 | AC-005 | REQ-HAR-01 | The AC-HAR-04 task, declared expected actors and retained attempt inventory | The verifier reconciles task accounting | Parent, workers, review, repairs, failures and cancelled attempts are either accounted for or explicitly missing; token categories, API money, subscription quota, cache activity and elapsed time stay distinct, with unknown rates/usage preserved and no unsupported savings claim. | Independent economics verifier | Task-cohort accounting reconciliation |
| AC-HAR-06 | AC-006 | REQ-HAR-01 | The baseline and all available scenario outcomes, including unresolved prerequisites | The integration owner submits the investment disposition | Every observed issue has a reuse/fix-candidate/no-change/defer disposition with evidence, owner and consequence; inconclusive evidence cannot justify a full build, and missing live walkthrough evidence prevents full-slice completion. | Requesting operator | Human disposition review |

The QA/economics roles may be held by one verifier if independent of package implementation. Human acceptance at AC-HAR-06 cannot be supplied by an agent. Scope coverage and readiness may be partial; an unverified capability is a valid finding, whereas an unexecuted required lifecycle walkthrough is unfinished delivery.

## Evidence And Authority Decision Rules

The claim vocabulary reuses existing qualification semantics rather than inventing a separate trust scale:

| Evidence condition | Disposition |
| --- | --- |
| Source/docs/serialized artifact only | Record implementation or declaration evidence; runtime support remains not_verified. |
| Supported entrypoint discovers the artifact, but no actual execution | Record discovery evidence, not control enforcement. |
| Retained live evidence matches host, surface, operation, version, revision and all claimed controls | Eligible for supported status under existing qualification rules, subject to independent verification. |
| Required denial is missing, fixture-only, failed, or mismatched | No supported promotion; preserve actual outcome and gap. |
| Host lacks the claimed operation and this is established by authoritative capability evidence | Record unsupported with scope/reason, not a search-miss inference. |
| Installed runtime or controlling configuration changes | Revalidate affected claims before presenting them as current; retain historical evidence rather than overwrite it. |
| Authority or safe environment is missing | Do not execute that probe. Record its owner/prerequisite and keep unrelated read-only work moving. |
| A control fails | Stop that scenario before a prohibited effect; retain the failure and propose an independently scoped fix, never weaken the oracle. |

### Actor / Permission Matrix

| Actor | Allowed responsibility | Not granted by this plan |
| --- | --- | --- |
| Requesting operator | Approve planning; later select explicit execution scope, limits and human acceptance | Implicit spend/exposure approval from a plan status or JSON name |
| Product/planning owner | Maintain canonical REQ/AC and scope; resolve business interpretation against approved BRD | Redefine a failed control as successful |
| Runtime evidence owner | Inspect supported public/read-only surfaces; prepare isolated probes after authority is established | Launch premium/wrong-account workloads or change host approval controls |
| Baseline integration owner | Integrate disjoint artifacts, link source identities and gap dispositions | Coerce unknown pricing to zero or certify own acceptance |
| Independent QA/security/economics verifier | Review evidence and run only separately authorized scenarios | Authenticate a human grant from agent-authored metadata or accept the product on behalf of the operator |

## Open Consequential Decisions And Owned Prerequisites

No further product interview is needed to draft this plan. These are execution/design prerequisites, not requests for information the repository can supply.

| Item | Owner | Affected package | Required input and boundary |
| --- | --- | --- | --- |
| Execution approach | Requesting operator | Implementation/verification execution | Delivery plan and technical-design progression approved on 2026-11-06. Subagent-driven execution or an eligible explicit inline exception remains unselected; approval of this plan does not select an approach. |
| Evidence representation and Paseo/OMP surface mapping | Technical design owner | A/B integration and C qualification | Locate supported existing capability/qualification surfaces and choose how evidence binds to these runtimes. Current native capability matrix does not by itself prove Paseo/OMP coverage. Do not add a new runtime/ledger to force compatibility. |
| Authentic authority and safe denial interface | Runtime/security design owner | C live probes | Identify who issues/verifies grants and a harmless probe boundary that can demonstrate rejection before a paid/protected action. No real premium dispatch or attempted cross-client access. If unavailable, leave that claim unverified. |
| Correlation and complete actor inventory | Runtime/economics design owner | D lifecycle/accounting | Supported task/parent/attempt/session IDs and usage export; unknown fields stay explicit. No raw-session extraction or credential inspection without separate authorization. |
| Executable local tooling | Verification owner | Source-backed checks, C/D | Resolve an already authorized runner/dependencies before execution. Prior source CLI smoke lacked tsx; this plan does not authorize installing it. |
| Live scenario authority and bounds | Requesting operator with runtime verifier | C/D | Before empirical execution, `validate-product` establishes authority, eligible data, finite exposure/budget/duration and the measurement contract; runtime authorization also names workspace, permitted tools/models, request limits and stop conditions. Neither validation eligibility nor prose authority alone permits launch. |

## Implementation Plan And Task Slices

These are work packages inside the single approved assurance slice, not the deferred improvement program. No implementation file is changed by this planning workflow.

| Package | One owner / repository boundary | References | Expected artifact | Dependencies | Estimate / confidence | Per-package routing |
| --- | --- | --- | --- | --- | --- | --- |
| A — Classify capability evidence | Standards evidence owner; read existing ARCHITECTURE, capability/qualification and receipt owners; own capability-baseline artifact only | REQ-HAR-01; AC-HAR-01 | Version-bound capability inventory with current/unknown support and source links | Design contract and selected execution approach | S / high for inventory | S=1 N=0 C=1 total=2, low; eligible fast or standard analysis based on evidence ambiguity |
| B — Map runtime dispatch boundaries | Runtime evidence owner; read supported Paseo/OMP source/adapters; own dispatch-boundary artifact only | REQ-HAR-01; AC-HAR-02 | Six-surface ownership/authority map with exact revisions and testable claims | Design contract and selected execution approach; independent of A | M / medium | S=2 N=1 C=2 total=5, high; eligible strong analysis, no automatic premium |
| C — Qualify enforcement evidence | Runtime conformance owner; isolated probe artifacts, no shared host-policy edits | REQ-HAR-01; AC-HAR-03 | Retained allow/deny observations or explicit unverified gaps, with commands, identities, expected/actual results and stop reasons | A+B relevant evidence, reviewed technical design, readiness, pre-execution validate-product gate and live authority where needed | M / low until probe boundary is resolved | S=2 N=1 C=2 total=5, high; strong eligible runtime/security verification |
| D — Trace lifecycle and economics | Task walkthrough owner; one bounded task plus correlated existing receipts/usage; no new telemetry store | REQ-HAR-01; AC-HAR-04/05 | Independently reviewed task trace and actor-accounting report | A+B relevant evidence, design/readiness, pre-execution validate-product gate and separately scoped task authority; independent of C where no C-controlled prerequisite is needed | M / medium for receipts, low for complete native usage | S=2 N=1 C=2 total=5, high; standard/strong eligible execution and independent verification sized to actual action risk |
| E — Integrate and disposition | Baseline integration owner owns aggregate baseline/cross-links; independent verifier reviews A–D; operator accepts | REQ-HAR-01; AC-HAR-06 | One coherent baseline, partial/full criterion outcomes and reuse/fix/no-change/defer recommendation | A/B; completion waits for required C/D evidence or reports affected incompleteness | S / medium | S=1 N=1 C=1 total=3, medium; eligible standard integration plus independent review |

**Scheduling:** after the shared design contract, A and B may run concurrently. Once their relevant interfaces/prerequisites exist, C and D may run concurrently only with disjoint task resources and no hidden dependency. Integration owns shared files; workers submit bounded evidence, not concurrent edits to the same baseline. A separate verifier—not the implementation owner—checks each final acceptance result. Actual commercial profiles/model/effort are resolved at dispatch under the host policy; routing hints do not grant an account or authorize premium calls.

**Expected placement:** retain baseline evidence alongside the existing repository qualification/validation artifacts using the design-selected convention. A/B/C/D own distinct evidence files; E owns the aggregate narrative. Exact artifact paths and schema reuse are a technical design decision, not an invitation to build a second schema engine. A future runner or source change requires a separately approved implementation boundary.

### Verification Execution Shape

- Reuse the discovery's commands and version observations rather than repeat them as a substitute for new evidence. Capture a fresh version/config identity only when needed to bind a new scenario.
- Candidate source-backed qualification entrypoint: `rtk pnpm harness:smoke --qualification-only --claim <recorded-claim-path>`. It is eligible only for host/surface claims already supported by that qualifier. The technical design must resolve Paseo/OMP representation first; do not pass fabricated host IDs or fixtures as live support.
- Candidate assignment helper: the existing `task_brief.py` workflow and receipt reconciliation interfaces from the approved BRD. The design records exact invocation after identifying real plan/assignment/resource prerequisites; successful packet validation alone is not runtime acceptance.
- For the bounded lifecycle scenario, choose a deterministic non-sensitive repository task with an observable result independent of the worker's self-report. Declare actor inventory and limits before launch. Retain notification, reviewer result, task/attempt identity and recovery observations. Never generate paid failures solely to populate accounting categories; absent categories remain declared not-observed, while any actual attempts are included.
- Probe stop/cancel/restore only on agent-owned resources with explicit authority. A fixture may exercise record semantics but cannot prove actual host cancellation or model denial. Report both evidence levels separately.
- Use task-specific focused checks for any later code change; no code change is currently approved. Do not add permanent source-string tests for this PRD. Broad suites and paid model runs are not substitutes for the actual boundary scenarios.

## Technical Design Handoff

Next workflow is `design-solution`, not implementation. Its bounded questions are:

1. How can existing qualification/receipt mechanisms represent this installed Paseo/OMP integration without mislabelling another host's support? Record exact version/revision ownership and retained artifact integrity.
2. At which supported boundary can each claimed authorization rule be safely observed, including a deny result before a paid/protected effect? Distinguish native operator model grants, tool approval, and the unverified cross-route project/account/premium policy.
3. Which existing identifiers and usage outputs correlate the walkthrough's expected actors and attempts? State accounting limits and in-flight budget overshoot; no new pricing/usage store.

The SRS should define affected interfaces, privacy handling, failure outcomes, source/config change invalidation, probe limits and exact commands. It must not implement missing authorization or expand the accepted first slice. Security and architecture review apply to any sensitive technical change; implementation-readiness follows an approved plan/design and verifies actual prerequisites. The approved BRD's pre-execution `validate-product` gate applies to C/D; later comparative ROI experimentation requires a separately scoped validation decision.

## Governance, Privacy And Publication

**RACI:** requesting operator is accountable for scope, authority and final disposition; planning owner is responsible for requirements; runtime/standards evidence owners are responsible for their bounded packages; independent QA/security/economics roles verify relevant evidence; integration owner publishes the coherent baseline. Until dispatch binds named workers, these are role assignments—not claims of external maintainer commitments.

**Failure handling:** no supported interface → unverified claim with owner; failing denial → stop and preserve evidence; stale identity → invalidate only affected support claims; missing actor usage → partial accounting without monetary savings; missing lifecycle walkthrough → partial delivery, not complete baseline. A missing prerequisite blocks only its dependent package, never authorizes a different provider or relaxed oracle.

**Privacy:** record provider/account aliases and IDs sufficient for correlation, not credentials, personal memory, raw confidential transcripts or client content. Keep synthetic task data separate from personal/client projects. Redact before retaining shared artifacts; privacy-driven omissions remain explicit limitations rather than missing fields silently treated as complete.

**Publication:** repository-only baseline; no runtime activation, policy rollout, registry sync, release or deployment is required. A baseline correction supersedes affected evidence with a source/reason while retaining historical observations. The operator accepts any final no-build/defer result; implementation of a recommended fix needs its own scoped approval.

## Planning Artifact Verification

- The unchanged `scripts/outcome/schema.ts` validator accepted the persisted planning record with its exact slug/workflow/run identity. Six unique HAR AC rows mapped one-to-one to numeric serialization aliases, and all local Markdown links resolved.
- Executed with Node 26 native TypeScript loading and the already installed MCP package's fs-extra dependency via temporary module resolution; no repository dependencies were installed and no source validator was modified. Node emitted a module-type inference warning; validation completed successfully.
- Independent BRD-to-PRD review found three fidelity gaps: explicit controlling configuration evidence, identification of reused controls, and the pre-execution validate-product gate. These were corrected in the canonical AC rows and live-package dependencies without changing HAR identities or expanding scope.
- This is planning artifact/schema verification, not executed assurance criteria, runtime denial proof, source-build parity or model efficacy. The temporary validation script is removed after verification.

## Status And Receipt

- feature_status: requirements_ready — delivery plan approved for technical design; assurance execution is not complete.
- Source and delivery-plan approvals are recorded; execution approach remains pending.
- Run record: [plan-20261106.json](../../artifacts/runs/agent-harness-improvement/plan-20261106.json). Schema/scope validity is not approval, authenticity or executed verification.
- Cost: complete parent/worker token usage and prices are unavailable. Report workflow telemetry at handoff without inferring savings from consultation counts.

## References

- [Approved BRD, primary sources, evidence and backlog](../brd/brd-agent-harness-improvement.md).
- [Architecture and truthful evidence/economics boundaries](../../ARCHITECTURE.md).
- [Existing host capability matrix](../agent-capabilities.md); it does not establish live Paseo/OMP operation support.
- [Existing conformance qualifier](../../scripts/harness-smoke/qualification.ts).
- [Outcome RunRecord v1 validator](../../scripts/outcome/schema.ts).
- [Assignment/lifecycle owner](../../skills/common/common-subagent-driven-development/SKILL.md).
- Existing traceability, glossary, assumptions A1/A2, unknowns U1–U3 and risks remain in the approved BRD; this PRD refines only their assurance-baseline delivery consequences.

## Next Workflow

`design-solution`, authorized by delivery-plan approval. No implementation, live runtime exercise, dependency installation or spending is authorized by saving these documents.
