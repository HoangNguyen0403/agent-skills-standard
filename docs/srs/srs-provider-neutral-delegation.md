# Technical Design: Provider-Neutral Delegation

slug: provider-neutral-delegation
status: approved_for_repository_implementation
operator_profile: technical
snc_tier: high
execution_approach: Subagent-Driven
account_domain: Personal
implementation_request: recorded
sensitive_design_approval: approved(requesting_operator, 2026-10-23)
independent_design_review: no_remaining_design_blockers (agent 01e2d1b7-a2ab-452d-b763-28689a1590ac; documentary review only)
personal_pool_authorization: Gemini cheap -> eligible DeepSeek -> Personal Codex fallback, explicitly clarified by requesting operator

## Context and trace

Sources: [approved direction](../brd/brd-provider-neutral-delegation.md), [PRD](../prd/prd-provider-neutral-delegation.md), [delivery plan](../plans/provider-neutral-delegation.md), [review evidence](../../artifacts/subagent-optimization-review.md). The PRD's REQ-1–REQ-10 and AC groups remain authoritative. No approval of model spend, release or activation is implied.

HLD-1: preserve registry -> CLI-managed installation/exports -> host execution. The standards MCP selects and serves content; it is not an execution/authentication service. CMP-1 owns content delivery, CMP-2 task packets, CMP-3 semantic host support, CMP-4 workflow catalog and CMP-5 acceptance/usage evidence.

Architectural owner: orchestrator/engineering lead. Implementation owners follow the delivery plan. Independent architecture/security review and requesting-operator design approval precede implementation because identity, authority and host-control boundaries are affected.

## Decisions (ADR: existing architecture, safer contracts)

### D1 / LLD-1 — Return complete required content without inventing identity

Choose complete-body delivery for every matched skill request. Remove process-global suppression from the delivery decision; a parent's/sibling's consultation never satisfies another request. Do not add an agent-supplied context ID, MCP-session-as-authentication assumption, authentication service, or inferred acknowledgment.

The current implementation has no trustworthy per-worker delivery identity. Eliminating unsafe suppression is smaller and safer than designing an identity system solely to keep deduplication. It can increase repeated prompt bytes; measure that honestly and reduce unnecessary selection/bootstrap instead of silently omitting required instructions.

`load_skills_for_files` and `load_skills_for_keywords` continue returning selected complete bodies and provenance. Read content at request time, so current content is returned after an edit. Record a body-content digest when reporting revision-specific delivery evidence; selection/body-return is not acknowledgment, model comprehension or host enforcement. Content digests establish integrity/identity, not authentication.

Clean cutover: remove the now-unnecessary `force_reload` request option and omitted-body stub behavior from registry MCP schema, host examples, docs and callers. Migrate every in-repository consumer. Previously recorded journals remain historical evidence, but new reports must not claim saved prompt tokens from unsafe body omission. Keep selection/unique-catalog counts distinct from body-return counts. No new actor isolation claim is made about the process-local consultation ledger.

Failure behavior: unreadable required content returns the existing safe explicit error without exposing filesystem details; it does not count as delivered. Empty match remains existing no-match guidance. No cross-request authentication, authorization or acknowledgment inference is introduced.

Verification VER-1: actual shared MCP requests representing parent/child/siblings, changed content revision, missing content and repeated same-context requests; assert returned current body rather than stub or name-only telemetry. Distinct source/host evidence must not be conflated.

### D2 / LLD-2 — Require an explicit standalone assignment contract

Keep Markdown `Task N` extraction (including Task 0 and existing heading depths); require a separate versioned JSON assignment contract rather than attempting to infer authority from arbitrary prose or copying the whole plan preamble. The orchestrator owns creation/authorization of this input; the helper validates structure and content identity, not human approval authenticity.

Proposed invocation: `task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> [--out <BRIEF_FILE>]`. Existing callers migrate; no fallback that silently emits a bare task section when assignment data is absent.

Assignment v1 fields:
- `schema_version: 1`, `task_id`, `task_number` (nonnegative integer), `goal`, `owner` (one implementation owner), `project_domain`, `workspace_root` (absolute), `plan_sha256`, `non_goals` (explicit list).
- `authority`: explicit allowed operations, forbidden actions and required approval references; no empty/missing authority inferred as permission.
- `global_invariants`: applicable plan-wide invariants supplied explicitly; an explicit empty list means none apply, not missing input.
- `owned_paths`: nonempty exact paths/bounded directories; no repository-wide or escaping ownership. Distinguish read/modify scope and new paths where necessary.
- `acceptance_criteria`: nonempty IDs plus observable expectations; `verification`: nonempty command/scenario plus expected result.
- `required_standards`: exact IDs with retrievable content/revision references; missing required bodies/access is a dispatch prerequisite, not a reason to repeat global discovery.
- `source_revision` and `dirty_identity`: settled source/workspace identity declarations, not authentication; `source_files`: consumed source paths and SHA-256 values, or explicit missing/new-file state; `dependencies`: explicit list of required artifact IDs, producer task, required producing revision, evidence path and SHA-256. An explicit empty dependency list is valid. Dependency receipt content must identify its producing revision; compare it to the required revision, not merely the outer manifest's own declaration.
- `output_contract`: receipt/report destination, status vocabulary and stop conditions; `limits`: host-authorized resource/attempt limits or explicit unavailable/advisory status.

Validation: plan digest must match the selected plan; task ID/number must agree; required field/type/empty-value errors prevent output. Verify declared consumed-source and dependency digests before writing. Resolve required local artifact paths against `workspace_root`; reject traversal/symlink escape, missing artifacts and stale digests. Do not treat a digest or arbitrary approval-reference string as authenticated authorization.

The orchestrator selects applicable global invariants from reviewed source references. The helper cannot prove that no applicable rule was omitted, and must not claim semantic completeness from schema validation alone. Preserve source identities for any declared constraint text; do not use similarity/keyword inference to select authority.

Output: a standalone Markdown brief containing the complete validated assignment contract, selected task text, applicable global invariants and dependency evidence. Required dependency text is embedded once by default with identity/digest; avoid making an isolated worker rely on inaccessible parent paths. Unrelated task sections are excluded. Binary or remotely hosted evidence needs a separately verified host transport; the local helper reports unsupported/unavailable input rather than fake delivery. Preserve existing workspace-resolution/review-package APIs. Default output is content-addressed under the resolved workspace; changed contents preserve prior evidence. Identical content can reuse the same path; an explicit colliding output must not overwrite different bytes.

Errors: exit 2 for malformed/missing/stale prerequisites; exit 3 for absent/ambiguous task selection or output collision; exit 0 returns packet path/content identity. Validate before publication: no usable partial packet, no replacement of prior evidence and no dispatch-success output on failure. Output remains within the explicitly assigned workspace/artifact boundary. Recognize H1–H6 Task N headings including Task 0; ignore headings inside backtick/tilde fences and reject duplicate matching task headings.

Adverse timeline: source/dependency changes after preparation invalidate the packet; the orchestrator re-prepares before dispatch/acceptance, not silently reuses stale evidence. File-reference access must be verified by the host. The packet itself is not a sandbox or authorization mechanism.

Verification VER-2: real helper retains global constraints and required dependency evidence; rejects missing authority/ownership/AC/verification, stale plan/dependency digest and escaped paths; excludes unrelated tasks; supports Task 0 and valid heading shapes. Keep existing review/progress behavior intact. Tests must assert observable packet/error behavior, not formatting.

### D3 / LLD-3 — Separate semantic policy, native surfaces and observed runtime support

Canonical operations: prepare, dispatch, receive completion, resume same task, cancel, collect receipt and verify acceptance. Canonical workflow text names semantics, not one runtime's literal tools. Existing CLI transformations and host instruction records bind those operations to native invocation; no general-purpose executor or new service is added.

Extend existing capability/export metadata with explicit delegation-surface information and support/evidence status. Distinguish native-agent definition, instruction-only persona and unsupported surface. A static export format does not establish spawn/resume/cancel, context inheritance, accessible artifacts, model/effort control, enforced filesystem/network/tool boundaries or complete usage.

Observed support is keyed by host product, surface, version, operation/control and evidence revision. Outcomes: supported, unsupported or not_verified. Absence is not_verified, not supported. Bindings must preflight authority/data eligibility, required controls, artifact accessibility and separate action approvals before dispatch. Host tool permission and sandbox mechanisms remain host-owned; warning comments remain disclosures, never enforcement.

Copilot native agent output uses its actual documented agent-definition surface, not broad `applyTo` instructions masquerading as runnable subagents. Claude, Codex and Gemini definitions use their own current supported configuration; Antigravity is evaluated separately. Do not claim nesting where only selecting a top-level custom agent is demonstrated. Unsupported permission projections are explicit and block only operations requiring that unavailable control.

A runtime receipt identifies operation, task/actor/revision, terminal/nonterminal state, evidence and limitations. User/host policy supplies profile/model/effort and resource limits; canonical `fast | standard | strong` is only a capability hint. Never encode private profile names/account routes in shared registry policy.

Failure handling is cause-specific: unavailable prerequisite -> needs_context/blocked; defective output -> one concrete AC-focused corrective assignment according to host policy; observed provider exhaustion -> only an eligible authorized fallback; consequential unresolved safety/design issue -> human decision. Retry count alone cannot authorize premium. Timeout/cancellation is not successful completion. Resume keeps the same task/authority; independent review uses a separate owner/context.

Verification VER-3: held-out semantic lifecycle cases plus actual authorized native discovery/invocation/negative-control scenarios for each claimed surface/version. Serialization and fake-executor fixtures are separate evidence layers. No provider-native support is certified by this design document.

### D4 / LLD-4 — Reuse one installed canonical workflow catalog

Use `.agents/workflows/*.md` as the installed canonical workflow catalog for every configured provider, including provider-only installations. The CLI installs each selected canonical workflow once through existing install-writer ownership, then derives native exports from the same collected content. MCP WorkflowIndex reads this catalog; it does not reconstruct canonical instructions by parsing native TOML/prompt/skill output.

CLI ownership rules remain mandatory: identify workflow-owned managed files through existing installation state; never overwrite/prune unowned authoring files or user overrides merely because a path matches. In the registry checkout, `.agents/workflows` remains authoring source, not disposable generated content. Same-path native surfaces do not produce duplicate/conflicting writers. Custom overrides and user edits must be respected or reported as conflicts, never silently certified equivalent.

Selected catalog and native outputs must come from the same verified source content/revision. Missing catalog/source, stale/conflicting native exports or partial synchronization prevent an equivalence/success claim. Removing a selected workflow prunes only owned outputs under existing install policy. Missing/uninstalled workflow returns explicit unavailable guidance; it must not fall back to unrelated recent workflow content.

No network lookup occurs during MCP catalog reads. Installation/sync owns update and migration; MCP is read-only. Catalog parsing/identity and native export parity are verified against actual temporary consumer installs, not only source-file existence.

Extend existing `.skills-lock.json` v2 with an optional versioned `workflowCatalog` section, not a second catalog file: canonical relative path/digest, registry identity/requested ref/resolved immutable commit (null if unknown), and native bindings with output path/digest and generating canonical digest. Reference existing file-ownership entries. Canonical workflow ownership uses a reserved shared marker handled before per-agent pruning; it does not add a fake provider to the Agent enumeration.

Acquisition returns an explicit complete desired set, deliberate disabled/empty selection, or incomplete discovery/download/integrity result. Incomplete acquisition never authorizes deletion based on missing files. Read back actual post-reconciliation bytes because an awaited InstallWriter write may preserve an edit/override. Retain prior provenance only for still-valid prior bytes; never stamp retained old bytes with a newly requested revision. Publish the lock last through atomic replacement. Shared canonical/native same-path outputs are written once.

Managed lookup reads one lock snapshot and verifies each canonical digest. Missing/mismatched managed content is unavailable; unlisted residue is not silently installed. With no installation lock, authored registry workflows remain readable as `local_source` with computed content digest and no native-parity claim. A present managed lock without catalog metadata reports legacy/unverified provenance and requires sync for managed lookup; malformed/unsupported managed metadata must not fall back to local-source reading. Partial/full uninstall follows existing ownership/backup rules, retaining shared bodies while surviving bindings need them and disclosing edited residue.

Validate catalog names and bounded canonical/native relative paths, digest syntax and duplicate keys before use; reject traversal and realpath/symlink escape from the project root. Returned workflow content is the same bytes whose digest was checked, not an unchecked second read; revalidate on actual lookup after scanning if content changed. A corrupt/stale entry is diagnosed explicitly and never replaced with unrelated/local/native content.

Atomic lock replacement does not make a native host's independent file discovery transactional. Interrupted writes can leave files that disagree with the previous lock: report unavailable/stale rather than false alignment, and repair with ordinary sync. Quiescent sync/reload is required for activation qualification; the CLI cannot promise to block a running host from reading residual/cached instructions.

Verification VER-4: provider-only temporary installs, source/native digest agreement, missing workflow, removed owned workflow, overrides, unowned canonical files, partial failures and same-path native targets. Exact install-writer integration details are reviewed before implementation.

### D5 / LLD-5 — Reuse full-actor journals and layered qualification

Extend existing SessionJournal/evaluation seams; do not create a second cost ledger. Expected actor/attempt membership and task/parent identity must be explicit. Collect parent, workers, independent review, integration, failed/retried/interrupted/cancelled attempts and any auxiliary model work. Existing `codex | omp` adapters remain truthful; unsupported provider journal formats return unavailable coverage, not fabricated generic parsing.

Normalized usage preserves uncached input, cache read/write, output, separately reported reasoning and orchestration usage with source semantics. Distinguish included reasoning from separately billed reasoning so it is not priced twice. Distinguish host usage, estimates, subscription/quota counts and invoices. Missing usage/rates and incomplete actor membership prohibit monetary savings claims. Keep failures in task-cohort accounting.

Conformance records identify host/surface/version, scenario/task/revision, native trace/artifact references, required controls, observed outcome and missing evidence. Promotion evaluates accepted-task rate, required behavior/independence, false positives, retries, wall time, cost coverage and full-task economics. No numerical savings promise or arbitrary token budget is invented.

Prepare deterministic synthetic scenarios locally. Native model execution and repeated baseline/current/proposed trials require eligible accounts and separately authorized resource limits. A fake-executor fixture, parseable export or correct answer transcript is not proof of native delegation. Offline preparation can finish without mislabeling pending live acceptance as complete.

Verification VER-5: actual journal/report tool over synthetic multi-actor recorded sessions including failures, missing usage, duplicate/overlapping reasoning and interrupted work; executable lifecycle scenarios; then authorized native conformance and repeated matched task-class trials. Keep evidence-layer distinctions in final reports.

## Requirement cards and verification mapping

Each card is Must, priority as in the PRD, status proposed_for_review. The stated VER lane is the evidence target; current implementation is not claimed tested.

| SRS | Source / AC group | Contract and input/output/error behavior | Component / design | Verification |
| --- | --- | --- | --- | --- |
| SRS-1 | REQ-1 / AC-1 | Required current skill request -> full body; unreadable content -> explicit error, not delivery | CMP-1 / D1 / LLD-1 | VER-1 shared MCP integration |
| SRS-2 | REQ-2 / AC-2 | Valid explicit assignment + task -> complete standalone packet; absent/stale input -> no usable packet | CMP-2 / D2 / LLD-2 | VER-2 helper smoke/regression |
| SRS-3 | REQ-3 / AC-3 | Eligible supported semantic operation -> valid receipt; absent controls -> unsupported, no dispatch claim | CMP-3 / D3 / LLD-3 | VER-3 host contracts/native scenarios |
| SRS-4 | REQ-4 / AC-4 | Classified failure -> authorized specific route; retry count -> no premium authorization | CMP-3 / D3 | VER-3 adverse recovery scenarios |
| SRS-5 | REQ-5 / AC-5 | Native surface/version + evidence -> scoped support claim; serialization alone -> not_verified | CMP-3 / D3 | VER-3 actual discovery/invocation/denial |
| SRS-6 | REQ-6 / AC-6 | Coherent lifecycle -> bounded ownership and independent acceptance; stop/cleanup -> preserve status/evidence truth | CMP-2, CMP-3 / D2, D3 | VER-2, VER-3 lifecycle/retention |
| SRS-7 | REQ-7 / AC-7 | Expected actor sessions -> complete/partial usage report; missing data -> no savings claim | CMP-5 / D5 / LLD-5 | VER-5 real report + authorized trials |
| SRS-8 | REQ-8 / AC-8 | Installed canonical workflow -> same-revision native/MCP lookup; absent -> unavailable | CMP-4 / D4 / LLD-4 | VER-4 actual temporary installs |
| SRS-9 | REQ-9 / AC-9 | Settled canonical changes -> reproducible exports + rollback evidence; publication -> no inferred activation | CLI integration / D4, D5 | VER-4 parity + final covering gate |
| SRS-10 | REQ-10 / AC-10 | Assigned packet -> narrow required standard consultation; no global intake or cross-context omission | CMP-1, CMP-3 / D1, D3 | VER-1 plus positive/negative bootstrap cases |

## Functional flows and adverse timelines

FLOW-1: orchestrator prepares explicit assignment -> helper validates plan/source/dependencies -> publishes complete packet -> host checks access/authority/capabilities -> eligible worker executes -> returns receipt -> independent acceptance verifies settled revision. Missing/stale input prevents dispatch; later source changes invalidate affected evidence.

FLOW-2: worker requests exact applicable standards -> MCP reads current matched content -> returns body/provenance -> records observed selection/body return. Parent/sibling requests do not affect the returned body. No workflow catalog discovery or full parent intake is repeated when the packet already identifies the assignment/procedure.

FLOW-3: CLI collects verified selected canonical workflows -> applies existing ownership/override rules -> writes installed catalog/native outputs from the same content -> records failures -> MCP discovers catalog. Partial/conflicting output never becomes a claim of native equivalence.

FLOW-4: evaluation owner enumerates expected actors/attempts -> existing adapters parse real or synthetic recorded journals -> report coverage and normalized usage -> compare accepted outcomes. Missing coverage yields partial/unknown cost; live trials wait for explicit spend limits.

## Data, migration, retention and boundaries

No application DB migration or new execution service. Required changes are library/helper contracts, catalog installation ownership, schemas/config exports and evidence records. Migrate every in-repository force_reload, task_brief invocation and affected native specialist consumer; regenerate mirrors through existing tools. Remove obsolete aliases/stubs and incidental wording tests rather than preserving competing conventions.

The local SDD workspace is transient execution state. Required packets, reports, immutable review snapshots and verification receipts must be archived at durable evidence references before cleanup; the cleanup action must not invalidate current handoff links. Existing install ownership governs safe removal of managed outputs; unrelated/user files are never deleted.

Do not persist credentials, cross-client context or raw sensitive logs. Required human approvals remain host-authenticated/external decisions, not JSON strings asserted by a worker. Hash validation is not approval validation. Instructions and advisory bounds are not sandbox enforcement.

## Non-functional constraints and measurement

NFR-1: no required instruction/authority loss across actor boundaries; measure VER-1/2 negative cases.
NFR-2: no false enforced-control, authorization or completed-work claim; measure VER-3 adverse/native scenarios.
NFR-3: no unowned destructive install cleanup; measure VER-4 ownership/override cases.
NFR-4: no monetary saving with missing coverage or duplicate billing; measure VER-5 report cases.
NFR-5: bounded context by exact selection and standalone packets; measure body sizes/bootstrap calls and full-actor usage without inventing target savings. No new latency/availability SLA is introduced.

## Parallel readiness, rollout and approval

D1–D5 define shared boundaries for Tasks 1–7; independent implementation starts only after this design is reviewed and explicitly approved. Task ownership/scheduling remains the delivery plan: policy/packet/export work can run independently after contracts settle; shared server/tools/install files have one owner at a time. Final integration checks require settled peers.

Repository changes do not activate hosts. Version native claims and collect authorized conformance evidence before promotion; retain previous approved registry revision for rollback. No paid trial, premium model, merge, release or deployment is authorized by this SRS.

feature_status: design_ready_for_review
completed_evidence: approved direction, selected execution/account domain, reused source review, existing delivery/usage/install seam inspection
missing_evidence: independent design review, requesting-operator sensitive-design approval, implementation and native acceptance evidence
recommended_next_workflow: implementation-readiness after design approval
