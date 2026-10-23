# Technical Design: Agent Effectiveness Observability

**Status:** Review draft; technical approval pending. **Owner:** Requesting repository maintainer (sponsor/product/acceptance). **Updated:** 2026-10-23.

## Context and authority

This SRS specifies the technical How for [the PRD](../prd/prd-agent-effectiveness-observability.md), using the fixed conversation-approved BRD-OBJ-001..003, REQ-001..009 and AC-001..027 contract. The approved direction authorizes documents only. It does not authorize implementation, enrollment, historical backfill, pilot execution, deployment, or access to either machine. All wire formats, security mechanisms, limits, retention periods and performance numbers below are **review proposals**, not implemented behavior, measurements or approved policy.

Repository deliverable: review draft. Activation: not authorized. Feature status: `blocked`, not `design_ready`, because permission/retention/host contracts require explicit approval. The documentation slice is deliverable despite those activation blockers. Engineering, QA, security/privacy and operations assignees are unassigned; the maintainer must appoint them before execution.

Scope: two explicitly enrolled personal-domain collectors, one authenticated reporting service, deterministic daily/task reporting, governed improvement queue. Excluded: replacing OMP Stats, BI platform, agent orchestration, automatic history collection, cross-account pooling, model-per-event analysis, automatic skill promotion and invoice/savings claims. Historical import requires a separately approved manifest and time interval; enrollment does not imply backfill.

## Evidence ledger and reuse boundary

| Evidence                                                                                                    | Confirmed source observation                                                                                  | Limit / consequence                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Architecture](../../ARCHITECTURE.md#hierarchical-skill-resolution-v21)                                     | Process-local consultation counts distinguish discovery/body returns; audit does not certify runtime delivery | MCP process is not a task, run or native actor                                                                   |
| [SessionTracker](../../mcp/src/services/SessionTracker.ts)                                                  | `LoadEvent` carries discovery, full-body and dedup-stub observations; body token counts are chars/4 estimates | Not provider token usage; no verified deployment pin in this assignment                                          |
| [WorkflowTelemetry](../../mcp/src/services/WorkflowTelemetry.ts)                                            | Supplied usage/rates and `host`/`agent-estimate`/`unavailable` provenance                                     | Source label is not invoice authority; normalize bucket semantics before reuse                                   |
| [SessionJournal](../../mcp/src/services/SessionJournal.ts) and [native report](../../mcp/SESSION_REPORT.md) | Explicit local OMP/Codex manifests, nullable buckets, inventory coverage and redacted aggregate output        | Aggregate report alone lacks event-level dedup identity; an adapter extension is proposed, not already available |
| [Eval usage](../../scripts/evals/usage.ts)                                                                  | Missing stream returns null; exact model-rate lookup; existing aggregate helpers                              | Some optional submetrics default to zero in this helper; do not inherit that as proof of known zero              |
| [Outcome schema](../../scripts/outcome/schema.ts)                                                           | Existing `run_id`, `slug`, agent, trace, feature-status and cost-source contract                              | Outcome evidence is not independent acceptance; keep existing schema unchanged                                   |
| [Learning format](../../skills/common/common-learning-log/references/log-format.md)                         | Redacted candidates, independent approval, evaluation and rollback references                                 | History remains untrusted evidence, not instructions                                                             |

The supplied planning brief reports a mounted ledger that counted catalog-discovered workflows as loaded and shared parent/scout activity. This is a reported runtime observation, not verified deployed-source behavior; source/runtime drift is unresolved. The brief also reports an unavailable local dashboard. No OMP Stats API/export, live host, remote inventory or billing API is assumed or accessed here.

## HLD-001 — Logical architecture and ownership

Direction: native enrolled source → local adapter/normalizer → local durable outbox → asynchronous authenticated service → single-writer store → deterministic authorized reports. Outcomes/checks and AGS observations enter through separate source-authority lanes. Agent execution never awaits telemetry or service availability.

| Component                   | Logical responsibility / data owner                                         | Binding proposed for review                                            | Responsible / accountable                                    |
| --------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| CMP-001 Enrollment/identity | Explicit domain/project/source inventory, mapping and revocation            | Local protected manifest and identity registry; service scope registry | Engineering assignee / maintainer; security reviews boundary |
| CMP-002 Adapter/outbox      | Local reading, redaction, normalization, replay and coverage                | Per-machine durable SQLite outbox, local-only native mapping           | Engineering assignee / maintainer                            |
| CMP-003 Ingest/store        | Authentication, idempotency, revisions, erasure, snapshots                  | One service with one writer and one SQLite reporting DB                | Engineering/operations assignees / maintainer                |
| CMP-004 Reports             | Daily overview, task timeline, metric definitions                           | Authenticated read API; OMP Stats remains separate                     | Engineering assignee / maintainer                            |
| CMP-005 Outcomes/learning   | Evidence validity, verdict authorization, paired evaluation, adoption gates | References existing outcome/eval/learning formats; no schema mutation  | QA and independent reviewer assignees / maintainer           |

No client mounts or synchronizes the active reporting SQLite file. Prefer an existing authorized always-on host; otherwise a designated machine may host the service with visibly delayed aggregation. Host availability is unknown and blocks activation, not document publication. Components own separate failure domains: a collector outage affects its freshness; a service outage delays aggregation; a reporting failure cannot block agent execution.

## Functional flows (logical before bindings)

| Flow     | Actor / goal                          | Normal course                                                                                                                                                        | Alternate / exception                                                                                                                   |
| -------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| FLOW-001 | Maintainer / enroll one scope         | Approve domain/project/source/time interval; register collector and permissions; inspect inventory coverage; activate explicitly                                     | Off is default; unknown inventory remains unknown; revoked scope cannot resume with old credentials                                     |
| FLOW-002 | Collector / deliver one batch         | Read enrolled source; resolve explicit identities; allowlist/redact; commit normalized rows and checkpoint atomically; export; clear only acknowledged terminal rows | Offline retries; malformed source records coverage gap; overflow never blocks agent; copied records follow LLD-001                      |
| FLOW-003 | Service / commit batch                | Authenticate and scope-check; validate; resolve duplicate/conflict/revision; transact event and accounting state; return per-event acknowledgment                    | Lost reply → same batch replay; unsupported schema/conflict permanently quarantined locally; no successful acknowledgment before commit |
| FLOW-004 | Reader / inspect one task             | Authorize domain/project; request snapshot; show usage, source coverage, independent outcome and skill observations                                                  | Missing mapping remains unattributed; no title/time joins; stale/empty states explicit                                                  |
| FLOW-005 | Acceptance owner / decide one outcome | Bind verdict to task, run, criteria revision and evidence; service verifies verdict authority; append decision                                                       | Agent completion remains non-authoritative; missing evidence or revoked decision authority rejects accepted verdict                     |
| FLOW-006 | Maintainer / improve one candidate    | Link supporting/contrary redacted evidence; reproduce; propose pinned change; run paired eval; independent review; explicit human adoption; monitor/rollback         | No evaluation or approval → no adoption; rejected candidate remains dispositioned; history cannot issue commands                        |
| FLOW-007 | Maintainer / withdraw one scope       | Revoke enrollment epoch; reject pending exports; delete scope data and derived views; purge outbox on reconnection; record erasure control receipt                   | Offline collectors and restored backups must reconcile revocation state before any export/read; no replay resurrection                  |

## LLD-001 — Identity, copies, revisions and ordering

**Owner:** CMP-001 for mapping, CMP-002 for local persistence, CMP-003 for canonical keys. **Trace:** REQ-002/003/007; AC-004..009, AC-021.

- Maintainer assigns opaque random `domain_id`, `project_id`, `task_id`; a task ID is intentionally carried across machines. Each execution has an explicit `run_id` and attempt ordinal; agents have `agent_id` and nullable `parent_agent_id`. These are scoped identifiers, not titles, branch slugs or filesystem paths. Preserve existing outcome `run_id` through an explicit local mapping. Slug is display metadata only and is not uploaded as a free-text identity.
- Local native mappings retain raw session/request IDs only in the protected local registry. Upload identity uses a domain/project-scoped HMAC-SHA-256 key and typed canonical tuples, with length-prefixed UTF-8 fields. `source_instance_id = HMAC(key, source-kind, native-origin-namespace, native-session-id)`. `source_event_id = HMAC(key, source-instance-id, native-event-or-request-id)`. The origin namespace is a source-declared immutable identifier carried with copies, never the importing collector hostname/path. A/B enrollments for the same project use the same protected identity-key epoch and canonicalization version. `collector_id` records transport provenance only and is excluded from the dedup key.
- Dedup key is `(domain_id, project_id, source_instance_id, source_event_id, event_revision)`. Therefore the same copied source and event under the same identity epoch collide intentionally across collectors. Newly resumed source events with new native identities remain distinct. A genuine native collision with different content is quarantined, not silently collapsed.
- Where stable origin/session/event identity is absent, a raw journal copy cannot be promised replay-safe identity. Do not use path, modification time, timestamp/title similarity or raw-content hashing as a substitute. Keep such usage local/unattributed, upload only a sanitized coverage-gap summary (`identity_unavailable`) and exclude it from canonical usage totals. A separately approved import manifest may assign a stable source identity shared by all copies; it must declare that event uniqueness remains unresolved if the source lacks event IDs. No invented unique events.
- Initial identity-key distribution/rotation requires maintainer-approved secure provisioning; secrets never transit events. For key rotation, retain an opaque canonical source/event token in the protected local registry and use an authenticated alias-registration control transaction to bind old/new pseudonyms before new-epoch export. Alias maps include no native IDs. Service checks same scope, active enrollment and uniqueness. If mapping is missing or contradictory, quarantine new-epoch exports with `identity_epoch_unmapped`; do not sum them as new work. A copied source on a fresh collector must receive the approved mapping or remain incomplete. Revoked/deleted scope aliases cannot reactivate history.
- `event_revision` starts at 1; exact same key and same canonical body digest is duplicate. Same key, different digest is `event_conflict`; arrival order never chooses a winner. Explicit correction uses next revision and `supersedes_revision`, expected prior digest and correction reason enum. Accept only a linear compare-and-swap chain from the current revision, authenticated for that source/scope. Append prior revision, replace its derived contribution atomically, and invalidate dependent snapshots. Concurrent different corrections conflict; a missing predecessor is retryable `revision_dependency_missing`. Agent/source corrections cannot rewrite independent human verdicts.
- Canonical digest is SHA-256 of RFC 8785 canonical JSON for exactly the closed semantic-body field set in LLD-002, after identity alias resolution. Only the disjoint receipt field set is excluded. Copied observations from A/B therefore remain duplicates despite changed import timestamps or adapter versions. A decoder/attribution correction that changes any semantic field must append a new explicit revision; it cannot overwrite revision 1.
- Event time is descriptive. Source sequence and counter epoch order counters; receive sequence gives deterministic snapshot order. Clock skew does not join tasks, establish causality or discard usage. Store UTC `occurred_at`, local `observed_at`, server `received_at`; mark reported clock offset unknown if unavailable. Timeline uses source order then receive sequence for ties, labels cross-source ordering uncertain, and never equates wall duration with billed compute.

## LLD-002 — Proposed event and ingestion contract

These are new service contracts, **not existing OMP endpoints**. CMP-003 owns schema and write consistency. CMP-002 owns adapter validation. Trace: REQ-001..004/007/009.

### Event envelope v1

Unknown numeric values are explicit JSON null; integer counters are nonnegative safe integers; IDs are bounded opaque tokens; free text is excluded. Unknown object keys are rejected rather than forwarded. Types below define an allowlist, not permission to export native values unredacted.

| Field                                                                        | Type / rule                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`, `canonicalization_version`                                 | Integer 1; incompatible versions rejected                                                                                                                                         |
| `domain_id`, `project_id`, `enrollment_id`, `enrollment_epoch`               | Required scope and active-consent reference; server derives allowed scope from credentials                                                                                        |
| `collector_id`, `identity_key_epoch`                                         | Pseudonymous enrolled collector and identity epoch; collector is not origin                                                                                                       |
| `source_kind`, `source_instance_id`, `source_event_id`                       | Registered enum and stable pseudonyms per LLD-001                                                                                                                                 |
| `event_revision`, `supersedes_revision`, `prior_digest`, `correction_reason` | Positive integer, nullable predecessor integer, nullable canonical digest; reason null at revision 1, otherwise `source_correction`/`decoder_correction`/`attribution_correction` |
| `kind`                                                                       | `usage`, `attempt_start`, `skill_observation`, `check`, `outcome`, `coverage`, `learning_transition`                                                                              |
| `task_id`, `run_id`, `attempt`, `agent_id`, `parent_agent_id`                | Nullable explicit mappings; null implies unattributed, never inferred                                                                                                             |
| `occurred_at`, `observed_at`, `source_sequence`, `counter_epoch`             | UTC timestamp or null, UTC timestamp, source integer or null, stable epoch token or null                                                                                          |
| `runtime_version`, `adapter_version`, `source_schema`, `registry_revision`   | Registered version strings or null with coverage reason; deployed version not guessed from checkout                                                                               |
| `evidence_ref`                                                               | Nullable opaque authorized reference, never URL/path/native identifier; dereference separately scope-authorized                                                                   |
| `payload`                                                                    | Kind-specific closed schema described below                                                                                                                                       |

Closed field partition for v1 (all listed envelope fields required, nullable only where declared):

- **Immutable semantic body:** `schema_version`, `canonicalization_version`, `domain_id`, `project_id`, `source_kind`, `source_instance_id`, `source_event_id`, `event_revision`, `supersedes_revision`, `prior_digest`, `correction_reason`, `kind`, `task_id`, `run_id`, `attempt`, `agent_id`, `parent_agent_id`, `occurred_at`, `source_sequence`, `counter_epoch`, `runtime_version`, `source_schema`, `registry_revision`, `evidence_ref`, `payload`. The digest includes exactly these keys and the entire closed kind-specific payload, with resolved canonical source/event tokens replacing wire aliases. Null is serialized, not omitted.
- **Delivery receipt metadata:** `enrollment_id`, `enrollment_epoch`, `collector_id`, `identity_key_epoch`, `observed_at`, `adapter_version`. These remain authenticated and validated on every delivery, but are not semantic content and cannot change canonical attribution. The separate server receipt adds exactly `batch_id`, `commit_id`, `received_at`, `receive_sequence`, `semantic_digest`, `status`, `code`, `current_revision`. Authentication secrets are never stored in either set.
- No other keys or decoder diagnostics are permitted in the wire envelope, semantic body or receipt. A semantic difference under a new adapter requires `decoder_correction`; a different adapter version with unchanged semantics merely adds delivery provenance.

Payload schemas:

- `usage`: `authority` (`native`/`host`/`agent_estimate`), `measurement` (`request`/`cumulative_snapshot`/`summary_only`), `counter_scope_id`, `request_id` nullable pseudonym, `model_id` registered or null, `usage_role` (`conversation`/`auxiliary`/`orchestration`), `aggregation_role` (`exclusive_leaf`/`inclusive_summary`/`unresolved`), `lineage` (required closed object defined below), `input_semantics` (`includes_cache`/`disjoint`/`unknown`), `reasoning_semantics` (`subset_output`/`disjoint`/`unknown`), nullable `input_tokens`, `cached_input_tokens`, `cache_write_tokens`, `output_tokens`, `reasoning_tokens`, nullable `recorded_cost`, `currency`, `rate_card_id`, `rate_card_version`; `cost_kind` (`native_estimate`/`rate_estimate`/`unavailable`), `attempt_outcome` (`completed`/`failed`/`retried`/`interrupted`/null). Currency/rate version required for derived estimates, currency required for recorded monetary values.
- `skill_observation`: registered skill/workflow ID, immutable revision/body digest or null, observation enum `discovered`/`body_returned`/`dedup_stub`/`application_claimed`/`application_evidenced`/`verification_evidenced`, nullable request linkage and opaque evidence ref. A body return does not upgrade itself to application.
- `check`: registered check ID, result `pass`/`fail`/`unknown`, subject revision, evidence ref or null, actor authority class. A check without evidence is not verified acceptance.
- `outcome`: closed keys `subject_task_id`, `subject_run_id`, `criteria_revision`, `verdict`, `effective_at`, `prior_decision_ref`, `evidence_refs`, `authority_decision_ref`. Verdict is `accepted`/`rejected`/`failed`/`abandoned`/`pending`/`reopened`/`acceptance_revoked`; an absent valid decision yields derived `unknown`, not an invented verdict. Server validates authenticated acceptance-owner delegation and the referenced prior decision; payload role strings grant no authority. Accepted → reopened or acceptance_revoked immediately removes the task from accepted set A at the decision's effective cutoff; renewed evidence-bound authorized acceptance is required to reenter A. Rejected/failed/abandoned/pending/reopened tasks retain their task ID and all effort in cohort C. Transitions append under the same CAS authority chain; late decisions create labeled report revisions, never rewrite old snapshots. Agent completion is a non-authoritative check, not a verdict.
- `coverage`: source inventory version, expected/observed/missing actor counts (nullable), latest source watermark or null, gap reason enum, dropped-count lower bound or null, `inventory_complete` boolean or null. Zero observed with unknown inventory is not complete coverage.
- `learning_transition`: candidate ID, transition enum `proposed`/`evaluating`/`reviewed`/`promoted`/`rejected`/`rolled_back`, supporting/contrary evidence refs, evaluation/review/authorization/rollback refs as nullable typed refs. Promotion requires all governing refs and authorized transition role.
- `attempt_start`: closed keys `domain_id`, `project_id`, `task_id`, `run_id`, `attempt`, `attempt_started_at`, `start_authority`, `source_start_ref`, `mapping_version`. Scope/task/run/attempt must equal nonnull envelope references; timestamp is authoritative UTC start or null; authority is `native_harness`/`authorized_manifest`/`unknown`; source ref is a typed canonical event reference or null; mapping version is a pinned registered string. Native starts require qualified harness provenance; manifest starts require maintainer-authorized explicit mapping, not an agent assertion. Generic `occurred_at` or first usage is never a substitute.

### Canonical usage lineage and attempt-start ownership

Closed `usage.lineage` keys: `usage_unit_id` (nullable scoped canonical unit token), `counter_scope_id` (must equal payload scope), `counter_epoch` (must equal envelope epoch), `interval` (null or closed `{start_sequence,end_sequence}` of source integer positions, start-inclusive/end-exclusive), `covered_units` (null or array of closed `{usage_unit_id,event_ref}`), `membership` (`exhaustive`/`partial`/`unknown`), `value_coverage` (`complete`/`partial`/`unknown`), `request_coverage` (`complete`/`partial`/`unknown`), `declaration_authority` (`native_harness`/`qualified_host_adapter`/`unverified`), `declaration_ref` (nullable typed canonical event ref), `semantics_version` (nullable pinned registered version). Typed `event_ref` is exactly `{domain_id,project_id,source_instance_id,source_event_id,event_revision}` after alias resolution. No free-text lineage or generic actor-tree inference.

An exclusive leaf has one stable `usage_unit_id` and either an authoritative position interval or its explicit unit membership. A summary declares its covered set through an exhaustive `covered_units` list or a qualified counter-scope/epoch/interval that maps exactly to canonical units. `value_coverage=complete` means its value covers the declared set/interval; `request_coverage=complete` means every exclusive request in that same set/interval is represented and reconciled, not merely that some child rows exist. Partial lists are not exclusion/disjointness proof. At least one exact set or qualified interval plus authority evidence is required for coverage decisions. Different counter scopes alone do not prove distinct billing units; disjointness requires qualified unit identity/membership evidence.

CMP-002's enrolled adapter owns normalization of source-declared positions/membership under a pinned source protocol and qualified `semantics_version`; only CMP-001-approved native/host-adapter authority can assert complete/disjoint coverage. CMP-003 verifies source grants, same-scope refs, epoch/interval equality, exhaustive membership, reference revisions and reconciled values before choosing contributions. Self-written authority/completeness labels are not sufficient. CMP-005/independent QA qualifies adapter fixtures; no language-model inference is an authority lane.

Canonical unit IDs derive from a provider/native request identity in the approved domain/project namespace, not collector or emitting summary identity. Two sources observing the same native call must map to the same unit ID through an approved source-equivalence mapping; without that evidence cross-source overlap remains unresolved, not assumed distinct. Copied exports use the same canonical event/unit refs. Corrections retain unit identity, append event revision and update references through explicit revision chains; dependent summaries are revalidated atomically. Missing/stale refs or an expired predecessor invalidate completeness until corrected; never silently follow an unverified replacement.

CMP-003 also persists authoritative attempt starts keyed `(domain_id,project_id,task_id,run_id,attempt)` with source ref, authority, mapping version and current start-event revision. Conflicting authoritative starts quarantine and make cohort attribution uncertain; a legitimate correction uses the LLD-001 CAS chain and produces a labeled cohort/report revision. CMP-002 supplies native start provenance, or CMP-001 admits an explicitly authorized manifest mapping. A task's first eligible start is the earliest valid authoritative attempt start under its enrolled task mapping; incomplete attempt inventory leaves that first-start determination uncertain. Unknown start tasks remain visible in an uncertain-membership set, excluded from definite C, with denominator uncertainty and null full-cohort numeric metrics; no implicit first-usage-time assignment.

### Batch write and acknowledgment

`POST /v1/events:batch`, over authenticated TLS. Request: `{schema_version:1, batch_id, events:[envelope...]}`. Proposed limits: 100 events, 1 MiB encoded request, 16 KiB/event. Credentials scoped to one collector, domain/project and source enrollment; separate read/verdict/admin credentials. Validate authentication/scope for the whole batch before handling rows; any scope mismatch rejects the entire request. For authorized rows, one transaction commits valid rows, canonical revisions, derived-accounting updates, dedup records and per-row receipts; invalid rows get explicit terminal statuses in the same response. No acknowledgment of committed rows before durable commit.

Response: `{batch_id, commit_id, received_at, results:[{source_instance_id,source_event_id,event_revision,status,code,current_revision}], watermark}`. Status is `committed`, `duplicate`, `rejected`, `conflict`, `suppressed_deleted`, `suppressed_expired` or `retryable`. Only committed/duplicate are counted as delivery; suppressed-deleted/expired are terminal purge receipts with zero contribution. Collector removes committed/duplicate/suppressed rows transactionally with its acknowledgment cursor; rejected/conflict rows move to bounded local quarantine and set incomplete coverage. `correction_target_expired` and `retention_position_unknown` are terminal rejected codes, not retryable dependency misses. Retryable rows remain in outbox. Do not rely on a batch-wide success flag or HTTP 200 alone.

HTTP/errors: `400 invalid_schema` (terminal); `401 unauthenticated` (pause until credential repair); `403 scope_denied/enrollment_revoked` (stop export and reconcile withdrawal); `409 event_conflict/identity_epoch_unmapped` (quarantine); `413 batch_too_large` (split within limits); `429 rate_limited` and `503 unavailable` (retry with server retry-after). Dependency-missing rows are retryable and carry the missing predecessor. Transport loss after commit → replay identical event keys/digests; receipts and totals remain unchanged. Bounded exponential retry, proposed 1–300 seconds with jitter, never tied to agent completion.

Schema minor changes may add optional server fields only when the negotiated schema permits them; closed v1 event payloads do not silently accept unknown fields. A major decoder/schema change requires fixtures, explicit enrollment compatibility approval and staged outbox drain or retained versioned decoder. Unknown versions quarantine, not guessed parsing.

## LLD-003 — Usage normalization and accounting

CMP-002 normalizes with pinned source semantics; CMP-003 chooses canonical contributions. Trace: REQ-004/005; AC-010..015.

1. One authority lane per canonical unit set or qualified counter scope/epoch/interval under the closed lineage contract above. Request-level exclusive records replace an inclusive summary only if `request_coverage=complete` is verified for exactly the same exhaustive membership/interval and reconciled compatible buckets. Otherwise use the complete authoritative summary alone for that covered region and label request/actor detail incomplete. A separate call adds only with proven disjoint unit membership. If neither lane has complete value coverage, overlap/authority is unresolved, or equivalent cross-source units cannot be mapped, full affected total is null with coverage reasons; expose only proven nonoverlapping known subtotals, never their sum as a full total. Never infer containment from agent hierarchy or add summary and covered leaf requests. Distinct parent/child and auxiliary calls still count once when their canonical membership proves disjoint.
2. For cumulative streams, store snapshots keyed by source counter scope, model and counter epoch. Derive differences in source-sequence order, not receive order. Snapshot before reporting interval supplies baseline; absent nonzero baseline leaves the interval contribution unknown, not the whole cumulative count. Explicit source reset opens a new epoch with a declared zero baseline; unexplained decrease is invalid/unknown and holds the last valid baseline. A late intermediate snapshot deterministically recomputes affected intervals; e.g. synthetic cumulative 10 → 30 arriving before 20 ultimately yields deltas 10 and 10, not 20+10. Values 10 → 5 without a reset cannot produce negative usage. These are planned examples, not executed results.
3. When the same native record carries request usage and cumulative totals, choose the adapter-pinned primary representation, use the other as reconciliation evidence, never sum both. Unknown ordering or unknown counter scope disables delta accounting for that range. Duplicate/copy/revision rules apply before normalization; corrections replace contributions, not add adjustment guesses.
4. Inclusive input: `uncached = input - cached` only if both known and `0 <= cached <= input`; total input is the inclusive field, never input plus cached. Disjoint input: preserve uncached and cache-read separately. Unknown input semantics preserves raw sanitized counters but withholds normalized total/cost. Cache-write is separately counted/priced only where pinned provider semantics declare it disjoint. Unknown cache is not zero.
5. Reasoning declared subset of output is a display submetric, never added to output. Disjoint reasoning adds/prices separately only under pinned provider semantics. Unknown overlap → no combined total. OMP orchestration buckets remain distinct; no reconstruction from totalTokens and no addition to conversation usage unless the source proves disjoint billing scope.
6. `recorded_cost` remains source-native estimate, not invoice truth. Derived cost uses versioned exact model/rate lookup, explicit currency, effective interval and disjoint priced buckets. Missing required rate or bucket → estimate null; no fallback prices or foreign-currency sum. Recorded and rate estimates are alternatives, never added. Store decimal money without binary-float accumulation and round only presentation. Character/4 body estimates are separate context-size estimates, never billed usage or savings.
7. Failed/retried/interrupted attempts remain in task effort. Unknown usage remains null with known subtotal and counted unknown records; the full total is null when required contributions are unknown. Keep attributed and unattributed usage separate, with no synthetic task join. Cost is never automatically allocated among skills from whole-session totals.

### Proposed adapter capability matrix

| Source                                    | Authoritative observation                                                                             | Identity/accounting capability                                                                       | Required gap handling                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| OMP enrolled native journal               | Native usage, row/session identity, agent relationships where explicit, runtime version when provided | Candidate local decoder; source docs distinguish input/cache/reasoning/orchestration                 | Deployment/version and request containment must be verified; report format alone insufficient for cross-copy dedup |
| Codex enrolled native journal             | Cumulative/per-event usage and native identity under pinned source protocol                           | Candidate decoder; cumulative deltas and cache subset semantics                                      | Missing baseline/order/actor → unknown coverage; never use both last and cumulative usage                          |
| AGS consultation observations             | Routing/catalog/body-return/dedup-stub and registry revision                                          | Process ledger can be reused for observations; request-to-actor mapping needs explicit host evidence | Unknown host identity stays unattributed; discovery does not imply loaded/applied                                  |
| Existing run/outcome records              | Workflow/run trace and reported status/cost provenance                                                | Preserve existing schema and map run IDs externally                                                  | `verified` text alone is not human acceptance; no incompatible fields added                                        |
| Verification and authorized human verdict | Check evidence, criteria revision and acceptance decision                                             | Separate evidence/auth lane                                                                          | Missing evidence/authority → pending, never accepted                                                               |
| OMP Stats                                 | Existing usage inspection retained                                                                    | No API/export verified                                                                               | No dependency on an assumed Stats endpoint; adapter disabled until verified and enrolled                           |

## LLD-004 — Reports and metric read contracts

CMP-004 owns deterministic reads; CMP-005 owns acceptance/evaluation definitions. Trace: REQ-005/006/008.

Proposed `GET /v1/overview?project_id&from&to`, `GET /v1/tasks/{task_id}?cursor`, `GET /v1/improvements?project_id&cursor`. Server derives domain scope from reader credential; project parameter cannot widen access. UTC start-inclusive/end-exclusive windows. Proposed page maximum 100, bounded to 90-day query windows; opaque cursor binds scope, filter and snapshot revision. Expired cursor returns `409 snapshot_expired`; a new query gets a consistent current snapshot rather than mixed pages. Unauthorized project/task lookup returns non-enumerating `404`; missing authorized task is also 404. Invalid interval → 400. Service unavailable → 503; client does not fabricate a zero dashboard.

Common response fields: `snapshot_id`, `as_of`, `window`, `report_cutoff`, `cohort_status` (`provisional`/`finalized`), `unresolved_task_count`, `data_state` (`no_data`/`partial`/`fresh`/`stale`), `coverage` (enrolled/observed sources, inventory completeness, missing actors, dropped-event lower bound, unknown-usage count), source watermarks and metric definitions/version. `as_of` identifies snapshot observation time; `report_cutoff` freezes eligible attempt/decision effective times. Schema rejects free-form search over raw source data. Incomplete coverage may coexist with fresh arrival; never collapse those dimensions.

Overview returns separately labeled known usage subtotal/full nullable total, currency-separated estimates, authoritative accepted/rejected-or-failed/abandoned/pending/reopened/revoked/unknown task counts, failed/retried effort, unattributed effort and overhead. Revoked acceptance is a nonaccepted category; no task appears in multiple current-state counts. Timeline returns explicit task/run/agent links, correction and outcome-transition lineage, source provenance, skill observation level and evidence-linked checks/verdicts. Queue returns redacted candidate IDs, supporting/contrary evidence, evaluation status, independent decision and rollback reference. Raw logs are never served.

Metric definition v1:

- Cohort C is distinct explicitly enrolled task IDs whose first eligible attempt starts in `[from,to)` and named scope, frozen by snapshot, registered selection rule and `report_cutoff`; include linked attempts through that cutoff. Continuing work remains open rather than omitted. Incomplete start inventory makes denominator coverage unknown. Accepted set A contains only tasks in C whose latest valid authorized verdict effective at cutoff is qualifying acceptance, not reopened or revoked. Abandoned tasks remain in C but not A; reopened tasks keep the same ID/effort and leave A until renewed authorized acceptance.
- Acceptance rate = count(A) / count(C); show accepted, rejected/failed, abandoned, pending, reopened, revoked and unknown counts. Empty C → null (`no_tasks`), not 0%. An open observation window or unresolved task outcome makes metrics `provisional`. A `finalized` comparison requires frozen cohort/cutoff, declared coverage, disposition of every open/reopened outcome and complete required costs for any numeric full-cost comparison. Unresolved cases remain provisional/inconclusive, never dropped.
- Cost per accepted task = total effort cost of **all tasks in C**, including failed/retried/unaccepted/abandoned/reopened effort and linked orchestration/review overhead through cutoff, divided by count(A). Report C and A sizes, currency, known-cost task count/count(C) and attribution coverage. Zero A → null (`no_accepted_tasks`); missing usage/rates → full metric null with separately labeled known subtotal. Unassigned service/analysis overhead is separately reported, not invisibly spread over tasks; any later allocation rule requires explicit versioned approval. Late data, correction or reopened acceptance creates a labeled report revision, preserving prior snapshot/cutoff rather than silently changing its denominator.
- Cohort eligibility uses only the persisted authoritative attempt-start mapping above. A start before `from` remains out even if first usage arrives in-window; start exactly `from` is in; start exactly `to` is out. Missing/ambiguous start or incomplete first-attempt inventory leaves membership uncertain, separately counted outside definite C, and withholds numeric full-cohort effectiveness/cost assertions. It must not be presented as a complete cohort with a silently smaller denominator.
- Task-matched comparisons bind task/case revision, skill/harness/source/model/rate versions, rubric, treatment order and run attempts. Show pair count, missing pairs, quality guardrails, cost coverage and failures in both arms. Machine is a blocking/randomization factor, not default treatment assignment. Observational correlations never claim causal skill savings; only a predeclared paired evaluation supports bounded comparisons.

## LLD-005 — Data lifecycle, retention and privacy

CMP-002 owns local state; CMP-003 owns reporting data, revocation and restore gates. Trace: REQ-003/007/009.

Proposed relational entities: `enrollments` (active epoch/scope/source/permissions), `identity_aliases`, `events` (composite dedup key plus digest and revision chain), `event_receipts`, `canonical_contributions`, `coverage_gaps`, `verdicts` (authenticated authority/evidence), `candidates`, `snapshots`, and a minimal separate `revocations` control ledger. Foreign keys include domain/project; uniqueness and queries cannot cross scope. Store transaction covers canonical event, receipt and contribution together. Derived reports are rebuildable; source revisions append, with lifecycle erasure the explicit exception.

Proposed local bounds: 100 MiB or 50,000 pending events, whichever first, and seven days maximum pending age. Redacted outbox only; no raw prompts or journal copies. At capacity/expiry, preserve existing pending rows until expiry, stop admitting ordinary events, and persist a fixed-size coverage-gap record/counter in reserved control storage. If even control persistence fails, show collector unhealthy on next startup and mark interval coverage unknown; do not claim an exact dropped count. Source progress cannot be silently acknowledged as complete. Agent execution is unaffected. Quarantine shares the bound and expiry, not an unbounded second store. Retry never rereads unenrolled history to fill gaps.

Proposed retention policy requiring maintainer/security approval: source event metadata and revisions 90 days; derived aggregates 90 days; local acknowledged receipt cache seven days; encrypted backups expire within 30 days. Full histories remain local under separately owned native retention, not managed by this service. Reports after source retention expires cannot claim reconstructible evidence; evidence refs expire or become unavailable visibly.

**Ordinary expiry while enrollment remains active:** retention uses the immutable source `occurred_at` and source position, never the latest ingestion/replay time. At each service transaction a monotonically increasing scope retention floor is `max(previous_floor, server_now - 90 days)` under the proposed policy. Events older than the floor are terminal `suppressed_expired` with zero contribution; null/untrusted source time requires a pinned source epoch/sequence boundary proven eligible, otherwise reject `retention_position_unknown`. Do not substitute import time. Pruning atomically removes expired events, revisions, receipts, contributions and affected snapshots/evidence refs and advances the floor. Export this control floor to collectors; they purge ineligible queued/quarantined copies on reconnect and show a coverage gap rather than backfill.

For accepted events with trustworthy source positions, persist minimal per-source epoch sequence high-water expiry boundaries only when the adapter proves contiguous source order; otherwise retain opaque source-event expiry tombstones sufficient to deny those exact keys. Those control markers contain no payload/attribution and survive at least through the accepted source epoch and all possible backup/import replay; if policy disallows that retention, retire the source epoch and reject all further records from it. Key aliases resolve before the expiry check; copied exports/new collectors cannot bypass the floor or key tombstones. Corrections inherit the original event's retention anchor; expired/predecessor-pruned events reject `correction_target_expired` even if correction effective time or upload time is recent. A new revision or re-enrollment never renews expired evidence retention. Restore reconciles the latest retention floors/expiry markers as well as revocations before opening reads/writes; lack of current lifecycle control state fails closed. Numeric retention and marker policy require D-003 approval.

Withdrawal is explicit and not the same as pausing collection. `POST /v1/enrollments/{id}:withdraw` is maintainer-admin only with expected epoch and scope; returns a control receipt after durable epoch revocation and read/write deny commit. Collection pause stops reads/export but does not erase existing data; deletion requires the withdrawal/erase action. Proposed erase completion target: active store, receipts, alias maps, evidence references, snapshots, aggregates, local outboxes on reconnection and caches within 24 hours; offline machines remain `purge_pending` until they reconcile. Report completion separately from inaccessible offline copies and expiring backups; never claim immediate physical backup erasure.

Prevent resurrection by retaining a minimal revoked enrollment/epoch tombstone, with no task/session/event content, until all backups carrying that epoch expire **and** credentials for that epoch are permanently invalid. Re-enrollment uses a new random epoch with start-time fence; cannot replay old events or automatically backfill. Every reconnect obtains current enrollment state before sending queued data. An offline revoked collector receives 403/control receipt, purges pending records and checkpoints without re-upload. Erasure and ingest serialize against epoch checks in the same write transaction: a concurrent old batch either commits before erasure and is removed, or is suppressed after revocation; no acknowledged survivor.

Restore procedure: take service offline for reads/writes; reconcile latest independently backed-up revocation ledger; replay erasures and invalidate old credentials before rebuilding projections; then reopen. A data backup without current revocation state is not safe to serve and fails closed. If future approval requires full erasure even of minimal tombstones, retain a separate credential revocation capability or disable historical restore/import; do not promise replay prevention after deleting every deny marker. Tombstone retention and control-ledger backup ownership are approval blockers.

### Threats and categorical controls

| Threat                            | Proposed control / observable check                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw secret/prompt/path leakage    | Closed schemas; local allowlist and native-ID/path-like metadata redaction; reject unknown/free-text fields; synthetic canary leakage checks                                                |
| Cross-project/account joins       | Domain/project HMAC namespaces; no cross-domain alias; composite keys, scope-bound credentials and filters; unauthorized read/write rejected                                                |
| Collector forgery of acceptance   | Collector can append observations only; accepted verdict requires separate maintainer/delegated-human credential, evidence and criteria revision; actor role in payload grants no privilege |
| Stolen credentials/replay         | TLS, protected local keychain, scoped revocable credentials and epoch checks; no secrets in repository; compromised active credentials remain a risk requiring revocation                   |
| Malicious historical instructions | Evidence treated as data; no LLM per event; optional batch summaries are untrusted, separately authorized/metered and cannot grant promotion                                                |
| Reidentification through metadata | Minimal registered enums/opaque refs; no raw titles, file paths, hostnames or native IDs; protected identity registry; access and retention review before activation                        |
| Reporting DB/backup disclosure    | OS-protected service storage and encrypted backups with separately controlled keys; no public unauthenticated dashboard; admin access audited without event bodies                          |

Authentication mechanism proposal: separately provisioned high-entropy bearer credentials over TLS, stored in local OS keychain; server stores token hashes, issuer/role/scopes/expiry and revocation epoch. Credentials never go into URLs or logs. Maintainer must approve provisioning, expiry, network exposure, restore and evidence-access owners; this document does not invent an existing auth service. Acceptance authority and independent-review identity must be checked from authenticated control records, not typed names.

## Requirement cards and trace

All cards below have **priority Must**, **status Review proposal**, source the corresponding PRD requirement and reserved atomic AC IDs. Owner is the responsible component role under HLD-001, accountable maintainer; no role assignment is implied. Verification artifacts are planned in [the walkthrough](srs-walkthrough-agent-effectiveness-observability.md). No card is implemented or tested by this document.

### SRS-001 — Enrollment and provenance

Source: REQ-001; BRD-OBJ-001/002; AC-001, AC-002, AC-003. On explicit approved enrollment, CMP-001/002 shall read only declared sources/time intervals and attach runtime/adapter/registry provenance. Output includes consent state, capability and inventory coverage; missing versions/inventory remain unknown. Invalid scope disables that adapter rather than scanning elsewhere. NFR-001/005; measurement: manifest/source fixture inspection; lanes security/integration; evidence VER-001..003. Contracts: HLD-001, FLOW-001, LLD-002/003.

### SRS-002 — Explicit correlation

Source: REQ-002; BRD-OBJ-001; AC-004, AC-005, AC-006. Given explicit identity mappings, CMP-001/003 shall correlate the same task across collectors while preserving runs/attempts/actors. Output retains unattributed records where mapping is absent; title/time similarity never merges tasks. Ambiguous identity quarantines or remains unknown, never heuristic repair. NFR-005; measurement: identity fixtures and negative joins; lanes unit/integration; evidence VER-004..006. Contracts: LLD-001.

### SRS-003 — Replay-safe offline ingestion

Source: REQ-003; BRD-OBJ-001/002; AC-007, AC-008, AC-009. Given stable source/event identities and active enrollment, CMP-002/003 shall durably buffer, replay and commit once per canonical revision despite duplicate/copy deliveries. Output acknowledges only durable transaction decisions. Missing original IDs disables reliable import; conflicts quarantine; offline/overflow marks incomplete coverage without blocking agents. NFR-001/002/004; measurement: crash/replay/reconnect fixtures; lanes integration/E2E; evidence VER-007..009. Contracts: FLOW-002/003, LLD-001/002/005.

### SRS-004 — Truthful usage and cost

Source: REQ-004; BRD-OBJ-001; AC-010, AC-011, AC-012. CMP-002/003 shall select non-overlapping authority scopes, normalize pinned request/cumulative semantics, retain failed/retried work and derive estimates only from known rates/buckets. Output separates unknown/full/known-subtotal and native/rate estimates. Invalid resets/overlap/rates withhold affected totals rather than guessing zero or adding parent summaries. NFR-005; measurement: native fixture reconciliation; lanes unit/integration; evidence VER-010..012. Contracts: LLD-003.

### SRS-005 — Verified outcome and metric definitions

Source: REQ-005; BRD-OBJ-001; AC-013, AC-014, AC-015. CMP-005/004 shall require evidence-bound authorized acceptance and compute versioned snapshot/cohort metrics. Output declares denominators, currency, unknown cases, sample sizes and observational limits. Agent completion or absent evidence cannot produce accepted outcome; empty/zero-accepted cohorts return null metric. NFR-005; measurement: verdict authorization and frozen-cohort examples; lanes integration/manual; evidence VER-013..015. Contracts: FLOW-005, LLD-004/005.

### SRS-006 — Evidence-linked reporting

Source: REQ-006; BRD-OBJ-001; AC-016, AC-017, AC-018. CMP-004 shall provide daily overview, explicit-ID task timeline and evidence-linked queue through scoped snapshot reads. Output includes coverage, source watermarks and distinct no-data/unknown/stale states. Service/read failure must not fabricate zero usage; uncertain event order is labeled. NFR-003/004; measurement: seeded read API and UI walkthrough; lanes integration/manual; evidence VER-016..018. Contracts: FLOW-004, LLD-004.

### SRS-007 — Privacy, isolation and erasure

Source: REQ-007; BRD-OBJ-002; AC-019, AC-020, AC-021. CMP-001/002/003 shall enforce allowlisted exports, role/scope authorization and withdrawal/retention with replay-resistant erasure. Output includes rejection and purge/backup-expiry receipts, not raw content. Missing revocation state on restore fails closed; offline purge remains pending, never falsely complete. NFR-002/005; measurement: canary/scope/race/restore fixtures; lanes security/integration; evidence VER-019..021. Contracts: FLOW-007, LLD-001/002/005.

### SRS-008 — Governed improvement lifecycle

Source: REQ-008; BRD-OBJ-003; AC-022, AC-023, AC-024. CMP-005 shall retain redacted supporting/contrary evidence, reproducible version-bound paired evaluations, costs/failures/analysis overhead and independent review before human-authorized adoption. Output is proposed/evaluating/reviewed/promoted/rejected/rolled-back transitions with references. Missing review/authorization/rollback blocks promotion; untrusted history never acts as authority. NFR-005; measurement: candidate transition and paired-eval report review; lanes integration/manual; evidence VER-022..024. Contracts: FLOW-006, LLD-002/004.

### SRS-009 — Operational and pilot readiness

Source: REQ-009; BRD-OBJ-001/002/003; AC-025, AC-026, AC-027. CMP-001..005 shall keep collection off until approved enrollment, host, retention and named operational owners; a proposed two-week baseline starts only after explicit pilot authorization and synthetic qualification. Output includes reconciliation, quality guardrails and one end-to-end improvement disposition without savings promises. Missing safety decisions block activation, not drafting. NFR-001..005; measurement: readiness record and later synthetic/baseline reports; lanes E2E/manual; evidence VER-025..027. Contracts: all flows and readiness gates below.

## NFR targets and failure analysis

All numeric values in this section and contracts are **proposed acceptance targets, unmeasured and pending approval**. Qualification environment must state host, source fixtures and pinned versions; no implied production SLA.

| ID      | Target / invariant                                                                                                                                               | Measurement / evidence                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| NFR-001 | Zero synchronous agent-to-telemetry dependency; collectors stop/drop visibly at bounded outbox limits                                                            | Service-down and disk-full synthetic run; VER-008/009/025                                                |
| NFR-002 | No lost acknowledged valid events after process restart; no duplicate contribution for stable-ID replay; erasure active-store target 24h, backup expiry 30d      | Crash before/after commit, lost reply, erasure/replay/restore scenarios; VER-007/008/021                 |
| NFR-003 | At proposed 100,000 canonical metadata events, overview/task first page p95 ≤2s over 100 authorized local-network requests; ingest p95 ≤1s for 100-event batches | Seeded service benchmark with environment/coverage report; VER-016/025                                   |
| NFR-004 | Online successful export visible within 60s p95; stale label when enrolled source watermark is over 15min old, with offline/unknown-clock state separate         | Inject source delay and disconnect, compare server receipts/watermarks; VER-016/018/025                  |
| NFR-005 | No raw/sensitive export; no unauthorized scope/verdict; no fabricated numeric unknowns; equal canonical results under replay/copy/order permutations             | Closed-schema canaries, role matrix, normalization and identity fixtures; VER-004..007/010..015/019..024 |

Failure handling: unsupported adapter → disable affected source and show gap; service offline → bounded retry/outbox; clock skew → uncertain cross-source order; disk full → reserved gap/unknown interval; conflict → quarantine and operator disposition; wrong bucket overlap → null total; revoked evidence → unavailable reference and re-evaluation of verdict validity; corrupt DB → fail closed and controlled restore; key loss → incomplete identity coverage, no fresh pseudonym summation; denied scope → stop, do not reroute to another account.

## Verification trace matrix

VER numbers correspond one-to-one with fixed PRD AC numbers. Each planned case and expected observable result is specified in the walkthrough. **All runtime lanes NOT RUN.** Strong SRS declarations above own the SRS IDs; this table references rather than redeclares PRD IDs.

| SRS     | Source AC              | VER                       | Lane / evidence target                                           |
| ------- | ---------------------- | ------------------------- | ---------------------------------------------------------------- |
| SRS-001 | AC-001, AC-002, AC-003 | VER-001, VER-002, VER-003 | Security/integration: enrollment and provenance fixture report   |
| SRS-002 | AC-004, AC-005, AC-006 | VER-004, VER-005, VER-006 | Unit/integration: explicit correlation/unknown mapping report    |
| SRS-003 | AC-007, AC-008, AC-009 | VER-007, VER-008, VER-009 | Integration/E2E: replay/offline/overflow report                  |
| SRS-004 | AC-010, AC-011, AC-012 | VER-010, VER-011, VER-012 | Unit/integration: native normalization reconciliation            |
| SRS-005 | AC-013, AC-014, AC-015 | VER-013, VER-014, VER-015 | Integration/manual: acceptance and metric fixture report         |
| SRS-006 | AC-016, AC-017, AC-018 | VER-016, VER-017, VER-018 | Integration/manual UI: snapshot/timeline/state report            |
| SRS-007 | AC-019, AC-020, AC-021 | VER-019, VER-020, VER-021 | Security/integration: export/isolation/deletion/restore report   |
| SRS-008 | AC-022, AC-023, AC-024 | VER-022, VER-023, VER-024 | Integration/manual: candidate/evaluation/adoption report         |
| SRS-009 | AC-025, AC-026, AC-027 | VER-025, VER-026, VER-027 | E2E/manual: synthetic qualification, consent and baseline report |

## Data migration and parallel readiness

No production data migration is authorized. A future implementation must create empty versioned stores, disabled adapters and synthetic-only fixtures first; no automatic full-history import. Outbox/schema upgrades require backup, decoder compatibility and rollback verification. Store rollback cannot undo acknowledged revocation/deletion: control epoch state remains authoritative across binary rollback.

Parallel contracts for later implementation: identity/enrollment owner freezes LLD-001 and scope/epoch schema; adapter owner consumes those keys and emits LLD-002 fixtures; ingest owner consumes closed events and owns transactional receipts/revisions; reporting owner consumes canonical projections and frozen metrics; independent QA/security consumes the same fixture contracts. Contract changes return to maintainer review and affected AC/VER lanes. These are owner-aligned boundaries, not authorization to start implementation.

## ADR-001 — Single-writer asynchronous metadata aggregation

**Status:** Architecture direction approved in conversation on 2026-10-23; technical/security/retention bindings proposed pending review. **Decision owner:** Requesting maintainer.

**Context:** Two machines need trustworthy task-level usage/outcome evidence; process ledgers and source aggregate counters do not establish cross-machine identity. Collection must not block agents or export raw histories.

**Decision:** Explicit local enrollment and durable bounded outboxes; at-least-once metadata export; one authenticated single-writer relational service, proposed SQLite; explicit source identities/revisions and nullable provenance; deterministic scoped reports; reviewed learning lifecycle. Never sync an active SQLite file.

**Alternatives:** Manual separate local reports remain cheapest to abandon but cannot satisfy unified replay-safe identity without explicit consolidation. A managed distributed/event platform adds operational/account boundaries without a demonstrated two-machine need. Neither replaces this approved direction.

**Consequences:** Delayed visibility is acceptable and visible; single host availability is a reporting limitation. Stable original IDs and shared scoped mapping are prerequisites for copy dedup. Privacy erasure needs durable revocation state and restore discipline. Cost to abandon before activation is document/fixture work only; after activation export only approved redacted metadata under a new migration approval. First failure conditions: absent stable source identities, unapproved boundary/retention or no authorized host. Those disable affected ingestion/activation rather than weaken guarantees.

## Readiness and owned decision register

| Decision / gate                | Proposed contract                                                                                                      | Owner / required approval                                                                | Status / blocked scope                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| D-001 Host and operations      | One authorized service host, TLS, protected DB/backups, named restore operator                                         | Maintainer appoints engineering/operations/security                                      | Pending; activation blocked; no host probed                  |
| D-002 Enrollment and authority | Explicit project/account/source/time manifest; separate collector/read/verdict/admin roles; no automatic backfill      | Maintainer and security assignee approve permissions/provisioning/identity-key transport | Pending; collection and authoritative verdict writes blocked |
| D-003 Retention and erasure    | LLD-005 limits, revocation tombstones, backup expiry, offline purge and restore deny gate                              | Maintainer/privacy-security assignee approve policy and control-ledger ownership         | Pending; activation blocked                                  |
| D-004 Adapter qualification    | Pin actual installed runtime/decoder, stable native identities, containment and bucket semantics; unknowns remain gaps | Engineering/QA assignees; independent reviewer                                           | Pending; each unqualified adapter disabled                   |
| D-005 Pilot                    | Synthetic VER-025 first; explicit two-week baseline authorization; fixed cohort/rubric and quality guardrails          | Maintainer/acceptance owner authorizes after independent technical/security review       | Not authorized; no data enrollment or baseline start         |

Gate order: approve design-level safety/identity/retention contracts and NFRs, appoint implementation/review owners and authorize execution approach → implement against synthetic fixtures → run qualification and independent review → select/provision authorized host and actual credentials, qualify installed adapters, explicitly authorize enrollment/pilot → baseline and improvement disposition → human-reviewed adoption/monitoring. `implementation-readiness` checks design-contract approval and execution prerequisites only; D-005 pilot authorization and post-implementation VER-025 evidence cannot block synthetic implementation readiness. D-001 concrete host provisioning and D-004 installed-adapter qualification likewise gate activation rather than implementation against approved contracts. D-002/D-003 unresolved design safety choices block their dependent implementation slices; actual credential provisioning remains activation-only. No stage is authorized by document publication. Current design approvals remain pending, so this draft does not claim `design_ready`; later implementation readiness need not imply pilot readiness.

## Outcome report

Documentation authoring uses the existing [RunRecord](../../scripts/outcome/schema.ts) shape; no new machine-readable outcome fields. This records the planning slice, not a pilot or runtime test. `blocked` names the design-readiness gate, not a missing document.

```json
{
  "schema_version": 1,
  "run_id": "ags-effectiveness-srs-draft-20261023-114303",
  "slug": "agent-effectiveness-observability",
  "workflow": "design-solution",
  "feature_status": "blocked",
  "started_at": "2026-10-23T11:43:03Z",
  "completed_at": "2026-10-23T11:49:35Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001", "BRD-OBJ-002", "BRD-OBJ-003"],
    "requirements": [
      "REQ-001",
      "REQ-002",
      "REQ-003",
      "REQ-004",
      "REQ-005",
      "REQ-006",
      "REQ-007",
      "REQ-008",
      "REQ-009"
    ],
    "acceptance_criteria": [
      "AC-001",
      "AC-002",
      "AC-003",
      "AC-004",
      "AC-005",
      "AC-006",
      "AC-007",
      "AC-008",
      "AC-009",
      "AC-010",
      "AC-011",
      "AC-012",
      "AC-013",
      "AC-014",
      "AC-015",
      "AC-016",
      "AC-017",
      "AC-018",
      "AC-019",
      "AC-020",
      "AC-021",
      "AC-022",
      "AC-023",
      "AC-024",
      "AC-025",
      "AC-026",
      "AC-027"
    ],
    "srs": [
      "SRS-001",
      "SRS-002",
      "SRS-003",
      "SRS-004",
      "SRS-005",
      "SRS-006",
      "SRS-007",
      "SRS-008",
      "SRS-009"
    ]
  },
  "completed_evidence": [
    "Assigned planning brief and bounded repository source guidance read; technical contracts and verification plan documented",
    "Earlier parent-reported isolated trace passed with ok:true and issues:[] after heading correction; original dependency failure preserved in walkthrough",
    "Earlier parent-reported temporary document check passed: files=3, localLinksChecked=25, plannedVerificationCases=27, problems=[]; structural scope only",
    "Parent-reported independent reviewer 786b0db3-a833-4846-b250-cad5803503f6 closed P1 coverage/lineage and P2 authoritative attempt-start findings on SRS27D4/walkthrough5D32; no remaining material findings in scoped proposed-design review",
    "Final parent-reported post-correction structural checkpoint: isolated trace ok:true, slugs agent-effectiveness-observability, issues:[]; temporary document check ok:true, files:3, localLinksChecked:27, plannedVerificationCases:27, problems:[]; documentation structure only"
  ],
  "missing_evidence": [
    "Human technical/policy approvals and execution/activation authorization",
    "All product runtime, synthetic, security, evaluation and baseline execution evidence"
  ],
  "decision_needed": [
    "Maintainer approvals and named assignees for D-001 through D-005"
  ],
  "recommended_next_workflow": "implementation-readiness",
  "cost": { "source": "unavailable" },
  "agent": {
    "identity": "bounded-srs-author",
    "model": "openai-codex/gpt-6.1-sol"
  }
}
```

The timestamps above bound the observed technical-draft authoring checkpoint, not runtime verification duration. No host token/cost counters or rates were available to this author; consultation counts are not task billing. Documentation evidence and verification limits are recorded in the walkthrough.

## Change log

- 2026-10-23: Initial review draft under document-only authority. Preserved fixed trace; proposed identity/ingestion/accounting/privacy/read contracts and embedded ADR; no implementation, enrollment, pilot or runtime verification.
