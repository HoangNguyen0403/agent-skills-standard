# Technical Design: Bounded Executable Validation for Agent Skills

Status: Revision 4 backend amendment approved by requesting maintainer; D1–D4 source implementation authorized; D2/D3 source acceptance and D5 activation remain pending
Slug: skill-system-effectiveness
Revision: 4
Owner: requesting maintainer; engineering integration owner: orchestrator; bounded implementation owners recorded in `.agent/sdd/skill-system-effectiveness/`
Delivery mode: extended
Operator profile: hybrid
SNC: S=2 N=2 C=2 total=6 tier=high

## Decision Brief

**Change:** Add a separately qualified executable-candidate lane before any runtime-efficacy claim. Preserve accepted guidance, historical results, the existing transcript evaluator and the original pilot protocol. Do not rebuild the registry/CLI/MCP architecture.

**Recommendation:** A standalone, offline L3 evaluator whose trusted controller runs outside candidate containers, inside a disposable Linux VM. Candidate generation remains a separately authorized host operation; generated artifacts enter the VM only through a frozen, validated bundle. No models or credentials inside the candidate environment. Containers are defense in depth inside the VM, not a claim of protection against kernel exploits.

**Critical protocol correction:** The original pilot requests prose. A prose answer cannot be converted into runnable code by the evaluator and still count as candidate-owned implementation evidence. Preserve that pilot; define a new artifact-generation protocol for L3 with the same contract across A0/A1/A2. Do not pool its results with the original 27 prose attempts. Generating these artifacts, including changing prompts, requires a new experiment revision and separate execution approval.

**Impact if wrong:** Unsafe host execution, contaminated comparisons or a grader-written mechanism could create false efficacy claims. Default is refuse execution and report the affected lane unverified.

**Approval recorded:** `approved(requesting maintainer, 2026-11-05)` through the explicit reply “ok” to the design-direction approval request. Scope: isolated-runtime direction and separate artifact protocol only. No implementation, VM provisioning, model spend, pilot run, release or exposure follows from this approval.

**Unresolved decisions:** Maintainer owns runtime/VM authorization, bounded execution parameters and team assignment; independent evaluator owns acceptance of adapter observability, fault schedules and metric definitions. These block affected implementation/execution gates, not publication of this draft.

**Runtime target selected:** requesting maintainer selected **dedicated local disposable Linux VM** in the runtime-target decision. Do not reuse normal Docker Desktop workloads as the disposable environment. Selection authorizes targeting the design only, not provisioning, software installation, resource allocation or candidate execution. VM provisioning mechanism and enforceable limits remain subject to scoped approval and qualification.

**Backend amendment approved:** requesting maintainer selected **Minimal direct Apple VZ runner** after independent confinement analysis. This replaces the proposed stock Lima backend only; SRS-002 isolation, resource, custody and verification requirements remain unchanged. Autonomous pre-staged controller/drivers/stubs execute within the fresh guest. No host-to-exposed-guest command channel is retained. Host configuration omits network, socket and shared-directory devices and supplies hard-bounded one-way output. The host owns force-stop and original-disk retention; a fresh equally offline collector receives a read-only raw-disk copy. Deliver the runner, guest applications and packaging inputs as source. This approval grants no installation, codesigning, provisioning, host-policy change, VM activation or model spend. Detailed interface/device/lifecycle delta still requires independent source-design review before acceptance.

**Readiness preflight observed:** `docker context show` returned `desktop-linux`; `docker info` failed because `/Users/nguyenhuyhoang/.docker/run/docker.sock` was unavailable. Docker client presence is not VM/daemon readiness. No daemon was started and no generated artifact was executed. The dedicated VM remains unprovisioned/unqualified.

## Trace Source and Authority

- Current source inspected: Git `52671cf9ed6a1c376dfaaae7e621dbc51a4c8765`, plus the explicitly approved local BRD and conversation. A commit identity does not identify uncommitted document bytes; hash this SRS and BRD at approval/dispatch.
- Approved work item: [BRD](../brd/brd-skill-system-effectiveness.md), approval `approved(requesting maintainer, 2026-11-05)`; source links REQ-003/004/005 and AC-003/004/005. The subsequent conversation approved drafting bounded technical design, not implementing it.
- Original pilot requirements: Git `4acc21f4d:docs/prd/prd-backend-system-design-roi-improvement.md`, REQ-006/008 and AC-012/013/017/018/019, scoped to that original slug. Do not confuse equal IDs across documents.
- Existing [pilot contract](../../benchmarks/evals/backend-system-design-roi-pilot.md), especially §§5–7: candidate-owned code, separate grading lanes, runtime gap and cost/approval boundaries.
- HLD-SSE-001: generate outside isolation → ingest frozen bundle → build offline → execute with trusted fault drivers → retain evidence → independently review. All arrows are explicit handoffs, not inherited authority.

## Scope and Architecture Delta

In scope: frozen input contract, safe artifact ingestion/build/run lifecycle, three case adapters, independent observations, failure classification, evidence retention and compatibility boundary. Deferred: model generation integration and new paid experiment; production/CI activation; other languages; all-host qualification. Excluded: external payment/search services, tenant/customer data, grader-written candidate implementation, changing existing scorer schemas, promoting L3 output into catalog readiness automatically.

Proposed placement is `scripts/evals/l3/`; it is new code, not present implementation. Standalone entrypoint proposed as `node --import tsx scripts/evals/l3/index.ts validate|build|run --manifest <file>`. `validate` performs no candidate execution; `build` and `run` each require scoped runtime approval. No default execution when invoked without a subcommand. No `--execute` bridge from the existing transcript evaluator.

| Component | Owner / boundary | Dependency direction |
| --- | --- | --- |
| CMP-SSE-001 Controller | One runtime implementer; trusted VM process | Reads frozen manifest, invokes runtime through an allowlisted adapter, commits receipts; never loads candidate modules into its process |
| CMP-SSE-002 Candidate bundle | Generation owner; untrusted bytes | Runs only in build/run containers; no repository, grader, host filesystem or credential access |
| CMP-SSE-003 Case drivers and external-effect stubs | One evaluation implementer independent of content authors | Exercise candidate entrypoint and own fault schedule/observations; never implement candidate business rules |
| CMP-SSE-004 Evidence collector | Controller owner; controller-owned storage | Receives bounded candidate output and independent driver/runtime receipts; exports to operator for review |

Communication is synchronous bounded JSON-lines request/response for case actions, and bounded asynchronous append-only controller/stub observations. Candidate processes never write authoritative verdicts or controller receipts. Broker/driver actions carry monotonic sequence and attempt IDs. Container lifecycle IDs are captured by the runtime adapter; no blanket host process termination.

## Technical Requirements

All cards are Must, Draft; one authoritative verification mapping per card follows. Proposed evidence paths are relative to a new operator-approved L3 run directory, not historical transcript directories.

### SRS-001 — Reject unbound or unauthorized inputs

Source: BRD REQ-004/AC-004; original REQ-008/AC-018. CMP-SSE-001; LLD-SSE-001.

Controller validates the full frozen manifest, artifacts, protocol and runtime-policy bindings before any build/run. An absent/expired grant, missing field, unknown adapter or changed digest returns `preflight_failed` without spawning a candidate. Approval names in JSON are not authority; the host adapter must independently establish the scoped grant or refuse the action. A content hash is integrity evidence, not authenticated provenance.

Verification: VER-SSE-001, integration/security — `preflight-rejections.json`: missing/expired grants, altered bytes, incomplete limits and wrong protocol leave no build/run lifecycle event.

### SRS-002 — Contain build and execution

Source: BRD REQ-004/AC-004; original REQ-006/AC-012. CMP-SSE-001/002; LLD-SSE-002.

Build and run occur in separate fresh nonprivileged containers inside an authorized disposable Linux VM. No host home/repo, credentials, Docker socket, devices, privileged mode, external network, published ports or writable grader mount. All capabilities dropped, no-new-privileges, read-only root, non-root user, bounded writable storage, pinned approved image digest and resource limits. Only controller-owned VM workspace data is mounted; reject symlinks/hardlinks, path traversal, special files and mount escapes before ingress. Candidate does not choose images, runtime flags, mounts or shell command strings. Invoke fixed argv without a shell. Runtime controls unavailable or not verifiable → `preflight_failed`, never fall back to ordinary host execution.

Build receives frozen source and a pinned offline dependency set. Network fetching and install lifecycle scripts are forbidden. A missing dependency or required unsupported platform is a classified build/input failure, not permission to enable networking. Run receives immutable produced artifacts and fresh state, not a writable build container. CPU, memory, process, disk, wall-time and output caps are all finite and explicit per stage; no unknown/unlimited defaults. Exact approved values are runtime-manifest inputs, not claims of measured workload capacity.

Verification: VER-SSE-002, security/runtime — `containment-receipt.json`: adverse probes establish denied egress/mount/credential access and enforced limits on the selected host/runtime version. Configuration inspection alone is not a pass; ordinary unit mocks cannot qualify containment.

### SRS-003 — Execute candidate-owned mechanisms

Source: original REQ-006/AC-012/013; BRD REQ-004/AC-004. CMP-SSE-002/003; LLD-SSE-003.

Admit only the frozen artifact contract for the chosen protocol: initial supported target is a dependency-locked Node.js service with a fixed entrypoint. The same language, operations, inputs and tool allowances apply to all arms. Candidate implements persistence, operation identity, authorization, caches, capacity and recovery; adapters may translate inputs/outputs but cannot insert those policies. Prose-only or incompatible output is `artifact_unavailable`/`artifact_invalid`; never synthesize an implementation and attribute it to that arm. No automatic generation repair or hidden retries. Deliberately vulnerable local controls prove the driver detects faults; they are evaluator tests and never experiment participants.

Verification: VER-SSE-003, integration — `adapter-conformance.json`: safe and independently seeded faulty candidates demonstrate consumer-visible detection, alternate correct mechanisms remain acceptable, and evaluator-side replacement fails provenance review.

### SRS-004 — Separate observed failure from absent proof

Source: original REQ-008/AC-018/019; BRD REQ-003/AC-003. CMP-SSE-001/004; LLD-SSE-004.

One attempt ends in exactly one terminal state defined below. Candidate crash, bad response or resource-limit termination after case start is a retained candidate failure; VM/driver/runtime malfunction is `infrastructure_error`, not candidate unsoundness. A failed probe is not silently retried. Preserve all incurred work and observation coverage; incomplete evidence prevents pass. Any critical invariant failure aborts remaining cases under the authorized stop policy and remains in the report; it cannot be masked by later successes.

Verification: VER-SSE-004, integration — `lifecycle-failures.json`: injected build errors, candidate timeouts, runtime loss, malformed messages, cancellation and duplicate completion are classified once without overwriting evidence.

### SRS-005 — Bind evidence to the exact attempt

Source: original REQ-008/AC-017/018/019; BRD REQ-005/AC-005. CMP-SSE-004; LLD-SSE-004.

Use new immutable run/attempt directories, exclusive creation and atomic final receipt publication. Store frozen manifest, source/image/driver/policy digests, original generated artifact, approved generation-context identity, build receipts, lifecycle IDs, fault schedule/seed, independent observations, bounded stdout/stderr, verdict and limitations. Reject overwrite/resume on changed inputs. New execution is a new attempt with linkage to its predecessor, never a replacement. Candidate output is untrusted data: no tool directives, secrets or arm labels are promoted into instructions or blind grading bundles. Controller retains arm mapping separately under operator-controlled access.

Usage fields remain nullable; absent actor/token/price/time coverage is explicit. Human measurements require actual human observations. Original pilot definitions of full task cost apply; runtime duration is not model usage or money. Review/timing exports may use the existing delivery-observation schema through a separately checked mapping, not by changing historical schemas. Retention/deletion policy must be approved before execution; no automatic deletion of frozen inputs, logs or failed attempts.

Verification: VER-SSE-005, integration/integrity — `evidence-integrity.json`: tampered inputs, replayed IDs, partial write, omitted actor usage and label leakage are detected; failed attempts remain countable.

### SRS-006 — Preserve protocol and publication boundaries

Source: BRD REQ-003/004/005; original REQ-008/AC-019. CMP-SSE-001/004; HLD-SSE-001.

L3 uses a new `artifact-v1` protocol and explicit A0/A1/A2 arm IDs in its own schema; do not expand or reinterpret existing `baseline|with-skill` transcript types. Keep L1 lexical results, L2 semantic verdicts and L3 executable results separate. New protocol prompts are frozen and supplied identically apart from skill content; A0 receives no repository/skill mount. Content retrieval restrictions during generation require host proof, not just instructions. Keep new artifacts outside the existing report input tree so generic aggregation cannot discover them accidentally. No catalog readiness update, release or broader support claim from local controls or one diagnostic pilot.

Verification: VER-SSE-006, contract/consumer-smoke — `protocol-separation.json`: legacy transcript verification remains unchanged, prose attempts never become L3 passes, and independent aggregation rejects mixed protocols/context-delivery modes.

## Interface and Data Contracts

### LLD-SSE-001: Frozen manifest v1

Proposed `manifest.json`, strict object validation with unknown execution-affecting fields rejected. Required fields: `schema_version:1`, `protocol:"artifact-v1"`, `run_id`, `case_ids`, `arm_sources`, `attempt_plan`, `generation_contract`, `runtime_policy`, `driver_bundle`, `approval_binding`, `retention_policy`.

Each artifact reference is a normalized relative path, raw-byte SHA-256 and size, contained within its designated immutable bundle; source Git refs alone are insufficient for dirty/local inputs. Resolve path components without following symlinks; verify inside the isolated workspace before reading and again before execution. Runtime-owned directories are inaccessible to candidates, narrowing concurrent path-swap risk; host isolation is still required.

`attempt_plan` fixes case/arm/repetition, randomized order and seed, finite starts/ends and permitted attempts. `generation_contract` binds exact prompts, model/effort/tool policy and context-delivery mode. `runtime_policy` binds image digest, Node version, stage limits, permissible mounts, no-network policy, deadline and runtime adapter version. `approval_binding` identifies independently verified host consent and expiry, not a file name masquerading as permission. `retention_policy` fixes custodian/access/expiry and approved deletion behavior. Missing values fail preflight; this draft supplies no execution budget or dates.

### LLD-SSE-002: Build/run ownership and lifecycle

`proposed → validated → building → built → running → collecting → terminal`. Validating does not authorize the next state. A per-attempt lease prevents concurrent runs; stale state is marked interrupted after inspecting the owned runtime ID, never blindly restarted. Cancellation first stops the owned candidate, then captures terminal state and cleanup receipt. Killing/restarting a candidate within an authorized case fault schedule is distinct from restarting a failed experiment attempt. Any uncontained control failure stops the run and asks the host operator to handle VM teardown; no unrelated host cleanup command is permitted.

Terminal states: `passed`, `failed`, `artifact_unavailable`, `artifact_invalid`, `build_failed`, `preflight_failed`, `infrastructure_error`, `cancelled`, `interrupted`. These belong only to the new L3 schema; original usage/outcome enums remain unchanged. Terminal receipts record case coverage, independent observations, exit/signal, cap breach and failure reason. No terminal state without independent coverage can be `passed`.

### LLD-SSE-003: Candidate operation protocol and case ownership

Candidate stdin/stdout carries one bounded JSON object per line: request `{version:1, seq, operation, payload}`; response `{version:1, seq, ok, result?, error?}`. Operations and payload/result schemas are frozen per case before generation; only one in-flight request per candidate initially. Version/sequence mismatch, extra unframed output, oversize message or response past deadline fails the candidate protocol. Diagnostic stderr is bounded separately. Controller and external-effect stub observations are not derived from candidate assertions.

External stubs run in separate controller-owned processes. Candidate accesses them through per-attempt Unix sockets in a non-writable directory, without access to logs, grader code or labels. Socket permissions expose only the stub service; candidate cannot replace the socket or write authoritative observations. OS peer/namespace isolation and path permissions require live qualification. Stub requests/responses are strict and bounded; logs are independently sequenced and captured. No external network is enabled to make the adapter work.

| Case | Candidate-facing operations to freeze | Independent driver responsibility / oracle |
| --- | --- | --- |
| Payment | `submit`, `inspect`, `recover`; durable state survives controller-triggered process restart within one attempt | Stub owns accepted debit records, provider status and settlement. Drop reply after commit, restart candidate and replay same instruction; verify effects and state against external evidence. Provider supports base/changed-constraint modes; driver must not perform deduplication on behalf of the candidate. |
| Tenant | `ingest`, `query`, `reindex`, `revoke`, `export`, `restore`; responses expose retrieval/rerank/cache-stage item provenance as well as public output | Driver owns synthetic source dataset/authority and mutation timeline. Inspect actual intermediate artifacts using read-only stage records; cross-check provenance to candidate code and known sources. Candidate self-reported zero leaks alone cannot prove intermediate isolation. If the independent evaluator cannot establish stage observability for an implementation, classify that invariant unverified, not passed. |
| Overload | `open`, `send`, `read`, `close`, `drain`, `status`; explicit declared connection/buffer/drain bounds | Stub controls service capacity and stalls; runtime/driver observe admission, buffered bytes, completed/dropped messages and termination time. Candidate counters are cross-checked with transmitted/acknowledged bytes and process observations. Use bounded scaled workload for correctness; no 6,000-connection throughput claim without separately approved capacity execution. |

The operation schemas and schedules below now supply the previously missing design detail. Independent evaluator review is still required before freezing them; review does not grant experiment execution authority. Original invariants remain owned by the pilot/packet. Unexercised conditions and unobservable intermediate behavior remain unverified.

### LLD-SSE-004: Receipts and evidence trust

`receipt.json` requires version/run/attempt/case/arm/protocol, exact input digests, stage timestamps, terminal state, observation references/digests, covered invariants, usage coverage, limitations and cleanup result. `observations.jsonl` is controller-owned with contiguous sequence numbers and bounded event schemas. Timestamps support timelines but are not proof of external time authority. Logs/hashes establish retained-byte consistency, not authenticated human approval or source truth. No shell links, arbitrary host paths or executable commands are accepted through receipt fields.

Partial evidence is preserved under an unfinished marker; absence of a terminal receipt is interrupted/incomplete evidence, never zero cost or success. Reconciliation checks detect duplicate IDs and incompatible replay. Exported reviewer bundles remove arm labels and machine paths while preserving original immutable evidence under restricted custody. Original sources are synthetic only; no credentials or customer records belong in any bundle.

## Security, Failure Analysis and NFRs

| Adverse event | Required behavior / boundary |
| --- | --- |
| Candidate tries network or host access | Runtime denies it; retain probe/violation; missing containment proof prevents execution. |
| Candidate forges result/counters | Trust independent stub/runtime observations; require artifact/code cross-checks for internal stages. Lack of coverage is unverified. |
| Build needs unavailable package | Offline build fails; no automatic download or lifecycle-script execution. |
| Output flood/fork/memory/CPU/disk overrun | Enforce frozen limits, terminate only owned container, retain truncated-output/cap evidence. |
| Controller crashes or VM disappears | No pass; preserve prior evidence and reconcile owned IDs before cleanup. No automatic rerun. |
| Fault driver silently implements missing policy | Reject evaluator qualification through independent review and faulty-candidate controls. |
| Arm contamination or changed protocol | Freeze violation; retain evidence, halt affected comparison and report inconclusive. |
| Missing human review or actor usage | Human-effort/cost claim remains unavailable; never infer it from model latency. |

No numeric throughput/latency performance commitment is introduced. Bounds are mandatory finite inputs set before execution; qualification includes proving each is enforceable. No live users, external effects or production data; model generation is outside the VM and requires its own spend/account/attempt bounds. Host policy is not modified by this design.

## ADR-SSE-001 — Separate Protocol and Isolated Runtime (Proposed)

Decision: new standalone artifact evaluator, containerized inside a disposable Linux VM; no extension of the transcript runner to execute arbitrary output. New artifact protocol and schema, no automatic pooled report.

Alternatives rejected: direct host subprocess (unsafe trust boundary); changing transcript scorer semantics (misrepresents old evidence); grader translating prose to service (tests grader implementation); new distributed/general agent platform (unnecessary scope).

Consequences: extra runtime qualification and approved infrastructure required; explicit cross-arm artifact-generation contract and independent adapters are unavoidable. This does not promise malicious-code containment from Docker alone. ADR is proposed and local to this draft; do not publish it as an adopted architecture decision before approval.

## Compatibility, Migration and Rollback

No migration of old results or scorer types. New L3 artifacts live under `artifacts/skill-system-effectiveness/l3/<run-id>/`, never `benchmarks/evals/runs/`. Existing evaluator and published reports stay unchanged. Runtime provisioning is opt-in. Rollback disables/removes the new invocation, stops only its owned runtime resources under approved host control and retains evidence according to its policy; no old result rewrite or candidate cleanup outside the owned VM.

## Revision 2: Concrete Contracts and Local Qualification Profile

These details complete the design proposal without starting infrastructure or authorizing execution. They do not silently broaden the revision-1 direction approval. One consolidated implementation approval may accept these defaults and bounded source implementation; later VM activation and model experiments retain separate gates.

### Common wire contract

All payloads and successful results are strict objects: reject missing/unknown fields and wrong types. `Id` is an ASCII string matching `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`; `Nat` is a non-negative safe integer; `Positive` is a positive safe integer. Amounts and byte counts are integer base units, never floating point. Lists contain at most 256 entries; duplicate IDs are rejected. Strings are at most 4,096 UTF-8 bytes unless a smaller type bound applies. Source documents and synthetic content must fit that bound; no arbitrary binary payload or filesystem path is accepted.

Request envelope: exactly `{version:1, seq:Positive, operation:Id, payload:object}`. Sequences start at 1 per process and increase by 1; a process restart opens a new session under the same attempt. Response success: exactly `{version:1, seq:Positive, ok:true, result:object}`. Error: exactly `{version:1, seq:Positive, ok:false, error:{code:ErrorCode, message:string}}`. ErrorCode is `INVALID_REQUEST|NOT_FOUND|FORBIDDEN|OVERLOADED|DRAINING|UNAVAILABLE|CONFLICT`. Error responses do not fabricate successful effects. Unknown transport/protocol output is a candidate failure, not a newly invented error code. Maximum frame 65,536 bytes; maximum response delay 5 seconds except `drain`, bounded at 10 seconds. These are proposed diagnostic limits, not production SLOs.

### Payment operation schemas

`PaymentView` is `{instruction_id:Id, state:"unknown"|"succeeded"|"failed", evidence_ids:Id[]}`. `failed` means final negative evidence, not timeout. Validity is checked against the trusted provider ledger, not state labels alone. Requests identify business instructions; the driver never supplies a precomputed deduplication policy.

| Operation | Payload | Successful result |
| --- | --- | --- |
| submit | `{instruction_id:Id, amount_minor:Positive, currency:"USD"}` | `PaymentView` |
| inspect | `{instruction_id:Id}` | `PaymentView`; absent ID returns NOT_FOUND |
| recover | `{instruction_id:Id}` | `PaymentView`; recovery consults provider evidence without inventing finality |

Provider socket protocol uses the same framing. `debit` payload `{instruction_id:Id, operation_ref:Id, amount_minor:Positive, currency:"USD"}`, result `{evidence_id:Id, outcome:"succeeded"|"failed"}`. `lookup` payload `{operation_ref:Id}`, result `{evidence_id:Id, outcome:"pending"|"succeeded"|"failed"|"not_found"}`. `settlement` payload `{instruction_id:Id}`, result `{evidence_id:Id, final:boolean, outcome:"succeeded"|"failed"|"absent"}`. In the changed-constraint mode, lookup returns UNAVAILABLE and provider deduplication is disabled. An absent non-final settlement row is not negative evidence. The stub records every call and committed effect, including rejected/duplicate requests, outside candidate custody. A provider evidence ID is accepted only if present in that ledger for this operation.

Fault schedules, each on fresh state:

- Base: submit instruction P1; provider records one successful commit and returns evidence. Inspect and recover; no additional committed debit.
- Adverse: provider commits the first P1 debit then closes the socket without a reply. Candidate must expose unknown; restart only the candidate process, preserving its declared state volume. Replay submit/recover while lookup is pending; publish final positive provider evidence, recover again. Exactly one committed debit; no fabricated final state during the pending interval.
- Changed constraint: disable deduplication and lookup; commit/drop reply, restart/replay, expose non-final absent settlement then final positive settlement. No second debit or premature final state. Separate negative-outcome control publishes final negative settlement before permitting a new provider call.

Fault release is controller-sequenced, not based on candidate wall-clock claims. This is a compressed diagnostic of evidence ordering; it does not prove two-hour durability or nightly operational scheduling. Those durations require a separately scoped longevity experiment.

### Tenant operation schemas

`Doc` is `{document_id:Id, owner:Id, content:string}`. `Item` is `{document_id:Id, owner:Id, content:string}`. `Trace` is `{retrieved:Item[], reranked:Item[], cached:Item[]}`. A successful trace is necessary but not sufficient evidence; the independent review/inspection rule below applies.

| Operation | Payload | Successful result |
| --- | --- | --- |
| ingest | `{document:Doc}` | `{document_id:Id}` |
| query | `{tenant:Id, query:string}` | `{items:Item[], trace:Trace}` |
| reindex | `{document_id:Id, derived_owner:Id}` | `{document_id:Id, status:"applied"|"quarantined"}` |
| revoke | `{tenant:Id, document_id:Id}` | `{document_id:Id, revocation_id:Id}`; mismatched ownership returns FORBIDDEN |
| export | `{tenant:Id}` | `{items:Item[], snapshot_id:Id}` |
| restore | `{tenant:Id, snapshot_id:Id}` | `{items:Item[], trace:Trace}`; wrong tenant returns FORBIDDEN |

Tenant authority is supplied by the trusted driver as authenticated test context; the diagnostic does not claim to test authentication itself. Revocation acknowledgement creates an observable linearization boundary: subsequent requests cannot return revoked content, even if physical copies remain. Controller owns source identity and issued revocations, not the candidate's authorization logic.

Fault schedules: ingest uniquely identifiable A1 and B1; query as A, then request stale B1→A derived mapping and query the same terms again to exercise retrieval/rerank/cache. Export A before revoking A1; revoke A1; repeat query/export and restore the pre-revocation snapshot. Compare document IDs and unique content canaries against the trusted dataset, not candidate-provided owner labels. Wrong-tenant export/restore and revoke must not expose or mutate another tenant's data.

Required intermediate observation: candidate bundle declares normalized, read-only-at-observation artifact locations for retrieval/rerank/cache records and derived snapshots. Between schedule steps the controller uses container/cgroup pause-freeze, observes the frozen state, snapshots the complete attempt state volume and resumes the same process without termination or restart. In-memory stale caches remain resident. If freeze/snapshot fails, mark the observation unavailable; do not restart to make inspection succeed. Any deliberate restart is a separate named fault, not an implicit inspection step. A reader independently checks declared records against public traces and dataset canaries; source review establishes correspondence to actual stages. If a stage has no independent observable representation, reviewer must accept an equivalent observation before admission; otherwise its invariant and required whole-case result remain unverified. Candidate instrumentation is not tamper-proof; source review and observation coverage remain explicit diagnostic limitations.

### Overload operation schemas

`Limits` is `{max_connections:Positive, max_buffer_bytes_per_connection:Positive, drain_deadline_ms:Positive, max_retries_per_request:Nat}`. Controller requires declared limits fit the diagnostic policy before starting.

| Operation | Payload | Successful result |
| --- | --- | --- |
| open | `{connection_id:Id}` | `{connection_id:Id, admitted:boolean, limits:Limits}` |
| send | `{connection_id:Id, message_id:Id, bytes:Positive}` | `{message_id:Id, status:"accepted"|"rejected"}` |
| read | `{connection_id:Id, max_bytes:Positive}` | `{delivered:{message_id:Id, bytes:Positive}[], closed:boolean}` |
| close | `{connection_id:Id}` | `{connection_id:Id, closed:true}` |
| drain | `{}` | `{terminated:boolean, undelivered_count:Nat}` |
| status | `{}` | `{limits:Limits, active_connections:Nat, buffered_bytes:Nat, dropped_count:Nat, capacity_rps:Nat}` |

`send.bytes` instructs actual allocation/transport of synthetic bytes; a counter-only implementation is invalid. Driver records generated, accepted, delivered and explicitly dropped message IDs/bytes. It independently samples attempt memory and state snapshots; declared counters are cross-checked, not trusted as proof of internal buffer sizes. Declared bytes exclude documented fixed protocol overhead; any overhead allowance must be frozen before run, not chosen after seeing memory growth.

`send.bytes` and `read.max_bytes` must be at most 65,536; accepted byte totals cannot exceed declared per-connection capacity without corresponding delivery/drop evidence. Per-message delivered/drop observations use the append-only bounded event stream, not ever-growing arrays in `status` or `drain`. `read` returns at most 256 entries per call. Candidate attempt state may retain larger histories within the disk cap; protocol replies must remain within frame/list caps.

Summarizer stub protocol: `summarize` payload `{request_id:Id, connection_id:Id, message_ids:Id[]}`, result `{request_id:Id, status:"completed"}` or OVERLOADED/UNAVAILABLE. Trusted stub enforces deterministic per-second capacity with monotonic VM time and records all calls including retries. Candidate owns admission, buffering and retry policy.

Proposed bounded workload: 24 clients, 1,024-byte messages every 100 ms per active client, 30-second base window; one summary request per active stream per 1-second window. Stub capacity 30 requests/s, then 20, then 12 (same sequential one-third and 40%-remaining losses, deliberately scaled). Service latency is deterministic 100 ms in this diagnostic, not the original p99. Stall 8 readers for 10 seconds after first loss; drive 8 reconnects with the same logical connection IDs. Candidate declares at most 32 active connections, 65,536 bytes per-connection buffer, 5,000 ms drain and 1 retry/request. Smaller finite limits are valid if rejection/degradation is honest. Drive demand above each residual capacity, then drain under the deadline. Verify rejected/dropped data is not labeled delivered and all retry calls count toward downstream capacity.

This scaled workload tests bounded correctness, not original 6,000-client throughput or 45-second-stall performance. Retain original arithmetic/operational reasoning in L2. Schedule: allow at most 15 seconds setup; set workload time t=0 at readiness; base capacity applies for [0,30) seconds, first loss for [30,45), second loss for [45,60); reader stall applies [30,40), reconnects at t=35; drain begins at t=60 and ends by t=65. Whole-attempt wall limit is 90 seconds. Controller owns monotonic time, readiness failure and deadline enforcement. Freeze exact seed and event order before generation.

**Required overload coverage:** Whole-case pass requires driver-observed pre-loss admission of more than 20 logical streams with one requested summary/stream/second, continuing driver offers after each loss; independently logged offered demand from that already-admitted population must exceed each frozen residual capacity (20 then 12 requests/s) during the observation windows. Require observed withholding of reads for eight admitted connections, bounded buffering/rejection or explicit closure, and drain under deadline. Stub receipts independently bound actual forwarded calls, including retries, to the residual ceiling; safe shedding must not be penalized for reducing forwarded calls. If a candidate's valid lower admission limit, early closures or other behavior prevents a required demand/stall condition, report that condition unverified and prohibit whole-case pass—never silently count a safe low-load run as overload proof. A control capped at 12 admissions must not qualify as a whole-case overload pass; a safe shedding control that first admits at least 21 and meets all observations may qualify. Record per-condition coverage separately from safety verdicts.

### Local VM profile and resource policy

Approved source backend: minimal direct Apple Virtualization.framework runner, native Linux arm64 with Docker Engine inside a dedicated disposable guest; not stock Lima, Docker Desktop or a remote service. Use explicit empty network/socket/shared-directory device sets, no SSH/guest control services, autonomous frozen schedules, host-owned VM lifecycle/force-stop, and bounded output-only serial transport. Evidence collection uses a fresh offline guest with a raw copy attached `readOnly: true`; the host never mounts or parses the guest filesystem. Supply concrete Swift runner and guest controller/collector source plus packaging inputs. Signing with the virtualization entitlement, approved boot/rootfs/dependency images, installation and live qualification require separate authority. Missing prerequisites fail closed; do not fall back to Lima, interactive vsock, firewall attestations or a weaker containment claim.

- VM cap: 4 vCPUs, 8 GiB RAM, 40 GiB disk; one attempt at a time. These are resource ceilings for diagnostics, not measured adequacy or permission to allocate them.
- Provisioning is separate from execution: approved Linux image digest, runtime packages and offline Node image/dependency bundles are acquired only under explicit installation/network authority. Store resolved image digests before freeze; never put a mutable tag in a run manifest.
- No host home/worktree/shared directory mounts, SSH agent forwarding, clipboard, container socket export or credential forwarding. Before exposure, stage bounded synthetic input and disable guest network/SSH/control connections through host-owned controls; candidate bytes are never executed during staging. Once any untrusted build/candidate runs, treat the guest as permanently potentially compromised: never restore its network, SSH or shared filesystem connection, even after candidate exit. Candidate process absence cannot re-establish guest integrity. Each attempt uses a fresh guest cloned from the accepted clean image; only the explicit within-attempt payment restart reuses its state.
- Build cap: 1 CPU, 1 GiB RAM, 128 processes, 512 MiB writable workspace, 120 seconds wall time, 4 MiB combined stdout/stderr. No install scripts, network or host mounts.
- Run cap: 1 CPU, 512 MiB RAM, 64 processes, 128 MiB attempt state, 90 seconds wall time, 4 MiB combined output, 65,536-byte frames. Fixed tmpfs 64 MiB is included in memory accounting. One candidate plus trusted stubs must fit the VM; controller records total guest resource pressure separately.
- VM local write ceiling: 8 GiB per qualification session, maximum 32 attempts/session, maximum 2 hours/session. Exceeding any cap stops new work and retains evidence. This does not authorize 32 model calls: qualification uses deterministic local controls only, while all model attempts remain zero until separately authorized.
- Retention default: retain raw receipts/inputs/results locally for 30 days; no automatic deletion at expiry. Custodian is requesting maintainer. Expiry emits a review action; deletion requires scoped approval after verifying evidence export and retained hashes. Never delete a VM containing the only evidence copy. No external upload.
- Image/rootfs build identity, installed-runtime version, hypervisor identity and network isolation must appear in qualification receipts. Docker client version alone cannot satisfy these checks.

Post-exposure collection uses host/hypervisor authority to stop the whole guest and retain its bounded virtual disk; do not ask that guest to attest its own quiescence. Never mount or parse its filesystem in the host kernel or restore a live communication channel. A fresh offline collector VM receives a read-only copy of the stopped disk and emits only length-capped canonical receipt/log frames over a bounded non-network output channel; it has no host mounts/credentials/network and is itself discarded after collection. Host treats every frame as untrusted bytes and accepts only strict fixed schemas, bounded sizes and fixed artifact names, with no guest-chosen paths/commands. A parser/collector failure yields unavailable evidence, not pass; suspected guest compromise invalidates guest-origin oracle integrity. Hypervisor stop/export/cap controls and collector isolation require independent live qualification. Negative controls include persistent background modification after candidate exit and falsified guest process reports: neither may reopen connectivity or authorize transfer. Retain original stopped disk until approved preservation/deletion conditions hold; no automatic destruction of the only evidence copy.

### Ownership and concrete implementation slices

D1–D4 source assignments are authorized by the explicit request “Implement D1–D4”; the orchestrator owns integration and bounded workers own the assigned components. D1 source/API acceptance is recorded; D2/D3 corrections remain in progress and D4 depends on their accepted interfaces. The revision-4 direct-VZ amendment is approved for source/design only. Independent reviewer must be a different session/person from each author. Profile/account eligibility must be resolved before dispatch; a quota failure never authorizes premium or cross-domain fallback.

| Slice | Proposed exclusive scope | Depends on | Completion evidence |
| --- | --- | --- | --- |
| D1: freeze data/wire contracts | `scripts/evals/l3/contracts.ts`, `manifest.ts`, contract tests | accepted revision-3 contracts | VER-SSE-001/003/006 rejection cases and all operation equivalence classes; no runtime spawn from validate |
| D2: implement VM/container lifecycle adapter | `scripts/evals/l3/runtime/`, lifecycle tests | D1 and approved runtime implementation scope | source delivery: finite-policy validation, owned lifecycle/reconciliation and focused failure checks; actual guest smoke/containment remain activation-dependent D5 requirements, not satisfied by mocks |
| D3: implement three fault drivers | `scripts/evals/l3/cases/`, driver/control tests | D1; parallel with D2 after contract freeze | source delivery: deterministic case/state/coverage controls including low-admission negative control; in-guest candidate-owned behavior remains pending D5 |
| D4: integrate evidence and CLI | `scripts/evals/l3/index.ts`, `evidence.ts`, integration tests; root package script and docs only under integration ownership | D1–D3 source delivery | source delivery: actual local `validate` entrypoint rejects unsafe/incomplete manifests without spawning runtime, receipt integrity and legacy separation; successful build/run smoke remains D5, never inferred from stubbed lifecycle tests |
| D5: independently qualify | read-only design/code/evidence review; qualification receipts | D4 source delivery and separately authorized disposable VM | actual guest/collector smoke, persistent-compromise/egress/mount/limit negatives, all candidate-owned fault scenarios and observed cleanup; these live requirements remain mandatory and pending until activation |

A single controller/evidence integration owner arbitrates shared interfaces. D2 and D3 must not both edit contracts or entrypoint; request D1 owner changes. Implementation uses existing TypeScript/test conventions; no new runtime API or service. Root package script wiring is added only after the entrypoint exists. Build/lint/shared suites run once after implementation settles; per-behavior RED/GREEN evidence follows project TDD rules.

### V-model readiness and acceptance boundary

- Acceptance level: maintainer confirms qualification scope and result limitations; actual human review/rework observations remain a separately authorized experiment, not a prerequisite for writing evaluator code.
- System level: run the actual new CLI on deterministic safe and unsafe bundles inside the VM; prove classification and cleanup, not a mock forwarding echo.
- Integration level: test wire framing, stubs, snapshots, runtime lifecycle, receipt integrity and legacy transcript separation.
- Unit level: validate strict fields/paths/hashes, state transitions, accounting coverage and fault schedule decisions. These cannot replace runtime containment checks.
- UI/mobile levels do not apply. Missing optional product-evidence installation remains a proposal-state limitation, not a reason to redo BRD intake.

### Readiness disposition after design closure

Design details are supplied; remaining gates are independent review and scoped implementation authority, plus provisioning authority for live qualification. These are not missing design-writing tasks. Exact input/image digests bind real artifacts at dispatch/provisioning; do not fabricate them now or treat absent future artifacts as proof of a missing architecture.

Independent revision-2 review requested corrections F1/F2/F3 and tenant pause semantics. Independent revision-3 delta review closed all four and returned APPROVE FOR SOURCE IMPLEMENTATION, design scope only. See [review evidence](srs-review-skill-system-effectiveness.md) for reviewed digest and limitations. No human implementation authority, VM activation, runtime proof or spending follows from this reviewer verdict.

## Implementation Sequence and Ownership

This is a proposed sequence, not an execution authorization or dispatched plan. Preserve completed original T0–T6 work; do not silently append tasks to the historical original PRD.

1. **Dispatch revision 3 after scoped authority:** dedicated local VM target and independently reviewed contracts, schedules and proposed Lima limits are specified. Human source-implementation authorization remains required. Bind actual source bytes and eventual real image identities at dispatch/provisioning; do not fabricate missing future digests.
2. **After implementation approval:** one runtime owner implements manifest/lifecycle/containment/receipts. A distinct evaluation owner implements case drivers against the approved schemas; these can proceed in parallel after shared interfaces freeze. One integration owner owns entrypoint/shared schema changes. Workers do not run shared mid-flight suites.
3. **Qualify locally:** deterministic negative controls and actual containment/cleanup smoke inside the authorized VM, no model calls. Independent reviewer is not implementer. Qualification proves evaluator behavior only, not skill effectiveness.
4. **Separate T7 decision:** exact protocol/cases/arms/generation contract, attempt budget, account/model/effort/concurrency/currency/expiry, human measurement and host stop controls are approved before any new model attempt. Do not reuse the original 27 prose attempts as the new experiment's observations.

UI/mobile/visual verification is inapplicable: no UI changes. Integration/security/consumer-smoke checks are mandatory; specific test commands are authored when the new entrypoint exists, not fabricated as currently runnable commands.

## Blockers, Status and Receipt

- blocked(D2 source acceptance, implementation owner and independent reviewer, remaining lifecycle findings and independently reviewed direct-VZ design delta); D1–D4 source implementation itself is authorized.
- blocked(live qualification, maintainer, provisioning/activation authority and actual image/runtime identities; proposed limits and backend are specified, not deployed).
- blocked(experiment execution, maintainer, separate current scoped authorization and complete finite bounds).
- blocked(value conclusion, human validation owner, comparable observed acceptance/review data and complete cost coverage).

Revision-3 design review remains historical evidence, not proof of revision-4 implementation. The requesting maintainer approved the minimal direct-VZ backend amendment while preserving the security invariants and dedicated local disposable-VM target. D1 source/API is accepted; D2/D3 and then D4 still require implementation verification and independent acceptance. Sensitive runtime behavior is not live-qualified. The [walkthrough](srs-walkthrough-skill-system-effectiveness.md) and [review record](srs-review-skill-system-effectiveness.md) retain prior history. Parent requirements remain unchanged. Provisioning and live qualification remain separately gated.

Next: complete and independently review the bounded direct-VZ design delta and remaining D2/D3 source corrections; integrate D4 after accepted dependencies; verify the actual local validate entrypoint. D5 requires separate activation authority and observed control evidence. Do not reopen settled source authority or infer paid pilot authority.
