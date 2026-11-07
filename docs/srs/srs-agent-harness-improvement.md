# Technical Design (SRS/FRS): Agent Harness Assurance Baseline

slug: agent-harness-improvement
operator_profile: technical; lane: direction; snc_tier: high; delivery_mode: extended
source_approval: approved(requesting operator, 2026-11-06)
plan_approval: approved(requesting operator, 2026-11-06)
design_approval: approved(requesting operator, 2026-11-06)
execution_approach: not_selected
repository_status: design_artifacts_only; activation_status: not_required
owner: requesting operator; technical handoff owner: baseline integration owner

## Decision Brief

- **Change since approved PRD:** Resolve evidence placement, compatibility limits, correlation and safe execution preparation for the assurance baseline only. No runtime API, authorization implementation, capability registry entry, policy configuration or persistent telemetry service changes.
- **Decision:** Use existing bounded task/review artifacts and progress receipts. Keep Paseo/OMP boundary observations as evidence-qualified narrative records, not native qualification claims: neither is a registered qualifier host. Collect permitted usage with the existing explicit-manifest SessionJournal; do not convert it into eval taskUsage or infer automatic correlation.
- **Impact if wrong:** A fabricated host alias or conflated usage format could certify nonexistent enforcement or savings. Unknowns and actual-boundary provenance must remain visible.
- **Evidence:** confirmed(scripts/harness-smoke/qualification.ts; cli/src/capabilities/agentCapabilities.ts; cli/src/constants/enums.ts; mcp/src/services/SessionJournal.ts; skills/common/common-subagent-driven-development/references/progress-receipts.md). Source contracts were inspected; no live control/lifecycle/usage scenario was executed in design.
- **Open runtime prerequisites:** Operator-authenticated authority, supported pre-effect denial interface, live task limits and permitted usage sources. These block C/D execution, not the completed technical specification or safe A/B preparation. If the interface is unavailable, C records unverified controls; D remains incomplete until a real authorized lifecycle walkthrough occurs.
- **Approval recorded:** Requesting operator approved this technical design and progression to implementation-readiness with “ok” on 2026-11-06. This does not select an execution approach or authorize live probes, spending, installation, source implementation, merge or activation.
- **Ready independently:** A/B evidence preparation and design review under read-only scope. C/D require the separate prerequisites in the readiness section. E can integrate partial findings but cannot declare the baseline complete without PRD-required proof and human disposition.

## Trace Source And Revision

Authoritative original intent, primary sources, objective and scope owner: [approved BRD](../brd/brd-agent-harness-improvement.md), operator-approved 2026-11-06. Approved BRD preimage SHA-256: `895af9eb1339ee3b32a687154013adab0c642c59caa939ee0c959677fd15be6a` (frozen at [preimage/brd.md](../../artifacts/agent-harness-improvement/trace-repair-20261107/preimage/brd.md)).

Authoritative delivery detail: [PRD](../prd/prd-agent-harness-improvement.md), delivered content SHA-256 before approval annotation `b7574367a83f0e7a1581e8ad69e54f236aeaf1406bc93d2ddd4030c18031f2c2`; approval annotated SHA-256 `62e784bf8b02be5e58f8e695ece45dbd939c3521526ab59ef0591c8ef29bd868` (frozen at [preimage/prd.md](../../artifacts/agent-harness-improvement/trace-repair-20261107/preimage/prd.md)). The operator's latest “ok” approves that delivered plan and progression to design. These digests bind preimage bytes, not authenticated approval; authority comes from the conversation.

Trace links follow promoted formal declarations: BRD-OBJ-001 → REQ-001 → AC-001–006 → SRS-001–006. Editorial migration from historical identities is documented in [identity-mapping.md](../../artifacts/agent-harness-improvement/trace-repair-20261107/identity-mapping.md). SRS-001–006 are technical specification IDs. No live activation or empirically validated ROI is inherited.

## Architecture And Contract Delta

### HLD-001: Observe owners; do not insert a new control plane

Audience: runtime maintainers, standards maintainer, independent verifier and requesting operator. Lifecycle: proposed technical design. Scope: PRD packages A–E only.

Dependency direction: host/source evidence → package-owned retained artifacts → independent review → integrated baseline → human disposition. The baseline never writes back policy or grants authority to hosts. Source inspection is synchronous; agent completion is asynchronous and must be correlated explicitly. Retries and cancellation remain runtime-owned, not simulated by local receipts.

| Component | Owner / responsibility | Failure domain |
| --- | --- | --- |
| CMP-001 Evidence integration | Baseline integration owner; source/version/config bindings, aggregate narrative, no shared worker writes | Stale or missing evidence makes affected claim unverified |
| CMP-002 Runtime observation | Runtime evidence owner; six dispatch paths, actual ingress/authority, isolated permitted probes | Unavailable interface or missing authority stops that probe only |
| CMP-003 Task checkpoint | Task owner; existing assignment packet, progress state, retained notification/result | Helper validates declarations/bytes, not runtime cessation or human identity |
| CMP-004 Usage reconciliation | Economics verifier; explicit permitted session manifest and actor/attempt mapping | Missing journal/actor or price yields partial/unavailable economics |
| CMP-005 Independent acceptance | Independent QA/security verifier plus operator final disposition | Missing independence/required walkthrough prevents completion |

REQ-001 → HLD-001 → CMP-001–005. Technical cards below bind LLD and VER references; their verification mappings are authoritative and are not repeated in another matrix. Tables and ordered flows answer the ownership/ordering questions; a new diagram adds no required contract.

### Storage and ownership

Use `artifacts/agent-harness-improvement/<run-id>/` for this baseline's retained, redacted report files; this is an artifact directory, not a database or general ingestion schema. Each authorized run chooses an immutable run ID. Proposed relative outputs:

- A owns `capabilities.md`.
- B owns `dispatch-boundaries.md`.
- C owns `enforcement-observations.md` and its own `traces/` files.
- D owns `task-walkthrough.md`, `actor-accounting.md` and its own task evidence subtree.
- E alone owns `baseline.md`, linking A–D and independent review.
- Independent verifier owns `review.md`; requesting operator's actual acceptance is linked, never synthesized.

No empty placeholder files are created by design. References to those paths are prospective contract locations, not claims of existing artifacts. An SDD helper may publish under its own `.agent/sdd/<plan-slug>/` convention; link those outputs rather than moving or forking their schema. Run records remain under the existing `artifacts/runs/<slug>/` convention.

Each report identifies operation/claim, host and actual ingress, owner, installed version, source revision/config evidence or explicit missing data, observed result and limitations. Retained trace references include SHA-256, relative path, collection time and producer/reviewer. Hash only retained redacted bytes; do not preserve a secret original just to hash it. A source digest proves bytes, not deployment or provenance. Use native source revision where exposed; never substitute an invented commit.

## Technical Requirements

All six cards are Must / Draft pending design approval, and source REQ-001. Failure behavior is part of the contract, not a reduced completion criterion.

### SRS-001: Bind capability evidence to current identity

- **Source:** AC-001; HLD-001; CMP-001; LLD-001.
- **Behavior:** For each capability area, integration receives source/runtime/config references, validates retained paths and identities, and emits the A inventory with explicit implemented/observed/unverified distinctions. Record controlling configuration evidence or the reason it is unavailable. Keep unsupported capability separate from a failed search or missing checkout.
- **Failure/fallback:** Changed runtime/config invalidates only affected current claims; historical observations stay labelled historical. Broken/missing digest reference cannot be silently reused. Missing identity leaves an explicit limitation.
- **NFR/security:** No credentials or private memory in reports; no implicit support promotion from source docs. Seven-area completeness is checked against the PRD inventory, not an invented percentage.
- **Verification VER-001:** Manual version/config/evidence review — `capabilities.md` plus independent `review.md` in the run artifact root.

### SRS-002: Map actual dispatch ingress without host aliases

- **Source:** AC-002; HLD-001; CMP-002; LLD-002.
- **Behavior:** For each of the PRD's six surfaces, record its actual route, existing control reused or explicit no-established-control finding, trust source, owner, known evidence and unverified coverage. Native OMP grants, tool approval and project/account/premium authorization are different claims.
- **Failure/fallback:** Paseo/OMP are not qualifier hosts; do not alias them to codex or claude, add native host IDs or declare supported through an unsupported parser. Record boundary observations manually under this baseline and defer any reusable registry extension to a separate approved scope.
- **NFR/security:** Permission to inspect/read a route does not authorize executing it or accessing another account. Parent grants cannot be inferred to govern CLI, settings updates, schedules or nested workers.
- **Verification VER-002:** Manual ingress/source-boundary review — `dispatch-boundaries.md` and independent `review.md`.

### SRS-003: Require authentic safe-boundary evidence for promotion

- **Source:** AC-003; HLD-001; CMP-002/005; LLD-003.
- **Behavior:** Verifier receives a precise claim and scope, authenticated host authority, reviewed harmless pre-effect probe and fixed expected outcome. Run only if all readiness conditions hold. Retain actual allow and deny observations for each claimed control; include missing/expired or wrong project/account cases only where that control is claimed and a safe interface can exercise it before any paid/protected effect.
- **Failure/fallback:** No boundary or authority → NOT RUN/unverified with owner and missing prerequisite. Failed denial → stop, record observed failure and candidate fix; never invoke a real premium model, cross-client account or protected external action to prove it. Fixtures remain fixtures. A forged `live` field cannot establish authenticity.
- **NFR/security:** No host policy edits, allowlist expansion, disabled approval controls, credential inspection or agent-issued human grant. Unknown deployment-wide enforcement is not falsely described as absent or safe.
- **Verification VER-003:** Separately authorized isolated host conformance scenario — `enforcement-observations.md`, retained redacted trace bytes and independent runtime/security `review.md`.

### SRS-004: Correlate one real lifecycle and independent acceptance

- **Source:** AC-004; HLD-001; CMP-003/005; LLD-004.
- **Behavior:** Before permitted dispatch, task owner freezes assignment scope, task/attempt identifiers, runtime/workspace and independent result oracle. Retain returned native/Paseo IDs and expected notification association. Trace assignment → dispatch → result/notification → collected evidence → independent acceptance. Resume is the same task/scope/authority with a new attempt where applicable, not an unrelated dispatch disguised as recovery.
- **Failure/fallback:** Timeout or cancellation acknowledgement is not completion and does not establish cessation. Preserve running/stop-requested/unknown until supported runtime evidence establishes stopped state; verify owned writers ceased before conflicting resource reuse. Reconcile unknown completion before retrying any effect. If required live walkthrough is unavailable, D and full-slice completion remain incomplete.
- **NFR/security:** Progress helper owner/paused fields are declarations; no authentication or live cancellation is implied. Preserve all attempts. Independent reviewer differs from task implementer; operator final acceptance remains separate.
- **Verification VER-004:** Bounded cross-runtime lifecycle scenario — `task-walkthrough.md`, linked native/checkpoint receipts and independent `review.md`.

### SRS-005: Reconcile usage without incompatible format conversion

- **Source:** AC-005; HLD-001; CMP-004; LLD-005.
- **Behavior:** Economics owner declares expected parent/worker/reviewer/integration/repair actors and actual attempts, then maps only authorized native session IDs/paths to those identities. Existing SessionJournal reads explicit codex/omp sources; task/parent labels and expectedActors express declared correlation. Store redacted aggregate report and unresolved actor/attempt mapping in the D report. Absence of failure/cancellation in a run is not an instruction to generate one.
- **Failure/fallback:** Missing session/usage/actor/price → explicit missing coverage, no monetary savings. Manifest role names differ from eval actor roles; no automatic lossless conversion to taskUsage is assumed. Duplicate session attribution is reconciled before sums; do not add native orchestration totals to leaf usage without demonstrated non-overlap.
- **NFR/security:** Explicit data authority is required before journal extraction. Full raw transcripts are not copied into baseline artifacts. API billed money, estimates, subscription quota, input/cache-write/cache-read/output/reasoning categories and elapsed time remain separate; missing components remain null/unavailable, never zero.
- **Verification VER-005:** Explicit task-cohort accounting reconciliation — `actor-accounting.md`, permitted redacted SessionJournal report and economics `review.md`.

### SRS-006: Publish a qualified disposition, not a self-issued release

- **Source:** AC-006; HLD-001; CMP-001/005; LLD-006.
- **Behavior:** Integration freezes A–D evidence, verifier reviews the exact snapshot, and baseline assigns each issue a reuse/fix-candidate/no-change/defer disposition with owner/consequence. Report per-criterion proof and missing prerequisites. Link actual operator acceptance before marking final human disposition accepted.
- **Failure/fallback:** Conflicting/stale evidence reopens affected claims only. Inconclusive data allows no-build/defer recommendations, not a full build justification. Missing required D proof means partial baseline; unknown C support is an honest finding, not fabricated PASS. Operator may accept a partial report but that does not satisfy missing technical criteria.
- **NFR/security:** No publication/activation side effects and no runtime-source changes required. Record schema-valid, technically verified and human accepted as different states.
- **Verification VER-006:** Independent integration review followed by human disposition — `baseline.md`, `review.md` and linked operator decision.

## LLD Contracts And Functional Flows

### LLD-001/002: Freeze source inputs, then parallelize evidence

One integration session establishes the run root, source/config identities, owned files, canonical PRD AC references and authority limitations. A/B then own disjoint reports and share evidence references, not mutable runtime controls. Their input contract is exact source references plus approved scope; output is retained report bytes with explicit limitations. Inputs that cannot be resolved produce a named gap. Source updates during review create a new revision, not an overwrite certified by an old digest.

No general parser or new schema is proposed for these Markdown reports. The independent verifier checks their semantics. This avoids duplicating the native qualification schema merely to bypass its deliberate host limits.

### LLD-003: Qualification adapter decision

The existing qualifier accepts only registered native host/surface pairs: claude/claude-code-subagents, copilot/copilot-custom-agents, codex/codex-subagents, opencode/opencode-agents, gemini/gemini-cli-subagents. These declarations are not support proofs. A genuine registered-host subclaim can reuse the existing claim/index/trace contract unchanged; a Paseo or OMP integration claim cannot.

Source contract references: `RuntimeEvidence` in `cli/src/capabilities/agentCapabilities.ts`; `ConformanceRecord`, `SupportClaim` and retained-artifact validation in `scripts/harness-smoke/qualification.ts`. Claim JSON names host/surface/version/revision/operation, optional controls, and nonempty repository-relative index paths. Index records bind relative nonescaping retained trace bytes to lowercase SHA-256 and declare evidence layer, live/synthetic executor and observed result. The qualifier requires matching discovery/execution plus denial evidence for required controls. Caller-authored provenance still needs independent source authentication.

Do not use the lighter `delegationStatus` resolver as equivalent: it does not validate retained files or require the same denial/discovery proof. Do not use a lifecycle reducer on mixed-host/version or synthetic records to infer a real stopped/completed state.

For a genuine eligible claim, the recorded-only command is `rtk pnpm harness:smoke --qualification-only --claim PATH`. PATH is supplied only after actual eligible evidence exists. It is NOT used on Paseo/OMP claims and NOT run by design. Missing claim exits 2; qualification can exit 0 while status remains not_verified. The verifier inspects full reported status, provenance, missing evidence and limitations, not exit code alone. No dependency installation or `--write` is needed or authorized here.

### LLD-004: Assignment, order, idempotency and recovery

Reuse `task_brief.py PLAN_FILE TASK_NUMBER --assignment ASSIGNMENT_JSON` only after a real executable task plan and validated assignment exist. The current PRD A–E table is not a parser-compatible Task N plan; execution preparation writes a concrete task plan in the existing SDD artifact workspace, with exactly one Task N section per assignment, required scope/inputs/outputs/real-ingress/verification-owner/correction-route labels, positive/negative invariants and handoff/freeze. This is task preparation, not an implementation of the baseline during design.

Assignment manifest shape and validation remain owned by `task_brief.py`; bind plan SHA-256, workspace, owned literal paths, authority restrictions, ACs, verification command/cwd/expected result, standards revisions, source/dependency digests, output status/stop conditions and declared limits. Helper publication is not approval or sandboxing. Missing/stale prerequisites exit 2; task-selection/output collisions exit 3. Never dispatch after a rejected packet.

Use existing progress commands, where an authorized execution actually needs checkpoint state:

- `rtk proxy python3 skills/common/common-subagent-driven-development/scripts/sdd_progress.py init --state STATE --plan PLAN --workspace WORKSPACE --actions inventory boundaries conformance walkthrough integration --revision REV --dirty-identity ID`
- `rtk proxy python3 skills/common/common-subagent-driven-development/scripts/sdd_progress.py reconcile --state STATE --observation OBSERVATION`
- `rtk proxy python3 skills/common/common-subagent-driven-development/scripts/sdd_progress.py status --state STATE --revision REV --dirty-identity ID --format json`

STATE/PLAN/WORKSPACE/REV/ID are actual execution-preparation values, not invented by this design. Init/reconcile mutate artifacts; status is read-only. Existing version-2 observation fields remain unchanged. Add placement/model/effort/authority/attempt context to the linked task/review report, not a new progress schema field.

Reconciliation accepts unchanged completion replay idempotently; changed evidence, wrong plan/action/revision/dirty identity or escaping paths must not advance progress. Recovered sessions revalidate current source and evidence before resuming. Native notification correlation is maintained in the task report: native agent/session identifier, task label, attempt, workspace, operation, observed timestamp and receipt reference. Unknown fields remain unknown; descriptive labels cannot authenticate owner identity.

**Adverse timeline:** dispatch returns a task ID, parent disconnects, notification is lost, worker may still run. Recovery first queries supported native state, then records observed state and reconciles only consistent evidence. Do not redispatch blindly, mark timeout complete, or assume stopping the parent stopped children. If cessation cannot be established, preserve unknown and do not reuse resources for a conflicting task.

### LLD-005: Usage interfaces and privacy

Reuse `SessionManifest` in `mcp/src/services/SessionJournal.ts`, not a new schema. It carries workspace/time window, explicit selected sessions with format/role/attemptOutcome and optional taskId/parentTaskId, expectedSessionIds/expectedActors and bounded phaseWindows. Supported session formats are codex and omp; this fact does not register OMP as a qualifier host. SessionJournal has no general attemptId field: preserve attempt/session mapping in the existing task report and verify it against native evidence rather than pretending the journal authenticates it.

When separately permitted and an installed executable is available, `ags-mcp-session-report --manifest MANIFEST_JSON --json` reads that manifest; no `--help` option is assumed. The CLI rejects invalid options, requires explicit manifest sources and exits nonzero on errors. This design does not run it or inspect private sessions. `expectedActors` must include the declared cohort before reporting completeness. Record all coverage/missingActors/limitations returned by the report.

The eval `RunMetadata.taskUsage` contract is separate, with parent/worker/review/integration roles, attempt IDs and different token fields. Do not synthesize an eval run to access its savings renderer. Use existing aggregate report plus manual accounting review; no new rate service or journal exporter is part of this slice. No comparison cohort is run under this assurance design, so no causal ROI result can emerge from it.

Retention: retain redacted aggregate evidence with the baseline; sensitive journal source paths/IDs remain in their authorized local native location or access-controlled manifest and are not copied to the shared report. No automatic collection, global session scanning, retrospective extraction, or automatic deletion is introduced. Operator controls retention and later deletion; missing retained proof invalidates the corresponding current claim. Redaction must not remove a needed claim boundary silently: report the resulting limitation.

### LLD-006: Integrate without overwriting evidence

A/B may prepare concurrently; C/D only after their own readiness checks and disjoint-resource authority. E freezes their evidence before independent review. One writer per report, one integration owner for baseline. Revisions preserve prior findings; no runtime policy update occurs as a consequence of a failed scenario. There is no data migration, background service, API rollout or irreversible cutover. Rollback of a documentation mistake is a superseding correction with affected proof invalidated; external effects are not “rolled back” by editing a report.

## Readiness, Security And Failure Boundaries

The design deliberately does not choose an arbitrary budget or credential scope. Before C/D empirical execution, the approved PRD's `validate-product` preflight establishes eligible data, measurement contract, finite exposure, budget and duration; authenticated host/operator authority separately permits the exact actions. No budget, request count or duration is inferred from a helper limits object. Missing bounds block live launch.

| Prerequisite | Owner | Affected work | Required evidence / safe fallback |
| --- | --- | --- | --- |
| Design approval | Requesting operator | Execution readiness | Approved on 2026-11-06 for readiness assessment; does not itself select workers or spend |
| Execution approach | Requesting operator | A–E execution assignments | Subagent-driven recommended; no implied inline exception |
| Actual resource and authority bounds | Operator + runtime verifier | C/D live scenarios | Named workspace/tools/eligible route/data, finite limits and stop rules verified at host boundary; otherwise do not launch |
| Authentic safe pre-effect denial ingress | Runtime/security verifier | C promotion claims | Supported host-owned callable/isolated runtime control, actual no-side-effect proof; otherwise claim stays unverified |
| Authorized task and independent oracle | Task owner + independent QA | D completion | One deterministic non-sensitive task, expected result and independent observation; no mock echo or source-text oracle |
| Permitted native usage access | Operator + economics verifier | D usage | Explicit selected sessions and expected actors; if absent, missing coverage remains explicit |
| Executable local tools | Verification owner | Helper/qualifier use | Existing supported runner and resources; no installation authorized by document |

No absolute sandbox or premium-policy guarantee is claimed. OMP's source-level operator grants are reused where their actual native scope applies; project settings cannot expand those grants, but this does not establish cross-route human premium approval. Safe testing must not remove approvals or alter grant controls. Broad security probing, real wrong-account dispatch, expired production-token replay and premium calls are excluded.

Failure-domain responses are defined in SRS cards. Live control failure stops only its affected scenario; it cannot trigger a new model/account fallback or an automatic fix. No uncontrolled retry of a possibly committed external action. Resource cleanup is limited to agent-owned disposable resources and happens only after evidence capture and writer-cessation verification. Cancellation outcomes and unmeasured in-flight cost remain visible.

## Architecture Decision Record

No ADR is added: no runtime architecture or public contract changes. The local decision is reuse-with-explicit-limits, recorded in HLD-001/LLD-003/005. Extending host IDs, adding a correlation API or creating an authorization service would change contracts and requires a separately approved design/ADR—not a hidden “baseline” prerequisite.

## Status And Handoff

- Design specification: approved(requesting operator, 2026-11-06) for readiness assessment. Assurance criteria and live enforcement remain NOT RUN.
- `feature_status: design_ready` describes specification readiness, not implementation or authorization. C/D execution prerequisites remain scoped blockers; no full-slice completion claim is made.
- Walkthrough/status: [srs-walkthrough-agent-harness-improvement.md](srs-walkthrough-agent-harness-improvement.md).
- Outcome record: [design-20261106.json](../../artifacts/runs/agent-harness-improvement/design-20261106.json).
- Next workflow: `implementation-readiness`, authorized by design approval; preserve technically preparable A/B and gated C/D without treating readiness as a live-launch grant.

## References

- [Approved PRD: canonical requirements and ACs](../prd/prd-agent-harness-improvement.md).
- [Approved BRD and primary-source ledger](../brd/brd-agent-harness-improvement.md).
- [Qualifier](../../scripts/harness-smoke/qualification.ts); [declared capabilities](../../cli/src/capabilities/agentCapabilities.ts); [host IDs](../../cli/src/constants/enums.ts).
- [Task packet implementation](../../skills/common/common-subagent-driven-development/scripts/task_brief.py); [progress receipt contract](../../skills/common/common-subagent-driven-development/references/progress-receipts.md).
- [Journal contracts](../../mcp/src/services/SessionJournal.ts); [journal CLI](../../mcp/src/session-journal-cli.ts); [separate eval usage contract](../../scripts/evals/types.ts).
- [OMP native model grant source, pinned v18.16.0](https://github.com/can1357/oh-my-pi/blob/v18.16.0/packages/coding-agent/src/task/model-approval.ts).
