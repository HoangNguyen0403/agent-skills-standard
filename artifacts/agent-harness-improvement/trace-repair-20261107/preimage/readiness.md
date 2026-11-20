# Implementation Readiness: Agent Harness Assurance Baseline

slug: agent-harness-improvement
operator_profile: technical; delivery_mode: extended; snc_tier: high
owner: requesting operator
verdict: PARTIAL_A_B_ONLY
feature_status: design_ready
activation_status: not_required

## Delivery Mode And Work Item

- Work item: [approved BRD](../brd/brd-agent-harness-improvement.md), BRD-HAR-01; [approved PRD](../prd/prd-agent-harness-improvement.md), REQ-HAR-01 / AC-HAR-01–06; [approved SRS](../srs/srs-agent-harness-improvement.md), SRS-001–006.
- Source, delivery-plan and technical-design approvals: requesting operator, 2026-11-06. Operator subsequently selected “Subagent-Driven A/B” in the execution-choice tool. This authorizes bounded analytical A/B artifact delivery and independent review only; C/D live runtime authority remains withheld.
- Current SRS SHA-256 after approval annotation: `1397437e7b2a547b5218ae0a3b12d0a6c29ce5277d201f7be09203461528d3d7`.
- Current PRD SHA-256: `62e784bf8b02be5e58f8e695ece45dbd939c3521526ab59ef0591c8ef29bd868`.
- Evidence lanes: design artifact consistency verified in the [design walkthrough](../srs/srs-walkthrough-agent-harness-improvement.md); actual assurance technical verification NOT RUN; business acceptance not assessed; release not assessed. Historical design/run records retain the approval state at their recording time, not current execution authority.

## Verdict

**PARTIAL: A/B analytical evidence delivery is authorized under Subagent-Driven execution.** Operator selected the presented A/B-only option on 2026-11-06; validated standalone packets are retained in the run artifact directory. Workers return read-only analytical report bodies; integration persists them without changing runtime/source code.

Only A/B flow downstream. C/D remain gated and E may integrate a partial report without declaring full completion. Missing runtime authority does not establish absent capability; missing monetary information does not block qualitative A/B findings.

## Scope Coverage And Package Status

| Package | Owner | Criteria / lane | Status and dependency |
| --- | --- | --- | --- |
| A — Capability inventory | Standards evidence owner; requesting operator accountable | AC-HAR-01 / SRS-001; manual version/config evidence review | READY for bounded analytical delivery; validated packet-a.md, one report author, separate verifier |
| B — Dispatch boundary map | Runtime evidence owner; requesting operator accountable | AC-HAR-02 / SRS-002; manual actual-ingress/source review | READY for bounded read-only boundary analysis; validated packet-b.md, preserve unverified runtime controls |
| C — Enforcement qualification | Runtime conformance owner; independent security verifier | AC-HAR-03 / SRS-003; isolated host conformance | Live execution blocked: no approved safe pre-effect probe boundary, authentic scoped host authority, finite limits or pre-execution validation. Honest unverified findings can be prepared from B evidence without running probes |
| D — Lifecycle and economics | Task walkthrough owner; independent QA/economics verifier | AC-HAR-04/05 / SRS-004/005; live lifecycle and cohort reconciliation | Blocked: authorized deterministic task/oracle, host authority/bounds, permitted native sources/actor mapping, pre-execution validation and real task packet absent |
| E — Integrate and disposition | Baseline integration owner, independent verifier; operator final acceptance | AC-HAR-06 / SRS-006; human disposition | Partial integration depends on actual A/B evidence; full technical delivery needs required D proof and criterion outcomes. No agent supplies human final disposition |

A/B ownership is disjoint under the SRS artifact root: capabilities.md and dispatch-boundaries.md. Integration alone owns baseline.md. An actual dispatcher must bind the declared roles to eligible workers and exact paths/standards/source identities; role names are not external maintainer commitments. The selected analysis workers must remain read-only outside their own evidence-artifact ownership and cannot execute C/D implicitly.

## Four-Level V-Model Assessment

This applies the existing STLC Stages 1–2 reference without adding a second canonical AC definition or verification mapping.

- **Acceptance:** AC-HAR-01–06 remain canonical in the PRD, with explicit owners/lanes. Operator disposition of the baseline is pending and cannot be replaced by artifact-schema PASS.
- **System:** SRS-003/004 define actual-boundary control and lifecycle observations. Missing live task/probe authority blocks those scenarios; discovery help output is not system proof.
- **Integration:** SRS-002/005 distinguish dispatch routes, native-grant boundaries and session/accounting interfaces. No Paseo/OMP native qualifier alias is permitted; SessionJournal is not eval taskUsage. API/runtime changes are out of scope.
- **Unit:** No production code changes are proposed, so no new unit test is required for A/B report authoring. Existing helper/schema checks establish artifact contracts only. Any later source change requires its own focused behavioral regression strategy and approval; source-text tests are not a substitute.

No UI, mobile build, driver/device matrix, market variant, feature flag, database migration or deployment is in scope. Their absence is not a blocker for A/B; these are inapplicable surfaces, not checks marked PASS. Approval, privacy, stop/unknown state, stale evidence and missing accounting paths are explicitly covered by the SRS failure contracts.

## Prerequisite Observations

- Safe smoke: existing Python `task_brief.py --help` and `sdd_progress.py --help` both executed successfully. This proves those command entrypoints load, not that a packet exists, a host dispatched a task, or a cancelled worker stopped.
- Prior source CLI smoke failed because tsx was unavailable. This known failure was not rerun; source helper/qualifier execution needing that runner remains blocked until an already authorized runner is resolved. A/B use read-only evidence and do not need a qualifier execution to state unverified status.
- The source repository contains product-evidence validation script/schema. The canonical validate-product workflow is installed. Inspected Codex/Claude/.agents product-management skill roots expose the foundation BRD/PRD skills, not the advanced evidence/experimentation resources at their ordinary installed paths. No active advanced-pack executable installation is established by source checkout presence.
- **Capability gap:** installed product-evidence / product-experimentation bodies and validator resources are not established in the inspected configured host roots; opt in at a reviewed ref and sync if the operator elects to use them. MCP access to a skill body would not establish executable-resource installation. This is an optional product-capability gap, not authorization to install and not a blocker for A/B. Preserve pre-execution validation as an unvalidated proposal until the relevant preflight is satisfied.
- Existing design checks passed the unchanged RunRecord schema, links, unique SRS/VER mappings and source digests. Current design approval is recorded; no implementation is verified by these checks.

## Blocking Gaps And Clearing Actions

| Gap | Owner | Clearing action | Affected scope |
| --- | --- | --- | --- |
| A/B execution approach | Requesting operator | CLEARED: explicit Subagent-Driven A/B selection recorded on 2026-11-06 | A/B only; C/D not included |
| A/B concrete task plan/packets | Dispatcher/integration owner | CLEARED: real Task 1/2 plan and manifests passed task_brief.py, producing packet-a.md and packet-b.md | A/B only; later C/D still need their own packets |
| Safe authentic denial interface unknown | Runtime/security verifier | Resolve supported harmless pre-effect observation and authority; otherwise keep the claim unverified, with no live probe | C live promotion |
| Live task and finite authority limits missing | Operator + runtime/QA verifier | Establish one task, independent oracle, permitted workspace/tools/route, request/runtime/spend bounds and stop rules | C/D live execution |
| Pre-execution validation/resource preflight unresolved | Validation owner | Establish approved validation contract, eligible data, bounded exposure and installed capabilities as required by the approved PRD; host authorization remains separate | C/D empirical work |
| Usage sources and actor/attempt mapping absent | Operator + economics verifier | Explicitly authorize selected native sources, expected actor inventory and correlation; retain partial status where data is unavailable | D accounting completeness |
| Required walkthrough and human disposition absent | Task owner / operator | Execute only after relevant gates, independently verify actual outcome, then obtain operator disposition | Full E completion |

No evidence gap authorizes provider fallback, premium calls, relaxed denial oracle, policy edits or cross-client data access. Fixing identified runtime controls or installing optional resources remains a separate authorized scope.

## Recorded Execution Decision

**Subagent-Driven A/B only:** two bounded analysis workers prepare the capability inventory and dispatch-boundary map using retained/public/read-only source evidence; a separate verifier reviews them; integration reports partial baseline findings. No live denial, lifecycle/cancel exercise, private journal reading, source implementation, dependency install or model/account policy change. Actual worker profiles follow the eligible analysis/review policy, not the implementation-cheap ladder merely because artifacts are written.

Operator selected **Subagent-Driven A/B**. This settles the presented approach only; it does not authorize C/D.

## Status, Receipt And Route

- Run record: [20261106T173353Z-implementation-readiness.json](../../artifacts/runs/agent-harness-improvement/20261106T173353Z-implementation-readiness.json).
- `feature_status: design_ready` preserves specification status; `verdict: PARTIAL_A_B_ONLY` permits bounded A/B analytical delivery, not all-slice execution or completion.
- Next workflow: `implement-feature` for the explicitly ready A/B artifact-delivery subset under the agreed approach. C/D remain excluded until their own gates clear.
- Exact total tokens/spend are unavailable. Readiness does not establish realized ROI, remaining quota, source-build parity or full-task economics.
