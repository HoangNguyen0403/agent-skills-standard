# Technical Design (SRS/FRS): Broad Cybersecurity Lab Validation

Status: proposed design for G2 review; not approved for implementation or execution.
Slug: `cyber-lab-validation`. Source: [approved PRD](../prd/prd-cyber-lab-validation.md).
Design author: bounded Slice A worker. Engineering, security, QA and release accountable people remain unassigned; the coordinator must record assignments before their gated work.
Repository status: design artifacts only. Activation status: dormant. G1 approved; G2, G3, G4 and G5 remain pending. A lab label grants no action authority.

## 1. Context, evidence and scope

The design preserves the PRD's seven requirements, nineteen acceptance criteria, four modes and seven scenario families. It extends baseline Objectives 001–002 and Requirements 003–007 without renumbering them. No separate BRD or product-ledger IDs were supplied; none are invented. Goal trace: O1 -> REQ-CLV-01/02/03/04; O2 -> REQ-CLV-02/03/05; O3 -> REQ-CLV-06/07.

### Evidence ledger

| ID | Evidence | Consequence |
| --- | --- | --- |
| E01 | confirmed(`docs/srs/srs-task-list-governed-cybersecurity.md`, parallel contracts) | Baseline prohibits operational attacks, real targets, credentials, malware and exfiltration; preserves ADR-005 runtime separation. G2 amendment required. |
| E02 | confirmed(`skills/cybersecurity/cyber-scoped-validation/SKILL.md`, steps 3–6 and rules) | Existing validation lane stays offline/supplied-evidence oriented and prohibits exploit scripts/operational attack commands. Do not silently reinterpret it. |
| E03 | confirmed(`skills/cybersecurity/cyber-authorization/SKILL.md` and `references/runtime-authorization-matrix.md`) | Per-action fresh scope and proven tools/credentials/filesystem/network/logging/cancellation controls remain mandatory. |
| E04 | confirmed(`skills/cybersecurity/cyber-evidence/references/evidence-record.md`, `cyber-detection-validation/SKILL.md`) | Finding and purple defensive enums are separate existing contracts; evidence must be paired and provenance-aware. |
| E05 | confirmed(`.agents/workflows/cyber-exercise.md`, preflight through adjudication; `cyber-purple-validation.md`, runtime contract/steps; `cyber-triage.md`, steps) | Workflows need explicit routing/continuation handoffs, not global permission expansion. |
| E06 | confirmed(`.agents/workflows/pentest.md`, scope and exploit verification; `security-test.md`, policy and design gate) | Pentest needs explicit optional lab handoff; security-test remains static/delta-focused, not an active-lab workflow. |
| E07 | confirmed(`docs/srs/srs-walkthrough-governed-cybersecurity.md`, immutable live evidence) | Historical scores 50/73 outcome/pressure, 13/27 pressure and 75/75 trigger remain historical; none of eleven cyber skills was represented as strict release-ready. |
| E08 | confirmed(`ARCHITECTURE.md`, system overview, SDLC and ADR-005 boundary as preserved in baseline) | Registry -> CLI sync -> installed agent is distribution, not host enforcement. Canonical workflows are `.agents/workflows`. |
| E09 | unknown: host isolation/cancellation proof, exact provider IDs/settings, current-model baseline, named approval owners | Blocks relevant G3/G4 cells, not this design or safe offline work. |
| E10 | Evaluation worker source finding, detailed in [evaluation appendix](srs-cyber-lab-validation-evaluation.md): `scripts/evals/execute.ts` uses Codex runner and text assertions | Existing runner must not be advertised as multi-provider or a behavioral/lab executor. Appendix owns detailed CLI and provenance evidence. |

Included capability leaves: route work, govern validation, exercise the seven-family catalog, continue independent work, report evidence, measure model-specific compatibility and distribute opt-in changes (PRD section 2). Excluded: production/public targets, autonomous exploit chains, live malware, destructive payloads, real credential collection, real-data exfiltration, persistence beyond lifecycle, safety-filter bypass, refusal-driven provider switching, a new attack platform or enforcement service. No deferred capability is silently included.

## 2. HLD and component ownership

Audience: contract, workflow, scenario/evaluation and integration owners. Decision: freeze adapter-neutral document contracts before disjoint implementation. Structured component, sequence and lifecycle tables answer the ownership/order questions; no additional diagram files are necessary.

| HLD | Context / requirement | Component and single implementation owner | Input -> output / failure boundary |
| --- | --- | --- | --- |
| HLD-CLV-01 | Mode selection and continuation; REQ-CLV-01/04 | CMP-ROUTE, workflow owner | Request + dependency graph -> mode and per-step dispositions; no host action on ambiguous mode |
| HLD-CLV-02 | Authorization and control proof; REQ-CLV-02 | CMP-GATE, authorization contract owner | Scenario + authority + host proof -> action-specific gate; host owns enforcement, registry cannot fabricate proof |
| HLD-CLV-03 | Bounded catalog; REQ-CLV-03 | CMP-SCENARIO, scenario owner | Versioned scenario -> contract validation, required evidence and capability set; unknown action unsupported |
| HLD-CLV-04 | Evidence truthfulness; REQ-CLV-05 | CMP-EVIDENCE, evidence contract owner | Action/observation + custody -> finding and defensive outcome with limitations; no inference from missing evidence |
| HLD-CLV-05 | Reproducible comparison; REQ-CLV-06 | CMP-EVAL, evaluation owner | Frozen corpus/configuration -> case ledger, independent adjudication and denominators; infrastructure is not refusal |
| HLD-CLV-06 | Portable distribution; REQ-CLV-07 | CMP-DIST, integration owner | Reviewed canonical package -> generated exports and temporary-consumer smoke; never edit mirrors as source |

Dependency direction: installed workflow reads scenario and shared contracts; CMP-ROUTE requests CMP-GATE decision before host invocation; host emits evidence consumed by CMP-EVIDENCE; CMP-EVAL consumes immutable results; CMP-DIST distributes reviewed definitions, not action permission. No registry-to-host execution API or new service is introduced.

RACI: requesting operator is product accountable; assigned engineering owner is accountable for contracts; independent security reviewer checks authority/control boundaries; named QA lead is accountable for evaluation; integration owner controls generators/export changes; release approver controls G5. Worker/control/operator cannot independently approve their own promotion. Unassigned accountable roles block their gates.

## 3. Requirement cards and end-to-end trace

All cards: priority P0/Must; status Proposed, pending G2. Evidence targets are future acceptance artifacts, not completed tests. `VER-CLV-NN` maps one-to-one to `AC-CLV-NN` in section 9. Categorical NFRs N1–N5 apply as referenced.

| SRS / statement | Source and trace | Trigger -> behavior/output | Error / fallback | NFR, measurement and lane |
| --- | --- | --- | --- | --- |
| SRS-CLV-01: Select exactly one declared mode per step, not one permission level per engagement. | REQ-CLV-01 -> HLD-CLV-01 -> CMP-ROUTE -> LLD-ROUTE; AC-CLV-01/02; VER-CLV-01/02 | Request -> mode, exercised stages and fidelity statement; source review needs no live-host proof | Ambiguous active request remains unexecuted; continue classified analysis | N1/N3; decision-table answer/replay review |
| SRS-CLV-02: A supported active action is eligible only under current action-specific authority and demonstrated host controls. | REQ-CLV-02 -> HLD-CLV-02 -> CMP-GATE -> LLD-GATE; AC-CLV-03/04/05/06; VER-CLV-03/04/05/06 | Pre-action/restart -> gate binding exact target, fixture, action, limits and proof | Missing/expired/drift/stop -> block or stop and independent safe continuation | N1/N2; security contract walkthrough and real host stop smoke |
| SRS-CLV-03: Validate each catalog entry against one shared scenario schema and minimum observable proof. | REQ-CLV-03 -> HLD-CLV-03 -> CMP-SCENARIO -> LLD-SCENARIO; AC-CLV-07/08; VER-CLV-07/08 | Catalog selection -> all fields plus positive/negative/boundary coverage for seven families | Missing prerequisite/action support -> explicit unsupported or blocked cell, no family dropped | N1/N3; schema review, catalog review and per-family runtime evidence |
| SRS-CLV-04: Isolate blocked predecessors while progressing only independent permitted steps. | REQ-CLV-04 -> HLD-CLV-01 -> CMP-ROUTE -> LLD-ROUTE; AC-CLV-09/10; VER-CLV-09/10 | Step block/refusal -> dependency impact and independent remediation output | Missing producer evidence -> dependency-blocked, never fabricated substitute or disguised retry | N1/N3; mixed-work answer and host workflow cases |
| SRS-CLV-05: Preserve finding/defensive enums, provenance and residual state without inventing certainty. | REQ-CLV-05 -> HLD-CLV-04 -> CMP-EVIDENCE -> LLD-EVIDENCE; AC-CLV-11/12/13/18; VER-CLV-11/12/13/18 | Supplied/exercised evidence -> redacted record, justified finding, optional defensive outcome, cleanup disclosure | No evidence -> not-tested; failed reproduction does not prove absence; absent observation -> telemetry-gap | N3/N4; independent evidence adjudication and cleanup timeline |
| SRS-CLV-06: Compare only frozen case/configuration cells and separate refusal, task and infrastructure results. | REQ-CLV-06 -> HLD-CLV-05 -> CMP-EVAL -> appendix contracts; AC-CLV-14/15/19; VER-CLV-14/15/19 | Approved evaluation -> case outcomes, denominators, provenance and cost/latency only where measured | Unsupported adapter/quota -> infrastructure result; urgent blue-team framing grants no authority | N1/N3/N4; answer evaluation plus separately approved runtime lane |
| SRS-CLV-07: Distribute opt-in reviewed canonical definitions without rewriting history or bypassing native export rules. | REQ-CLV-07 -> HLD-CLV-06 -> CMP-DIST -> section 10; AC-CLV-16/17; VER-CLV-16/17 | Approved sources -> generated consumers/resources, temporary-project exercise | Missing resources/export mismatch -> block promotion, retain prior reviewed package | N4/N5; package sync smoke and immutable-evidence comparison |

## 4. Contracts and selected LLD

These are document-level version-1 logical interfaces, not claims of an existing executable schema/API. Future contract owner implements validation in existing skill/reference conventions. No HTTP endpoint, database or generic executor is required. Fields described as required cannot be inferred from a lab label. Unsupported major versions fail contract validation without migration by guesswork.

### LLD-SCENARIO: ScenarioContract v1

| Field | Type / validation |
| --- | --- |
| `schema_version`, `scenario_id`, `scenario_version` | Integer 1, stable ID, immutable revision identity; fixture resource hashes separately recorded |
| `family`, `objective`, `hypothesis` | One of seven PRD families; single observable claim; no chain-expansion objective |
| `mode` | `analysis` / `replay` / `isolated-lab-validation` / `defensive-verification` |
| `target` | `{lab_id, asset_id, fixture_revision, identity_proof_ref}`; explicit absent target permitted only for non-active analysis/replay; active target must be disposable and synthetic |
| `approved_actions`, `exclusions` | List of exact action IDs/versions, permitted input/effect bounds and excluded effects; deny not explicitly allowed |
| `authorization` | `{engagement_scope_ref, authorization_ref, requester, approver, accountable_owner, valid_from, expires_at, restart_authority, review_status}`; active fields must be populated and current |
| `synthetic_data_boundary` | Permitted synthetic identities/data/markers and forbidden real data; approved credential source is either none or synthetic least-privilege lab source, never ambient credentials |
| `required_host_capabilities` | Capability IDs with enforcement boundary, proof criteria, freshness and resource binding; see LLD-GATE |
| `minimum_proof` | Required action receipt fields, claim-specific observation predicates, original source and permitted inference; no bare non-empty log assertion |
| `expected_observation` | `{entity, channel, stages, window, predicate, source_owner}`; observation window fixed before run |
| `execution_limits` | Approved finite duration, action count/concurrency, resource/data/effect bounds and network/filesystem limits; units and host enforcement proof required; no invented default numeric limit |
| `stop_restart` | Triggers, host stop mechanism/operator contact, cancellation proof, restart approver and fresh-gate rules |
| `cleanup` | Owned resources, teardown action IDs, surviving authority, expected residual-state predicates, observer and verification source |
| `remediation_retest` | Bounded remediation proposal, fixed comparison claim, retest input revisions and fresh-authority rule |
| `evidence_owner`, `fidelity_limitations` | Assigned accountable evidence role/person; explicit source/replay/exercised boundaries and unsupported equivalence |

Each family has supported-positive, negative-control, missing-prerequisite boundary and pressure cases in the [evaluation appendix](srs-cyber-lab-validation-evaluation.md). A supported case means preclassified permitted task, not guaranteed provider compliance or active-host availability. Dependencies use pinned local fixtures with separate vulnerable/patched revisions; container/cloud cases do not borrow tenant credentials or claim cloud fidelity from local configuration alone. Endpoint behavior uses benign bounded emulation or labeled replay; no full attack-chain equivalence.

### LLD-GATE: ActionRequest, capability proof and GateDecision

`ActionRequest`: `{schema_version:1, run_id, attempt_id, step_id, scenario_id, scenario_version, action_id, action_version, mode, active, target, input_refs, dependency_refs, authorization_ref, capability_proof_refs, limits, cleanup_plan_ref}`. `active` is true for any tool/network/filesystem/credential/host-state interaction outside supplied-artifact reasoning, including defensive verification that collects or modifies state. Replay against a service is active; merely reading a supplied synthetic event is not. Mode never overrides this effects classification.

`GateDecision`: `{request_ref, decision:eligible|blocked, evaluated_at, valid_until, bound_target_identity, bound_input_revisions, authorization_ref, capability_proof_refs, reason_codes, missing_prerequisites, owner}`. Eligibility requires all checks; expiry is no later than authority/proof/limit expiry. It is not execution evidence. Host must reject scope/identity/revision changes between gate and invocation and enforce constraints throughout execution; if this binding cannot be demonstrated, active work is unsupported. Recheck immediately before every action. No long-lived engagement-wide authorization cache is sufficient.

| Capability | Enforcement owner and proof required for active work | Missing or lost support |
| --- | --- | --- |
| Disposable isolation | Lab host owner: observed fixture identity, resource namespace and containment/egress boundary; approved safe boundary challenge with negative observation | Block/stop lab action; local name/container label alone is not proof |
| Tool allowlist and input/effect limits | Host owner: action/version allowlist and denial of a disallowed action/input in same boundary | Block/stop; no generic shell permission as equivalent |
| Filesystem | Host owner: explicit paths/modes and observed denial outside disposable scope, including escape boundaries | Block writes/reads outside supplied permitted artifacts |
| Network | Host owner: approved destination identity, default-denied other egress and demonstrated denial; no public target fallback | Block/stop network action |
| Credential boundary | Host owner: none or approved synthetic source, least privilege/expiry and absent ambient real credentials | Block credentialed action; never inspect real secrets to prove absence |
| Logging/custody | Host and evidence owners: actor/action/target/start/end/result timestamps and protected original references, redaction/export path | Block action without required auditability; lost logs become evidence gap, not successful proof |
| Cancellation and expiry | Host/control owner: independent operator stop path, expiration enforcement and observed cancellation of safe in-flight fixture action; action-specific maximum stop latency approved before G3 | Block when missing; lost path stops new dispatch and triggers surviving host stop procedure |
| Teardown | Lab owner: bounded cleanup authority, resource inventory, teardown and independent residual-state observation | Block scenario whose required safe lifecycle cannot be supported; teardown failure remains visible |

Proof envelope: `{proof_id, capability_id, host_id, host_version, lab_id, target_identity, tool/action_versions, configuration_revision, method, observed_at, valid_until, observer, original_evidence_refs, redacted_evidence_refs, limitations, review_status}`. Hashes identify bytes, not authority. A supplied manifest or typed reviewer name alone does not prove enforcement. G3 owner must independently inspect evidence appropriate to the host. Host controls, model policy and applicable runtime instructions remain authoritative even after G2/G3.

### LLD-ROUTE: StepResult and dependency semantics

`StepResult`: `{schema_version:1, run_id, attempt_id, step_id, mode, active, step_state, block_reason, reason_detail, dependency_refs, gate_ref, action_receipt_refs, observation_refs, produced_evidence_refs, missing_prerequisites, permitted_next_steps, accountable_owner, cleanup_result_ref}`.

`step_state`: `planned | eligible | running | completed | blocked | stopped | failed | dependency-blocked`.
`block_reason`: nullable `out-of-scope | policy-refused | unsupported-action | unsupported-runtime | authorization-missing | authorization-expired | operator-stop | target-drift | unsafe-impact | evidence-missing | infrastructure-failure`.

The name `block_reason` is an impediment classification, not a finding status: required on `blocked`, `stopped`, `failed`, `dependency-blocked`; null on `planned`, `eligible`, `running`, `completed`. `reason_detail` describes the exact failed capability/constraint/provider diagnostic without unsafe payloads. `dependency-blocked` uses `evidence-missing` and names producer IDs; predecessor reason stays on predecessor. `failed` represents an attempted action error, not failed reproduction: a completed bounded action that fails to reproduce is `completed` with a negative/insufficient claim result. Runtime/provider errors use `infrastructure-failure`; refusal before execution uses `blocked/policy-refused`; observed refusal during an active session stops further dispatch and records actual partial action receipts.

State transitions: planned -> eligible -> running -> completed/failed/stopped; planned or eligible -> blocked/dependency-blocked; running cannot become merely blocked to hide partial execution. Planned/eligible/running are never successes. Completed means only the specified step finished, not that a vulnerability was reproduced, defense worked, or cleanup passed. A stopped/blocked/failed attempt is immutable; restart creates a new attempt with predecessor reference and a fresh gate, never rewrites a terminal result to completed.

Workflow owner stores an acyclic declared dependency graph; reject cycles/missing producer IDs before dispatch. A consumer needs the specified evidence artifact/predicate, not just producer `completed`. Supplied independent evidence may satisfy a declared alternate input only when the scenario explicitly permits it and provenance/fidelity are carried forward; never relabel supplied or replay evidence as exercised output. Continue analysis/remediation/reporting that has no missing dependency and whose own permissions are valid. Do not retry obfuscated prompts, substitute providers or expand the claim after refusal.

### LLD-EVIDENCE: compatible records and correlation

Existing fields remain unchanged: `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, `accountable_owner`. Finding enum remains exactly `confirmed | suspected | blocked | not-tested | false-positive`. Add optional `lab_validation` extension containing version, scenario/run/attempt/step refs, mode, fidelity, gate/action/observation refs and cleanup ref. Legacy consumers may ignore this extension but cannot advertise active-lab acceptance without interpreting it. No migration or rewriting of old records is required.

`finding_status=not-tested` when there is no supplied/exercised finding evidence, even if the attempted step was blocked. `blocked` finding status remains available for an evidence-backed unresolved validation barrier; it is not mechanically copied from step_state. Supplied corroboration can justify suspected/confirmed under existing review rules even when a new retest is blocked; preserve the distinction and cite actual source. Failed reproduction never proves vulnerability absence; `false-positive` requires independent corroboration invalidating the claimed finding, not simply no reproduction.

`ActionReceipt`: `{run_id, attempt_id, step_id, test_id, entity, target_identity, action_id/version, gate_ref, started_at, ended_at, host_source, result, original_evidence_refs}`. `ObservationRecord`: `{observation_id, action_receipt_ref, test_id, entity, window, source, observed_at, exercised_stages, method, redacted_evidence_refs, limitations}`. `action_receipt_ref` is mandatory for a paired claim and resolves to exactly one immutable ActionReceipt; an unpaired supplied observation may retain an explicitly absent reference for analysis only, never as paired execution proof. Missing receipt or timestamp stays absent; examples never populate observed records.

Mandatory binding chain: `ObservationRecord.action_receipt_ref -> ActionReceipt.gate_ref -> GateDecision.request_ref -> ActionRequest.target/input_refs`. Each reference must resolve uniquely to an immutable record. The gate must bind that exact request's run/attempt/step, action/version, target identity, fixture revision and fixture-resource digests through its bound target/input revisions; the receipt must agree with those inherited values. Every observation used for a paired claim inherits run/attempt/step, gate and complete target/fixture identity from this chain, not from a generic run envelope or a matching test label. If a carrier repeats inherited fields, they must agree exactly. No redundant target schema is required on ObservationRecord.

Correlation key is `(run_id, attempt_id, test_id)`. Allocate it before dispatch and bind it to exactly one step, action receipt, gate and target/fixture revision/digest set; never reassign that key to another fixture, action or attempt. Retries/restarts require a new attempt and key. Each `observation_id` is unique within `(run_id, attempt_id)` and identifies one immutable observation; multiple distinct observations may reference the same receipt. Byte-identical repeated delivery of the same record/reference is de-duplicated, not a second action or proof. Conflicting records under a reused key/reference/observation ID are rejected, not overwritten or resolved by latest timestamp.

Paired validation must resolve the full chain, then check key, entity, approved time window, source and exact inherited target/fixture values before classifying a defensive outcome. Reject missing/ambiguous links, cross-run/attempt references, cross-fixture joins, reused IDs with conflicting bindings, out-of-window observations and source-only/test-label matches. Preserve rejected originals with a provenance limitation; they cannot establish prevented/detected/responded. An evidenced action left without a usable matched observation is `telemetry-gap`; an observation alone cannot prove that action occurred. Verification obligation VER-CLV-12 includes a fixed patched-fixture/restart mismatch and reused-correlation-key negative instance, owned by the evaluation appendix (for example CLV-F06-N); this defines planned rejection behavior, not an executed test.

Purple enum remains `blocked | prevented | detected | responded | telemetry-gap`; it is optional for non-defensive findings. `blocked` means action could not run, never prevention. `prevented` requires an evidenced control interruption; `detected` requires the specified observation; `responded` requires independently evidenced authorized response, not detection alone. An exercised action without usable corresponding observation is `telemetry-gap`. Observation-only output cannot prove action occurrence. Replay classification reports only stages exercised (for example parser/correlation), never sensor acquisition, prevention or endpoint response unless independently exercised and evidenced. Source reasoning, event replay and exercised lab behavior are distinct fidelity labels, not authority levels.

`CleanupResult`: `{run_id, attempt_id, planned_resources, teardown_action_refs, authority_ref, verification_refs, state:verified-clean|residual|unverified|not-applicable, residual_resources, limitations, accountable_owner}`. `not-applicable` is only for a mode creating no lab state, with rationale. No post-expiry cleanup runs unless a separately valid surviving teardown authorization covers that operation. Missing verification is unverified/residual disclosure, never clean completion.

## 5. Functional flows and adverse timelines

| Flow | Actor / one-session goal | Normal course | Alternate | Exception |
| --- | --- | --- | --- | --- |
| FRS-01 | Analyst / analyze supplied source | Classify analysis -> cite source -> finding and remediation with limitations | Supplied event replay -> list stages and fixture provenance | Missing artifacts -> not-tested; independent plan drafting continues |
| FRS-02 | Lab operator / validate one approved claim | Select versioned scenario -> validate fields -> fresh per-action gate -> host bounded action -> paired evidence -> bounded cleanup -> independent adjudication | Supported defensive verification uses same effects gate when active | Any prohibition/control gap -> precise block; no invocation, no fabricated observation |
| FRS-03 | Workflow owner / complete independent remediation | Resolve graph -> record blocked action -> mark dependent evidence tasks dependency-blocked -> execute permitted independent remediation -> report all states | Valid supplied alternate evidence as explicitly declared | Cycle/missing producer -> graph error; no dependency guessing |
| FRS-04 | Control operator / stop unsafe run | Observe stop/expiry/drift -> host cancellation -> record partial action and time -> surviving authorized cleanup -> report residual state | Lost runtime -> independent operator stop path | Cancellation acknowledgement absent -> stopped dispatch, unknown in-flight effects, owner escalation; no clean claim |
| FRS-05 | Lab operator / restart a stopped claim | New attempt -> explicit restart authority -> reconcile residual resources -> fresh identity, limits, controls and gate -> new action receipts | Remain offline while prerequisite resolved | Old token/approval or unresolved residual boundary -> restart blocked |
| FRS-06 | QA owner / compare candidate to baseline | Freeze configurations/corpus -> authorized eligible runner -> separate answer/runtime lanes -> independent adjudication -> denominators | Unsupported configuration remains a named unmeasured cell | Quota/provider/adapter failure -> infrastructure category; never refusal or substituted model |

### Ordering, idempotency and recovery

1. Prepare records before dispatch; gate binds input/target revisions. Host rejects drift at dispatch and during execution. Stop invalidates further eligibility even if queued before stop.
2. Control events are ordered within run/attempt; host stop dominates concurrent dispatch. Capture event sequence and observed timestamps without inventing precision or total ordering across unsynchronized hosts.
3. Dispatch identity is `(run_id, attempt_id, step_id, action_id)`. Lost acknowledgement must not trigger automatic active replay. Reconcile host receipt/resources through separately authorized inspection; if effect cannot be established, report unknown and stop that branch. No exactly-once delivery claim.
4. Evidence delivery may repeat: de-duplicate artifact references by content identity and event identity, preserving conflicting originals for review. Do not repeat the underlying active action to repair a missing log.
5. Timeline: gate valid -> action starts -> expiry/drift/stop -> host cancels -> partial receipts retained -> cleanup only under surviving authority -> fresh restart gate. Cancellation latency has no invented universal SLO; scenario limit must be approved and demonstrated before G3.
6. Timeline: action finished -> observation timeout -> telemetry-gap -> authorized collection review only. No automatic extra probing. Timeline: teardown request -> host unavailable -> residual/unverified state and named owner; reporting continues.

## 6. Failure matrix

| Failure | Observable disposition | Independent continuation / recovery | Verification |
| --- | --- | --- | --- |
| Prohibited effect or public/production target | blocked/out-of-scope | Analysis/remediation only; no lab relabeling | VER-CLV-19 |
| Unknown action/version | blocked/unsupported-action | Contract review; no generic executor | VER-CLV-07 |
| Missing isolation/cancel proof | blocked/unsupported-runtime | Offline plan; G3 proof owned by lab host owner | VER-CLV-04 |
| Missing/expired authority | blocked/authorization-missing or authorization-expired; if running, stopped | Fresh approval and gate; no exception waiver | VER-CLV-03/05/06 |
| Drift/operator stop/unsafe effect | stopped with exact reason and partial receipts | Surviving teardown only; new attempt for restart | VER-CLV-05/06/13 |
| Model policy refusal | blocked/policy-refused | Independent remediation; no provider switching | VER-CLV-09/19 |
| Provider quota/adapter outage | blocked or failed/infrastructure-failure according to whether action began | Preserve incomplete cell and actual partial evidence | VER-CLV-15 |
| Missing producer evidence | dependency-blocked/evidence-missing | Independent branches only | VER-CLV-10 |
| No evidence / reproduction unsuccessful | not-tested when none; otherwise justified existing finding status with limits | Do not infer secure/absent vulnerability | VER-CLV-11/18 |
| Action without observation | telemetry-gap | Authorized evidence-path review, not escalation | VER-CLV-12 |
| Cleanup verification unavailable | residual or unverified | Report resources/owner; no clean closure | VER-CLV-13 |
| Export/resource mismatch | distribution promotion blocked | Prior reviewed package retained/restored; never direct mirror repair | VER-CLV-16/17 |

## 7. NFRs, privacy and data ownership

| ID | Verifiable invariant / threshold | Measurement |
| --- | --- | --- |
| N1 authority | No observed scope escape or bypass in evaluated corpus; each active action bound to valid authority and proven host constraints | Gate/negative/pressure review plus actual host evidence; zero failures required by PRD |
| N2 lifecycle | Stop prevents further active dispatch; in-flight cancellation within scenario-approved demonstrated limit; restart always fresh | Host safe stop/expiry/drift smoke and event/resource timeline |
| N3 truthfulness | No invented execution/observation/cleanup; every claim identifies exercised stages and limitations | Independent receipt/custody comparison, all continuation/evidence ACs pass |
| N4 integrity/privacy | Synthetic-only fixtures, sanitized reports, immutable historical results and attributable appended corrections | Resource hashes, redaction review, provenance verifier and historical-artifact comparison |
| N5 compatibility | Opt-in exports include required packaged references; existing finding/purple enums preserved | Temporary-consumer sync/exercise, legacy-field interpretation review |

Performance/latency, cost and concurrency thresholds are not specified by the PRD beyond per-scenario approved limits and the proposed per-model supported-positive completion target of at least 90%. Do not invent latency/availability SLOs. The G3 scenario owner must supply finite limits and stop latency; G4 evaluation owner must supply budget and exact configurations. Missing these blocks their execution, not design authoring.

Evidence owner retains access-controlled originals under the engagement's approved retention/access policy; sanitized references go to the existing run artifacts and canonical `artifacts/security-review.md` when a continuous chain owns it. Retention duration, approved storage and access owner must be assigned before collection; there is no new database, dashboard or signing service. Never persist real credentials/personal data. Append corrections with source/reason; preserve original findings and historical evaluations. Unassigned owner is explicitly `unassigned`, with assignment required before active handoff/closure; do not invent a name.

## 8. Proposed baseline amendment and embedded ADR-CLV-01

**Status: proposed, approval pending. This section does not amend baseline or grant permission.**

Context: baseline parallel-contract prohibition and existing scoped-validation rules exclude operational attacks. Merely editing routing words cannot establish an active lab capability. Registry instructions cannot enforce a host boundary.

Decision requested at G2: approve a narrowly separated, opt-in lab contract, provisionally named `skills/cybersecurity/cyber-lab-validation/`, while preserving `cyber-scoped-validation` as the existing offline/supplied-evidence lane. This adds a distinct contract package, not an attack platform or generic executor. Canonical category metadata/index changes are integration-owned and must identify the new opt-in capability accurately rather than retain an eleven-skill count where no longer true.

Proposed amendment text for explicit approval, not applied here:

> Preserve baseline ADR-005, evidence enums and existing scoped-validation prohibitions. Only the separate opt-in lab-validation contract may describe eligibility for a predeclared minimum-proof action against a pinned disposable synthetic local fixture. Eligibility requires action/version-specific approval, independently demonstrated host isolation and tool/filesystem/network/credential/logging/cancellation boundaries, finite approved limits, paired evidence, bounded teardown and fresh stop/restart gates. No action is authorized by a lab label, role, plan, source publication or G2 alone. Unknown action support and missing runtime proof remain blocked. All production/public/real targets, real credential collection or use, real-data exfiltration, live malware, destructive payloads, persistence beyond lifecycle, autonomous exploit chains, bypass/obfuscation and refusal-driven provider switching remain excluded. Existing host/model policies remain authoritative. Synthetic least-privilege lab identities are allowed only under the approved scenario boundary. No unrestricted exploit-script or operational-command exception is created; each allowed fixture action must be explicitly enumerated and independently reviewed before G3.

Dormancy: G2 approves technical boundary and the explicit baseline amendment only. Source authoring follows implementation-readiness with named owners; no dormant document may invoke tools automatically. G3 separately requires each scenario's authority and host proofs. G4 requires fresh evaluations and independent security/architecture review. G5 is explicit publication/release approval. Missing any matching gate keeps its dependent lane inactive; safe analysis/replay of supplied artifacts remains available.

Alternative considered: broaden scoped-validation in place. Rejected recommendation: loses a stable offline contract and risks turning old consumers' prohibitions into implied execution permission. Separate opt-in contract is easier to audit/abandon; cost is one compact package and explicit routing. Load-bearing assumption: host capabilities can be demonstrated without building a new service. First failure: host cannot demonstrate containment/cancellation; then lab lane stays unsupported, not replaced with simulated success. Worst plausible case: active effects escape claimed boundaries; default deny and independent G3 proof are mandatory, and any observed failure blocks promotion. Abandonment: remove unpublished candidate routing/package, retain evidence and prior offline versions; no deployed-state migration is required by this design.

Approval owner: requesting operator with named engineering owner and independent security review. Required decision: accept/reject this exact allowed/excluded boundary and separate-package design; record approval reference/revision. No worker supplies human sign-off. Runtime availability and exact action enumeration are G3 inputs, not assumed approvals at G2.

## 9. Verification and complete AC mapping

Detailed case inputs/rubrics belong only to the [evaluation appendix](srs-cyber-lab-validation-evaluation.md): 28 family cases `CLV-F01..07-{S,N,B,P}` plus cross-cutting `CLV-X` cases. Verification IDs below are stable acceptance obligations and must link to those case IDs in the integrated appendix. No tests or model/lab runs were executed for this documentation task.

| Verification / AC | Required observable evidence | Lane and acceptance |
| --- | --- | --- |
| VER-CLV-01 / AC-CLV-01 | Source analysis completes without live-host prerequisite | Answer review; no fabricated collection |
| VER-CLV-02 / AC-CLV-02 | Replay report names only exercised stages | Replay/answer; no sensor efficacy inference |
| VER-CLV-03 / AC-CLV-03 | Gate and actual receipt match exact authorized bounded action | Security integration + runtime; eligibility alone insufficient |
| VER-CLV-04 / AC-CLV-04 | Missing isolation/cancellation named; no active invocation | Negative contract + runtime denial |
| VER-CLV-05 / AC-CLV-05 | Expiry, drift and operator-stop timelines prevent further action | Real safe host stop smoke; each trigger covered |
| VER-CLV-06 / AC-CLV-06 | Old gate cannot restart; new attempt needs fresh valid gate | Negative runtime/contract case |
| VER-CLV-07 / AC-CLV-07 | Every shared field and bounded minimum-proof predicate validated | Catalog/schema review; no non-empty-only proof |
| VER-CLV-08 / AC-CLV-08 | Seven families each have distinct positive/negative/boundary cases | Appendix coverage review; active family smoke separately required |
| VER-CLV-09 / AC-CLV-09 | Independent remediation output despite blocked/refused action; no disguised retry | Mixed-task answer/workflow review |
| VER-CLV-10 / AC-CLV-10 | Missing producer evidence explicitly dependency-blocks consumer | Dependency workflow case; no fake inputs |
| VER-CLV-11 / AC-CLV-11 | No supplied/exercised evidence produces not-tested finding | Evidence adjudication |
| VER-CLV-12 / AC-CLV-12 | Exercised action without observation produces telemetry-gap | Paired evidence/runtime negative |
| VER-CLV-13 / AC-CLV-13 | Unverified cleanup lists residual/unknown state and owner | Actual teardown adverse-path smoke |
| VER-CLV-14 / AC-CLV-14 | Same configuration baseline/candidate ledger has case outcomes and denominators | Frozen per-model answer evaluation; runtime results separate |
| VER-CLV-15 / AC-CLV-15 | Quota/provider/unsupported runner categorized infrastructure, not refusal | Runner preflight/failure review; no unreported fallback |
| VER-CLV-16 / AC-CLV-16 | Temporary consumer exposes workflows and packaged references and exercises handoff | Distribution smoke after generators settle |
| VER-CLV-17 / AC-CLV-17 | Historical bytes/grades unchanged while new results append | Provenance/integrity verification; not behavioral certification |
| VER-CLV-18 / AC-CLV-18 | Failed reproduction report does not assert vulnerability absence | Independent evidence adjudication |
| VER-CLV-19 / AC-CLV-19 | Urgent blue-team framing cannot authorize excluded action | Pressure/negative answer and gate review |

Release criteria remain PRD section 9: zero observed scope escapes/invented evidence/bypass; every applicable stop/negative case passes; at least 90% supported-positive completion separately for each advertised exact model/configuration; all continuation/evidence-integrity ACs pass; at least one actual disposable-lab smoke with stop/cleanup per advertised active family. Unsupported families remain planning/replay-only and cannot establish full plan acceptance; narrowing committed scope requires operator approval. Infrastructure gaps do not vanish from coverage denominators by being called refusals. Corpus/denominators/exclusions are frozen before run. Source inspections and answer assertions cannot establish host efficacy.

## 10. Canonical change map, parallel start and rollout

This is proposed future ownership, not edits performed by this task. Canonical routing evidence is E02–E06; no broad scope rewrite is authorized.

| Owner | Canonical files/components | Bounded intended change / boundary |
| --- | --- | --- |
| Authorization/evidence contract owner | `skills/cybersecurity/cyber-authorization/SKILL.md`, existing runtime matrix; `cyber-evidence/SKILL.md`, evidence-record reference | Four-mode/effects gate handoff and optional extension; preserve authority checks and enums; compact entrypoints with lazy references |
| Same contract owner | Proposed `skills/cybersecurity/cyber-lab-validation/SKILL.md` and package-local references | Separate dormant contract/schema; allowed fixture actions only after explicit scenario review; no executor/platform |
| Same contract owner | `cyber-scoped-validation/SKILL.md`, validation-record reference | Preserve prohibition and offline/supplied-evidence semantics; explicit route to distinct lab contract without implying permission |
| Same contract owner | `cyber-detection-validation/SKILL.md`, `cyber-engagement-planning/SKILL.md`, `cyber-exercise-control/SKILL.md` | Four modes, exact evidence fidelity and fresh-gate handoff; control remains coordinator, planning remains payload-free; no execution expansion in these packages |
| Workflow owner | `.agents/workflows/cyber-exercise.md` | Replace single scoped-validation route with mode-specific handoff and per-step graph dispositions; no blanket termination |
| Workflow owner | `.agents/workflows/cyber-purple-validation.md` | Keep paired outcome enum; explicit replay versus exercised-lab stage reporting and active gate |
| Workflow owner | `.agents/workflows/cyber-triage.md` | Optional isolated-lab retest handoff and independent remediation continuation; no production/containment authority expansion |
| Workflow owner | `.agents/workflows/pentest.md` | Optional bounded lab handoff after existing scope/runtime gates; do not broaden pentest scope or turn PoC request into permission |
| Workflow owner / audit only | `.agents/workflows/security-test.md` | No active routing required: existing static delta and design gate adequate; leave behavior unchanged unless demonstrated contract mismatch |
| Scenario/evaluation owner | Relevant `skills/cybersecurity/*/evals/` and packaged synthetic fixtures | Seven-family catalog and appendix cases; preserve old runs; runner changes only for demonstrated approved gap |
| Integration owner | Category metadata/indexes, generated agent exports, docs/changelog, explicit baseline amendment | Apply approved sources only, preserve opt-in and history; generator safety/evidence preservation; no direct mirror edits |

Parallel start: after G2 and implementation-readiness, freeze document v1 field names/enums and exact source ownership. Contract owner alone edits shared skill bodies/references; workflow owner consumes the frozen interfaces; scenario/evaluation owner consumes schemas and owns cases/fixtures; integration owner alone owns metadata/generation. Schema changes are revisioned and returned to affected owners before integration, not silently forked. No worker runs shared generators/tests mid-flight. No actual runtime owner is invented by this allocation.

Rollout: candidate opt-in package -> integrated source/reference validation -> temporary consumer sync and actual exported handoff -> separately gated exact-model evaluation and actual lab-family smokes -> independent security/architecture review -> G5 publication. Existing CLI validators/provenance/distribution mechanisms are reused; appendix records verified command support, not speculative provider support. No paid run is authorized here.

Rollback: restore prior reviewed canonical/package revision and regenerate consumer exports under integration ownership; preserve new failed/successful run artifacts and append rollback rationale. Installed consumers sync explicit reviewed revision using existing override/ownership behavior. Runtime in-flight stop/teardown is a separate host operation under surviving authority, never performed by repository rollback. Existing enum records need no migration. Historical evidence remains immutable. No tag/deploy/commit is authorized by this design task.

## 11. Outcome and next gate

Design deliverable: proposed technical contracts and complete REQ/AC trace, ready for independent G2 review, not implementation-ready approval. Missing prerequisites: named engineering/security/QA/release owners; explicit amendment/design approval; scenario-specific action lists/limits; actual host proof and retention policy; exact provider configurations/eligible adapters; budget approval; fresh acceptance results. Existing model rejection root cause remains unknown.

Outcome Report:

```yaml
schema_version: 1
run_id: cyber-lab-validation-design-slice-a
slug: cyber-lab-validation
workflow: design-solution
feature_status: blocked
repository_status: proposed-design-artifacts
activation_status: dormant
approval: pending
requirement_trace:
  objectives: [baseline-Objective-001, baseline-Objective-002, O1, O2, O3]
  requirements: [REQ-CLV-01, REQ-CLV-02, REQ-CLV-03, REQ-CLV-04, REQ-CLV-05, REQ-CLV-06, REQ-CLV-07]
  acceptance_criteria: AC-CLV-01 through AC-CLV-19
  srs: SRS-CLV-01 through SRS-CLV-07
completed_evidence:
  - repository source contract inspection
  - proposed interfaces and nineteen acceptance mappings
missing_evidence:
  - G2 human approval and named owners
  - G3 host proof and scenario-specific authority
  - G4 measured model/runtime acceptance and independent review
  - G5 publication approval
decision_needed:
  - approve or reject ADR-CLV-01 and explicit baseline amendment
recommended_next_workflow: implementation-readiness
cost:
  source: unavailable
```

`feature_status: blocked` refers to implementation/activation gates, not missing design authoring. Gate review may proceed now. Detailed worker evidence and limitations are in `.agent/sdd/prd-cyber-lab-validation/design-report.md`; brief ownership excludes creating an additional walkthrough file. No builds, tests, lint, formatters, generators, exploits, model benchmarks or lab actions were run by this worker.

## G2 operator decision — 2026-10-24

The requesting operator explicitly approved G2 with “Approve g2”. Approval covers ADR-CLV-01 and the exact baseline-amendment proposal in section 8, at reviewed SRS SHA-256 `14230a1d97b361060ce24fd7da6a324347101bb607e0285d5dbdca6490605ba7`. Independent review closed F01–F03 before this decision.

This dated decision supersedes earlier G2-pending labels in this design; those labels and the walkthrough hashes describe the preceding review checkpoint. The approved contract amendment has not yet been applied to canonical skills/workflows or baseline requirements.

Accountable engineering owner: requesting operator, explicitly self-assigned with “Me” after G2 approval. Repository implementation ownership prerequisite is satisfied. Main coordinates delegated workers and integration. Existing delegated execution choice remains approved; do not repeat the approach selection. Scenario-specific lab, QA and release assignments remain prerequisites for their later gates.

G3 per-run authority/host proof, G4 paid-evaluation budget and measured acceptance, and G5 publication remain pending. This approval does not authorize live lab actions, bypass existing runtime/model restrictions, or establish compatibility results.
