# Fleet-wide Harness Improvement for Paseo and Oh My Pi

Date: 2026-10-25
Slug: fleet-harness-improvement
Profile: technical; lane: direction
Direction approval: approved by requesting operator in conversation on 2026-10-25, including all projects across machines.
Detailed requirements: initially drafted for technical design; full implementation was subsequently authorized by the requesting operator on 2026-10-25. Production activation and human release approval remain separate gates.
SNC: S=2 N=2 C=2 total=6 tier=high (proposed cross-host execution and trust boundaries).
Repository status: full-scope implementation source and parent-reported local verification are recorded below. Activation status: not activated; external acceptance and authorized human release approval remain pending.

## 1. Outcome and scope

OBJ-001: Make harness improvement available across all of the operator's projects and machines through Paseo and OMP, without requiring a separate implementation per repository.
OBJ-002: Improve measured task outcomes through executed baseline/candidate comparisons, while retaining baseline when improvement is unproven.
OBJ-003: Preserve account, project, credential, permission, and data boundaries during execution and learning.

The product is fleet-wide. A limited canary is a rollout stage, never the final scope. Support all projects; activate only enrolled, authorized, compatible project/host pairs. Unsupported pairs must remain visible with reasons rather than silently disappearing from coverage.

In scope: inventory and enrollment; stable identities; local isolated execution; experiments; budget and lifecycle controls; scoped evidence and learning; independent evaluation; versioned promotion and rollback; fleet status.
Excluded: automatic permission escalation; cross-client raw-data pooling; replay of live external side effects; changing model weights; automatic approval of candidate releases; automatic spending or deployment from this brief.
A custom Paseo UI/plugin is not required: initial operator workflows may use existing interfaces plus machine-readable reports. A dedicated UI is not a committed deliverable.

## 2. Evidence and assumptions

- Confirmed: Harness² supports proposal/probe/composition, persistent domain lessons, OpenCode and Codex substrates. Source: https://github.com/google-research/harness2/tree/1cfe254e8d25b15f37048c3730134686abe60335
- Confirmed: upstream selection excludes baseline from final selection; adoption is not proof of improvement. Source: harness2/core/selection.py at that revision.
- Confirmed: Paseo exposes host/workspace/agent operations; worktrees are not host security isolation. Sources: https://paseo.sh/docs/sdk/reference.md and https://paseo.sh/docs/security.md
- Confirmed: OMP exposes SDK/RPC and configurable harness surfaces; isolation needs more than separate SDK sessions. Sources: https://github.com/can1357/oh-my-pi/blob/main/docs/sdk.md and docs/rpc.md (moving upstream main).
- Confirmed session observation: list_hosts returned the calling host and no registered destination hosts. Other machines' existence or readiness is not disproved.
- Confirmed smoke: pinned Harness² credential-free demo, Python 3.13, k=1, both modes: 2 tasks, 0 failures, 14 executions, 16 deterministic editor calls. This proves demo plumbing, not model gains or integration compatibility.
- Confirmed: Paseo HostSummary at pinned revision 72e3316f4f5dfe775c77dbf998968c92e2de9019 ([`packages/protocol/src/hosts.ts`](https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/protocol/src/hosts.ts) and [`packages/cli/src/commands/host/index.ts`](https://github.com/getpaseo/paseo/blob/72e3316f4f5dfe775c77dbf998968c92e2de9019/packages/cli/src/commands/host/index.ts)) exposes registrationId, nullable serverId, label and status, but no connection routing endpoint. Current CLI can enumerate origin projects and remote summaries, but cannot route remote project listings without the SDK route.
- Assumed: the requesting operator is product sponsor and human release approver; account-specific owners retain their authorization authority.
- Unknown: complete project/host inventory, approved data-sharing domains, installed runtime versions, compatible isolation mechanisms, authorized model budgets, and implementation repository ownership.

## 3. Actors and canonical rules

Fleet operator enrolls projects, reviews fleet status, and pauses experiments. Project/account owner authorizes providers and data use. Experiment coordinator dispatches within those constraints. Local runner executes bounded jobs. Independent evaluator validates results. Human release approver authorizes promotion; agents cannot supply this approval.

POL-001 Authorization: discovery is read-only and never implies enrollment, data transfer, provider eligibility, spending, or execution permission. No cross-account fallback outside approved eligibility.
POL-002 Data scope: raw source, transcripts, and credentials remain local by default. Export requires explicit permitted fields and destination authorization; sanitization alone does not grant authorization.
POL-003 Candidate scope: candidates cannot change evaluator rules, credentials, approval policy, provider eligibility, budget enforcement, or promotion controls.
POL-004 Learning scope: four guidance scopes—project, account/domain, stack/task-family, and fleet-general—are distinct. Host runtime and manifest records are separate durable runtime authority, not guidance-learning data or historical doctor-derived capability. Project evidence is not automatically generalized or shared.
POL-005 Promotion: baseline remains selectable; candidate activation needs independent evaluation and human approval. New versions apply to new sessions; running sessions retain their resolved harness.
POL-006 No duplicate unsafe execution: uncertain remote state is not a retry authorization. Reconcile or fence prior work before redispatch.

Dispatch decision table (proposed fail-closed behavior):

| Enrolled | Authorized provider/data | Compatible reachable host | Budget reserved | Result |
| --- | --- | --- | --- | --- |
| No | Any | Any | Any | Reject: not enrolled |
| Yes | No/unknown | Any | Any | Reject: authorization |
| Yes | Yes | No/unknown | Any | Wait or reject with host reason; do not weaken isolation |
| Yes | Yes | Yes | No/unknown | Reject: budget |
| Yes | Yes | Yes | Yes | Eligible for dispatch, subject to unique execution ownership |

## 4. Capability and requirement registry

All requirements retain the approved in-scope P0 baseline. Product accountability: requesting operator. Listed engineering roles are proposed ownership boundaries, not assigned people. Independent QA verifies each acceptance criterion.

| Requirement | Capability / observable requirement | Engineering owner | Objective |
| --- | --- | --- | --- |
| REQ-001 | Discover and explicitly enroll project/host pairs; report unreachable or unsupported entries | Inventory/policy owner | OBJ-001,003 |
| REQ-002 | Identify a logical project independently of checkout paths; identify every execution by project, host, source, harness, runtime and evaluator revisions | Inventory/policy owner | OBJ-001,002 |
| REQ-003 | Run candidates through fresh OMP processes in independently bounded local environments; preserve ordinary sessions | Local-runner owner | OBJ-001,003 |
| REQ-004 | Compare baseline and candidates on replayable tasks with fixed configuration; keep normal work on approved harness without automatic probe multiplication | Experiment owner | OBJ-002 |
| REQ-005 | Enforce authorized run/project/account/host/fleet limits, cancellation and deadlines, including coordinator loss | Experiment owner | OBJ-003 |
| REQ-006 | Reconcile interrupted runs with unique ownership; preserve failed, cancelled and unknown outcomes | Local-runner owner | OBJ-001,003 |
| REQ-007 | Capture provenance and permitted evidence locally; export only authorized metadata; separate scopes per POL-004 | Evidence owner | OBJ-002,003 |
| REQ-008 | Evaluate frozen candidates on held-out tasks and representative projects; reject critical regressions, invalid evidence and boundary violations | Evaluation owner | OBJ-002,003 |
| REQ-009 | Publish approved versioned harnesses with compatibility and per-project pins; canary, withdraw and roll back without overwriting local policy | Release owner | OBJ-001,003 |
| REQ-010 | Report coverage, effective versions, experiments, failures, policy rejections, resource usage and rollout status across hosts | Experiment owner | OBJ-001,002,003 |
| REQ-011 | Provide one-time per-user/per-host global harness configuration and read-only Paseo fleet discovery across all local and remote projects without per-repository setup or cwd dotenv leakage | CLI/integration owner | OBJ-001,003 |

## 5. Stories and atomic acceptance criteria

US-001 (REQ-001,002,010): As fleet operator, I want a unified project/host inventory so that every project is accounted for without accidental activation.
US-002 (REQ-003,004,005,006): As project owner, I want bounded reproducible experiments so that improvement work cannot disrupt ordinary work or duplicate unsafe execution.
US-003 (REQ-007,008): As evaluation owner, I want scoped evidence and held-out comparisons so that lessons are supported without leaking project information.
US-004 (REQ-009): As release approver, I want pinned and reversible harness releases so that improvements can be deployed across eligible projects safely.
US-005 (REQ-011): As fleet operator, I want one-time per-user/per-host machine configuration and read-only fleet inventory discovery so that all projects across reachable machines are visible without per-repository configuration, while strictly retaining external runtime boundaries.
Stories span multiple independently verifiable delivery slices; individual implementation tickets must retain the linked ACs. These are fleet-service scenarios, not mobile/web presentation stories.

| AC | Requirement | Given / When / Then |
| --- | --- | --- |
| AC-001 | REQ-001 | Given a discovered but unenrolled project, when an experiment is requested, then dispatch is rejected as not enrolled. |
| AC-002 | REQ-001 | Given an unreachable enrolled host, when coverage is reported, then its projects remain visible with unreachable status. |
| AC-003 | REQ-002 | Given two explicitly mapped checkouts of one project on different hosts, when results are recorded, then both reference the same logical project identity. |
| AC-004 | REQ-002 | Given a completed attempt, when its manifest is inspected, then the exact resolved execution inputs and revisions are identifiable. |
| AC-005 | REQ-003 | Given a candidate attempting access outside its permitted workspace, when executed, then the runtime boundary denies that access. |
| AC-006 | REQ-003 | Given an active ordinary session, when a candidate experiment starts, then that session's resolved harness remains unchanged. |
| AC-007 | REQ-004 | Given an ordinary task with no experiment authorization, when it runs, then no candidate probe runs are spawned. |
| AC-008 | REQ-004 | Given a task requiring a live external side effect, when replay is requested without an isolated substitute, then experiment admission rejects the task. |
| AC-009 | REQ-005 | Given an ineligible provider/account combination, when dispatch is attempted, then no model request is sent to that provider. |
| AC-010 | REQ-005 | Given no reservable authorized budget, when dispatch is attempted, then the experiment is rejected before execution. |
| AC-011 | REQ-005 | Given coordinator loss during a run, when its local authorized deadline expires, then the runner terminates the bounded workload. |
| AC-012 | REQ-006 | Given an unknown remote attempt state, when its lease expires, then a second attempt is not started before safe reconciliation or fencing. |
| AC-013 | REQ-006 | Given missing completion evidence, when results are aggregated, then the attempt is not reported as successful. |
| AC-014 | REQ-007 | Given project-local evidence, when a central report is emitted, then fields outside the authorized export schema are absent. |
| AC-015 | REQ-007 | Given a project-specific lesson, when another project resolves its harness, then that lesson is not included without explicit scoped promotion. |
| AC-016 | REQ-008 | Given an inconclusive candidate comparison, when promotion eligibility is evaluated, then the baseline remains active. |
| AC-017 | REQ-008 | Given a candidate with a critical regression on one required project, when aggregate results improve, then promotion is still rejected. |
| AC-018 | REQ-008 | Given frozen held-out evaluation, when a task completes, then its feedback is not added to the candidate's learning inputs during that evaluation. |
| AC-019 | REQ-009 | Given evaluation success without human release approval, when activation is requested, then the candidate remains inactive. |
| AC-020 | REQ-009 | Given an approved release incompatible with one host, when rollout occurs, then that host retains its prior approved compatible version. |
| AC-021 | REQ-009 | Given a rolled-out version, when rollback is approved, then new sessions resolve the previous approved version. |
| AC-022 | REQ-009 | Given a project-local policy, when a shared harness is updated, then the local policy is not overwritten. |
| AC-023 | REQ-010 | Given two projects on two enrolled machines, when their authorized canary experiments complete, then one fleet report identifies each outcome and effective harness revision. |
| AC-024 | REQ-005 | Given candidate edits to an immutable control under POL-003, when the candidate is admitted, then it is rejected. |
| AC-025 | REQ-011 | Given a valid absolute Paseo command and optional origin/state-dir, when harness setup is run, then configuration and digest-based ownership receipt are created with private permissions (0700 dir, 0600 file) and machine-readable JSON output. |
| AC-026 | REQ-011 | Given an existing identical configuration and valid receipt, when harness setup is re-run, then setup succeeds idempotently with created: false and exit code 0 without modifying files. |
| AC-027 | REQ-011 | Given an unconfigured harness state, when harness status or discover is executed, then a non-zero exit code and structured JSON output are emitted without creating state directories. |
| AC-028 | REQ-011 | Given a configured harness, when harness discover is run, then read-only project and host enumeration across reachable Paseo targets is performed with no cwd dotenv influence or project .skillsrc modification; incomplete or unreachable targets yield complete: false and non-zero exit code. |
| AC-029 | REQ-011 | Given an owned unchanged harness configuration and matching receipt digest, when harness uninstall is run, then only owned configuration and receipt files are removed without recursive directory deletion. |
| AC-030 | REQ-011 | Given corrupted, tampered, or symlinked state/config, when harness setup, discover, or uninstall is run, then the operation fails closed with a non-zero exit code and sanitized error. |

## 6. Lifecycle and measurement

Proposed attempt states: queued -> admitted -> running -> completed/failed/cancelled. Lost contact enters unknown, not completed; reconciliation determines subsequent state. Cancellation requested and cancellation confirmed must be distinguishable. Retry is a new linked attempt, not overwriting evidence.

Candidate lifecycle: proposed -> evaluated -> eligible/rejected -> human-approved -> canary -> active/withdrawn. Eligibility is not approval. Withdrawal blocks new activation; rollback selects a known approved compatible version.

Measure task correctness, critical regressions, execution cost where observable, elapsed time, cancellations, policy rejections, incomplete evidence, coverage, and effective version distribution. Missing usage is unknown, never zero. Preserve baseline and failed attempts in denominators; separate invalid evaluations from valid incorrect outputs.

Canary completion target: by the end of the authorized canary, all ACs are exercised, including AC-023 on at least two projects and two machines. This is a release-relative gate, not a delivery-date commitment. Quality and cost thresholds must be precommitted by the evaluation owner/operator before model-backed trials; no numerical gain is claimed from upstream results.

## 7. Delivery slices and verification

| Slice | Requirements | Proposed owner | Size / confidence | Dependencies | Verification lane |
| --- | --- | --- | --- | --- | --- |
| A Inventory and authorization | 001,002 | Inventory/policy | M / medium | Approved identity and eligibility contracts | Enrollment and cross-domain denial scenarios |
| B Local OMP execution | 003,006 | Local-runner | L / low | Approved runtime containment and lifecycle contracts | Real isolated OMP execution, disconnection and descendant termination |
| C Experiments and budgets | 004,005,010 | Experiment | L / low | A/B interfaces; enforceable usage/deadline contract | Baseline/probe runs, reservation exhaustion, cancellation |
| D Evidence and evaluation | 007,008 | Evidence/evaluation, separate implementation owners | L / medium | Manifest and data-scope contracts | Export denial, held-out isolation, per-project regression gates |
| E Releases and rollback | 009 | Release | M / medium | A/D interfaces | Pin, canary, incompatible-host skip, rollback |
| F Fleet integration | all | Integration owner + independent QA | L / low | A-E | Two-project/two-host end-to-end acceptance |
| G Global CLI setup and read-only discovery | 011 | CLI/integration | S / high | Shared Setup/Discovery contracts | Unit/behavioral tests with throwaway state, no cwd dotenv leakage |

Sizes are relative scope estimates, not durations or costs. The original dependency and topology notes above are planning history. Subsequent approved implementation selected the `agent-skills-standard` CLI/runtime with one-time machine-global user/host configuration and the fleet coordinator/SDK routes. Live deployment, host enrollment, and multi-machine qualification remain external gates.

Accountability: operator is accountable for scope, spend and human release decisions; planning orchestrator owns requirement trace; architect owns shared contracts; component owners implement their slice; independent QA and security reviewers verify behavior and trust boundaries. No agent may supply human approval. Dedicated frontend/mobile roles are not required for the initial interface choice.

## 8. Technical-design gates and risks

| Gate / risk | Owner | Required resolution | Blocks |
| --- | --- | --- | --- |
| Implementation placement | Operator + architect (resolved) | Subsequent approved implementation selected the `agent-skills-standard` CLI/runtime with one-time machine-global configuration | Live deployment and external acceptance |
| Runtime containment | Architect + independent security reviewer | Prove filesystem/network/credential/process boundaries on target OSes | Live candidate execution |
| Provider billing semantics | Experiment owner + operator | Define reservations, observable usage and safe behavior where hard monetary caps are unavailable | Paid experiments |
| Domain and export policy | Account/project owners | Authorize enrolled projects, eligible accounts, export destinations and retention/deletion policy | Affected data movement and enrollment |
| Fleet reachability | Fleet operator | Register/connect a second authorized machine and verify versions/capabilities | Multi-host acceptance |
| Promotion quality | Evaluation owner + operator | Precommit task sets, critical regressions, cost/latency thresholds and release authority | Promotion |


### Implementation status and runtime gates
- **Core Fleet Architecture & Integration Contracts (source implemented; acceptance incomplete)**: Source for REQ-001 through REQ-011 is present under `cli/src/services/harness/runtime/` and `cli/src/commands/`:
  - `RuntimeStore`: Atomic file transactions, private 0700/0600 storage, exclusive locking, bounded file size/count limits.
  - `FleetPolicyService`: Segment-boundary path matching, domain isolation, account eligibility verification.
  - `FleetLedger`: Immutable attempt reservations, random execution tokens, campaign budget epochs, strict fencing.
  - `LocalSupervisor`, `SandboxRunner`, `OmpSdkExecutor`: Detached local supervisor lifecycle, bounded Docker sandbox contracts, restricted OMP Bun SDK sessions with single custom tool.
  - `EvidenceService` & `ReleaseService`: Immutable execution records, frozen heldout plans, external Ed25519 human approval verification, nonces, pin generations, and canary/withdraw lifecycle.
  - `FleetRemoteDispatcher` & `remoteWorkerProtocol`: SDK-routed Paseo terminal worker execution, base64 signed requests/receipts, machine-purpose validation.
  - `FleetCoordinator`: Central preflight health checks (`doctor`), status reporting, task planning, and bounded execution dispatch.
  - `IntegrationService` & `FleetCommand`: Machine-global Paseo OMP launch integration with strict schema validation of the touched v0.13 families, per-target owned wrappers that preserve each original binary and prefix arguments, actual installed-version binding, an exclusive mutation lock plus journaled crash recovery, commit-boundary CAS, verified ownership of every artifact and backup, user-edit refusal, POSIX `exec` stream/signal/exit preservation, session-stable guidance caching, and the complete CLI command suite (`configure`, `doctor`, `status`, `run`, `cancel`, `reconcile`, `evaluate`, `release`, `integration`, `context`, `worker`).
  - Integration acceptance boundary: local behavior is exercised in temporary state with synthetic targets. A real user-home installation, Paseo daemon reload, and a resulting OMP session remain explicit operator acceptance steps; install results report `saved` separately from `daemonReloadRequired`.
- **Pending External Runtime Acceptance Gates**:
  1. **Docker Containment**: Implemented fail-closed in `SandboxRunner.ts`. Real container execution requires an active host Docker daemon.
  2. **Physical Cross-Host Execution**: Remote worker terminal dispatch is implemented via `@getpaseo/client` and signed receipts. Full live multi-machine acceptance requires registered destination hosts on the Paseo daemon.
  3. **Human Release Approval**: Promotion requires externally signed approvals. No private human signing keys or self-approval shortcuts are implemented in the CLI.
  4. **Global OMP Install and Session**: The integration installer, wrapper, and loader are implemented and behavior-tested in temporary state. No global install, daemon reload, or real OMP session was performed for this checkpoint.
  5. **Full PRD Acceptance**: All criteria AC-001 through AC-030 are retained unchanged. Unit and synthetic integration tests exist for owned behavior; live production acceptance remains gated on external infrastructure.


#### Final source and verification status — parent-reported, 2026-10-25

The full fleet implementation is authorized and source-complete across the approved scope; this does not mean every acceptance criterion is satisfied. Requirements REQ-001 through REQ-011 and AC-001 through AC-030 remain intact. The runtime includes local runner, coordinator, SDK-routed worker dispatch, scoped evidence/evaluation, release controls, machine-global runtime pinning, and global OMP launch integration. The original one-time setup/discovery-only planning state and ADR-018's inventory-only limitations are historical and are superseded for current scope by ADR-019 and the later approved full implementation. The legacy diagnostic discovery backend remains diagnostic and does not supply SDK-authoritative workspace associations or authorization.

- **Post-format local gates, reported by the parent:** focused Integration/CLI `98/98`; coordinator/dispatcher/protocol `91/91`; runtime runner `55/55`; ReleaseService `30/30`; final full CLI `1808/1808` across 84 files. Production CLI build passed (93 main and 138 worker modules); Prettier and scoped ESLint passed. `validate:all` passed `333/333` with 55 skill-description warnings; `docs:capabilities:check` passed.
- **TypeScript and build qualifications:** the full typecheck exits 2 with 19 exact inherited diagnostics and zero introduced diagnostics, so it is not a clean typecheck. Vite's native-loader ESM/CommonJS configuration warning and `inlineDynamicImports` deprecation remain unsuppressed. The expanded deterministic OSS delta scan covered 60 public changed files: Semgrep scanned 46 TypeScript files with zero findings/errors (exit 0); Gitleaks returned one finding (exit 1), independently triaged as an unchanged educational-placeholder entry in historical changelog text, with no confirmed credential in the scanned findings. The raw Gitleaks exit remains 1; no suppression or allowlist was added. Corrective remote GitHub CI has not run.
- **Built smoke scope:** generated-loader Node/Bun cross-runtime layouts, package/runtime integrity checks, temporary-state global integration and restoration, setup acceptance cases, and status accounting passed as reported. The packaged OMP SDK 18.12.6 health smoke used Bun 1.3.14 and one synthetic `sandbox_exec` with zero model tokens; the separate Paseo client 0.13 is used for routing. These checks do not prove Docker-engine containment, real OMP sessions, user-global install/reload, two-host execution, paid evaluation efficacy, or human release approval; AC-023 and complete AC-001–030 acceptance remain open. Live Paseo membership lookup was explicitly denied and not retried.

- **Outstanding findings:** production dependency audit remains **FAIL: 2 HIGH** for baseline `body-parser@2.3.0` and `multer@2.4.0` at `7fe39ca4`; no remediation or overall security pass is claimed. The unrelated product-evidence suite remains `84/85`, with an expected-exit mismatch (actual exit 2); its cause is unproven and it was not rerun.

1. Source code implementation exists across all owned components in `agent-skills-standard`.
2. Automated suites cover store transactions, policy boundaries, budget epochs, CAS integration, and worker markers at the slice level; the SRS walkthrough records exactly which results were exercised versus reported by the parent gate.
3. Gated acceptance: run live Docker and SDK preflight checks when the host runtime environment is available.
4. Future promotion: verify externally signed release approvals before activating candidate bundles across cohorts.

## Change log

2026-10-25: Recorded approved fleet-wide direction after explicit correction that a single-project pilot is not the product scope. Added requirements, atomic ACs, ownership boundaries, design gates and multi-host acceptance. No prior harness PRD/BRD/SRS matched the scoped filename search.
2026-10-25: Added REQ-011, US-005, and AC-025 through AC-030 for one-time global per-user/per-host harness setup and read-only fleet inventory discovery slice (ags harness). Retained existing runtime ACs (AC-001 to AC-024) and execution gates as explicit and unimplemented.
2026-10-25: Added evidence boundary from pinned Paseo 72e3316f4f5dfe775c77dbf998968c92e2de9019 (packages/protocol/src/hosts.ts, packages/cli/src/commands/host/index.ts) confirming HostSummary lacks connection routing; noted origin project enumeration and registered remote summaries with remote routing unsupported (REMOTE_ROUTING_UNAVAILABLE, complete: false); preserved AC-028 cross-host target as pending/not fully met and retained all prior runtime requirements unimplemented.
2026-10-25: Completed implementation of fleet orchestration contracts (REQ-001 through REQ-011) including FleetCoordinator, FleetPolicyService, FleetLedger, EvidenceService, ReleaseService, FleetRemoteDispatcher, IntegrationService, and FleetCommand CLI. Added CAS-based global OMP launcher integration with per-target wrapper preservation, version binding, journaled recovery, verified artifact/backup ownership, session-stable guidance, and user-edit protection. All ACs AC-001 through AC-030 preserved with live Docker, multi-machine, and real global-install acceptance pending external infrastructure.
