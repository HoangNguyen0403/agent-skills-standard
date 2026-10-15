# Product-Evidence SDLC — contract decisions

Status: corrected review candidate; approval: pending H1 and independent re-review. Contract revision: `t01-v2`. Owner: T01 design; implementation owners below. This replaces the unaccepted `t01-v1` history/influence contract, not an implemented schema migration or human approval record.

## 1. Decisions and current-system evidence

| Decision | Selected contract / rationale | Evidence and rejected alternative |
| --- | --- | --- |
| D01 | Separate initiative ledger and existing delivery trace; no Outcome v2 | confirmed(`scripts/outcome/schema.ts:16-110`, `scripts/trace/types.ts`); adding product kinds would break existing consumers |
| D02 | Original authorship for all new packages, conceptual citations only | confirmed pinned license register; avoids importing protected expression or a mixed-license derivative without an explicit rights process |
| D03 | Node-native `.mjs`, Node >=20; money optional | confirmed root/MCP engines >=20; no Python/npm dependency in shipped resources; CONTRIBUTING's Node18 prose is stale relative to package engines and T08 must correct it |
| D04 | Exact decimal strings and BigInt cash accounting; binary64 only for discount factors | Avoid unsafe integer money, hidden rounding, and invented precision; no general financial library needed |
| D05 | Reuse package transport and ownership unchanged | confirmed `SkillSyncService.fetchSkill`, `isPackageResource`, `writeSkillForAgent`; scripts/assets/references and LICENSE/NOTICE already distributed with bytes and path preflight |
| D06 | Keyword-only PM methods; narrowly scoped common JSON trigger | confirmed `SkillIndex.matchFiles/matchKeywords`, `IndexGeneratorServiceImpl.assembleRouterIndex`; no global markdown trigger or default PM install |
| D07 | Explicit workflow selection never installs skills implicitly | confirmed `WorkflowSyncService.reconcileWorkflows/assembleWorkflows`; `true` remains true and arrays add only existing defaults; dependency gaps belong in portable workflow preflight |
| D08 | Test-only network redirect to a loopback fixture; real CLI and MCP processes | confirmed hardcoded GitHub endpoints and installed `node-fetch@2.7.0/lib/index.js:1452` uses `https.request`; no production endpoint override/backdoor needed |
| D09 | Validation returns structural findings and scoped readiness, never action authority | JSON attribution cannot authenticate approval, source truth, or consent; host/operator controls remain mandatory |
| D10 | T08 regeneration waits for T07 and all canonical package writers | Existing generator reads canonical local files; stale mirrors cannot prove current routing |
| D11 | One ledger retains exact prior record/authority snapshots; separate support influence from provenance DAG | F1/F2 confirmed documentary contradictions. Full bounded snapshots avoid an external service/store resolver and preserve immutable DEC refs. Archived bytes/identity are not authenticated; current action predicates remain explicit. |

### Options considered for D08

**Selected: child-process network-boundary redirect.** Load-bearing assumption: bundled CLI retains Node `https.request` transport through cross-fetch. First failure: a request bypasses the fixture or transport changes. Worst case: consumer proof accidentally uses the network; deny non-fixture network and fail closed. Cost to abandon: one test-only preload; no production state changes.

**Alternative: isolated DNS/TLS host environment.** Redirect GitHub hosts inside a container/network namespace with a test CA. First failure: host lacks container/CA isolation. Worst case: global trust-store pollution; never install a system CA. Cost to abandon: test container only. Not selected because the checked installed adapter supplies a smaller scoped mechanism. If preload interception fails against the built artifact, report the failure to the orchestrator; do not replace real sync with service mocks or change production URLs.

## 2. Ledger JSON v1 (T02)

Canonical path is `docs/product/<slug>/evidence.json`. `slug` matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`, maximum 40 characters. `product_id` is independent, same grammar with maximum 64 characters. A product's `strategy.md` and readable `research.md`/`value-review.md` point to this ledger and its IDs. They do not hold editable duplicate records.

T02 ships `assets/product-evidence.schema.json` (JSON Schema draft 2020-12) and `references/ledger-contract.md`, `references/authority-and-freshness.md`, `references/examples.md`. Schema describes closed objects/discriminated kinds; script enforces graph, filesystem, time, declaration, and gate semantics. No schema runtime dependency; the normative contract is this section, not an undeclared schema engine.

### 2.1 Common types and envelope

All objects reject unknown keys, except an optional `extensions` object whose keys must be namespaced `vendor.name`; extensions never supply authority, references, state, or arithmetic. All strings must be nonempty after trimming unless a rule explicitly permits an empty array/null. IDs/revisions are case-sensitive. Arrays of references/IDs contain no duplicates. Integers are JSON safe integers; nonfinite numbers are rejected by library entry points even though JSON cannot encode them. Dates are real Gregorian dates, not regex-only acceptance. Instants use UTC `YYYY-MM-DDTHH:mm:ssZ` (whole seconds); windows have start < end. No local timezone inference.

Root required keys:

| Field | Type / rule |
| --- | --- |
| `schema_version` | integer literal 1; any other value is `UNSUPPORTED_VERSION`, never migrated silently |
| `slug`, `product_id`, `revision` | slug/product grammar above; revision `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` |
| `synthetic` | boolean; true means training/test examples, never evidence of a real product |
| `updated_at` | UTC instant |
| `strategy_authority` | authority ID or null with `strategy_gap` nonempty; when nonnull `strategy_gap` must be null |
| `strategy_gap` | string/null as above |
| `authorities` | array of Authority objects; may be empty for proposal-only intake |
| `records` | array of the nine record kinds; may be empty for an explicitly unvalidated intake |
| `record_history` | required array of prior full record snapshots, empty initially; exact `(id,revision)` keys resolve historical bindings |
| `authority_history` | required array of prior full Authority snapshots, empty initially; exact `(id,revision)` keys resolve historical authority/bridge bindings |
| `bridges` | array of Bridge objects |
| `product_state` | State object |

`Ref = {id, revision}`; id matches `^(SRC|CLM|OPP|HYP|EXP|INV|DEC|MET|REV)-[0-9]{3,}$`; kind equals prefix. Each stable ID has exactly one current row in `records`; `record_history` may contain older revisions of that same ID. The exact pair resolves in their disjoint union, never implicitly to current. An absent ID is `DANGLING_REFERENCE`; an existing ID without the requested revision is `REFERENCE_REVISION` (structural). A retained prior pair is structurally valid, but an obsolete action binding is a scoped gap. No cross-initiative lookup or automatic retargeting. Section 2.6 freezes storage, graph, current-selection and history predicates.

`Scope = {segment, geography, window:{start,end}}`; segment/geography are nonempty opaque strings, window endpoints are UTC instants. Matching requires all four values equal, not textual similarity. Evidence with a broader original scope records that scope in source `origin.scope`; a claim's local scope is its explicitly reviewed applicability. Using evidence across scopes requires a newly reviewed claim in the target scope, not an automatic subset inference.

Every record requires `id`, `kind`, `revision`, `owner`, `scope`, `depends_on` (Ref array), `freshness`, and optional `extensions`. `owner` is attribution, not authentication. `depends_on` is the explicit provenance DAG over exact `(id,revision)` nodes; no same-ID self-dependency, all pairs resolve, and the union of current/history DAG edges is acyclic. Existing required inclusions below remain. All typed descriptive pointers also resolve but can form cycles. Action support uses the additional bounded per-kind **influence** relation in section 2.6, not just `depends_on`; no promotion of every descriptive pointer to a DAG edge and no recursive document crawling.

`Freshness = {status, rationale, reviewed_at, expires_at, review_triggers}`:
- status: `current | stale | disputed | unknown`; rationale always required; reviewed_at UTC/null; expires_at UTC/null; review_triggers nonempty string array.
- current requires reviewed_at and either expires_at or at least one non-clock review trigger. No universal TTL.
- at supplied `asOf`, expired records are effectively stale regardless of stored `current`; reviewed_at/retrieved_at cannot be in the future. Equality at expiry is stale.
- event triggers cannot be authenticated by the validator; the caller must mark them stale/disputed when observed. A trigger description is not proof it did not occur.
- unsupported numeric confidence is not a field. Independent origins are inspectable, never converted to a source-count probability.

### 2.2 Authority and delivery bridges

`Authority = {id, domain, locator, revision, owner, scope, declared_ids, access}`:
- id `^AUTH-[0-9]{3,}$`; unique among current authorities (not a tenth record kind). Prior full snapshots live in authority_history; exact `(id,revision)` uniqueness across both arrays.
- domain `strategy | business | requirements | technical | authorization`.
- locator exactly `{kind:"local",path,sha256}` or `{kind:"external",uri,snapshot_sha256}`. Hashes are lowercase 64-hex; external snapshot hash may be null only with access `unavailable`.
- local revision is `sha256:<sha256>`; current available local authority must match current file bytes. Archived authority revision/hash is a retained declaration, not a request to read today's path as historical bytes or proof of past approval. External revision is a nonempty immutable revision token, never latest/main.
- scope as above; owner attribution; access `available | protected | unavailable`. Local validation reads only access available. External/protected pointers are never fetched, even when access says available.
- declared_ids: BRD-OBJ/REQ/AC/SRS grammar (3+ digits), unique. Strategy/authorization may use empty arrays. Current available local declared_ids must be declared in designated file, not cited: unfenced heading starting with ID, first ID after bold ID field, or whole first table cell equal ID; demote weak tables when strong declaration exists, reject remaining duplicates. Mirrors scripts/trace/parse.ts; shipped standalone, no repository import. Archived declaration lists remain supplied history assertions.

`Bridge = {record, authority_id, authority_revision, ids}`: record and authority resolve at exact retained pairs; IDs nonempty and subset of that snapshot's declared_ids. Current available local authority uses actual declaration scanning; archived declarations are historical assertions only. Business bridges accept BRD-OBJ, requirements REQ/AC, technical SRS; strategy/authorization are not bridge domains. A commit DEC must have a current business bridge to >=1 BRD objective; retained old bridges remain structurally valid but cannot satisfy that gate until a new decision/bridge binds current authority. Downstream readiness adds REQ/AC/SRS authority as available; nonexistent SRS is not demanded at discovery. No product IDs enter Outcome requirement arrays. Declaration/revision checks do not certify business sufficiency or source truth; existing audit:trace remains separate.

### 2.3 Kind payloads (required unless marked nullable)

Each record has exactly one `data` object with the following keys, in addition to common fields. Ref targets must have the listed kind; null is allowed only where explicitly stated.

| Kind | `data` fields and admissible states |
| --- | --- |
| SRC | `locator` (same local/external union as Authority), `origin:{publisher,origin_id,classification,revision,observed_at,scope}`, `retrieved_at`, `privacy:{classification,redaction,access}`, `license:{identifier,usage,restrictions}`, `status`, `limitations`. origin classification `primary|secondary|first_party`; origin_id stable URI/token identifying original observation, not the repost; observed_at UTC/null with a limitation when null. privacy classification `public|internal|restricted`, redaction `none|redacted|pointer_only`, access `available|protected|unavailable`. Restricted must be pointer_only/protected or unavailable. license identifier nonempty (`unknown` allowed), usage `citation_only|reuse_permitted|unresolved`, restrictions string array. status `available|unavailable|withdrawn`; limitations string array. License label is not a legal finding. |
| CLM | `statement`, `classification` (`confirmed|inference|assumption|unknown`), `sources` (SRC refs), `counterevidence` (SRC/CLM refs), `rationale`, `uncertainty`, `status` (`supported|unresolved|refuted|disputed`), `critical` boolean. confirmed requires >=1 available source; inference requires >=1 source and interpretation rationale; assumption/unknown never become observed findings by owner sign-off. sources must also be depends_on; counterevidence is descriptive so mutually disputed claims are legal. supported unknown/assumption is forbidden. |
| OPP | `problem`, `customer_job`, `claims` (CLM refs), `substitutes` (nonempty string array including explicit unknown if unresearched), `alternatives` (nonempty string array), `status` (`candidate|selected|deferred|rejected`), `rationale`. Claims appear in depends_on. No prioritization score becomes financial return. |
| HYP | `opportunity` (OPP Ref), `prediction`, `mechanism`, `claims` (CLM refs), `primary_metric` (MET Ref/null), `disconfirmation`, `status` (`proposed|testing|supported|refuted|inconclusive`). opportunity/claims in depends_on; metric descriptive. Supported requires a completed EXP linked by a DEC, not self-labeling alone. |
| EXP | `hypothesis` (HYP Ref), `method`, `eligibility`, `sample_plan`, `primary_metric` (MET Ref), `guardrails` (MET refs), `rules:{success,failure,inconclusive}`, `bounds:{starts_at,ends_at,budget_cap,currency,exposure_cap,stop_rules}`, `authorization` (DEC Ref/null), `status` (`proposed|authorized|running|completed|stopped`), `result:{classification,sources,limitations}`/null. budget_cap decimal string >=0 or null (unknown forbids execution); currency 3 uppercase letters/null alongside cap; exposure_cap safe integer >=0/null. stop_rules nonempty. completed needs result classification supported/refuted/inconclusive and nonempty SRC refs. proposed has null result; running/authorized require authorization pointing to experiment decision. Hypothesis in depends_on, primary_metric/guardrails/authorization descriptive. |
| INV | `alternatives` (nonempty array of `{name,rationale}`; include do-nothing/defer), `claims` (CLM refs), `financial_input` ({path,sha256}/null), `financial_result` ({path,sha256}/null), `nonmonetary` (string array), `status` (`proposal|reviewed|deferred|rejected`), `accounting_rationale`. Input/result either both present or both null; local path rules apply; validator checks hashes only, not recomputes finance. At least nonmonetary rationale or both financial artifacts required. Claims in depends_on. |
| DEC | purpose learning/experiment/investment/specification/uat/release/retirement/value_review; status proposed/recorded/superseded/revoked; outcome propose/authorize/reject/defer/risk_accept/scale/iterate/stop/inconclusive; consumes (Refs excluding SRC/DEC), critical_claims (CLM refs), authority_id (AUTH/null), authority_revision (string/null), strategy_binding (`{authority_id,revision}`/null), artifact_bindings (array `{path,sha256}`), decided_at (UTC/null), rationale, uncertainties (string array), revisit_triggers (nonempty string array), supersedes (DEC Ref/null). Authority fields null together or exact retained authorization pair; strategy binding exact retained strategy pair, required for recorded investment/specification/value_review, otherwise null. recorded needs decided_at and >=1 binding; current scope/revision/availability are gate predicates, not archive shape failures. proposed never authorize/scale/stop/risk_accept. authorize only learning/experiment/investment/specification/uat/release/retirement; scale/iterate/stop/inconclusive only value_review; risk_accept only investment/release. consumes/critical_claims also in depends_on; supersedes same purpose/scope separate acyclic relation. |
| MET | `definition`, `unit`, `denominator`, `query` (SRC Ref/null), `query_revision` (string/null), `baseline:{value,source,window}`/null, `baseline_exception` (DEC Ref/null), `comparison_window`, `eligibility`, `target`, `guardrail`, `measurement_owner`, `review_trigger`, `status` (`planned|instrumented|observed|unavailable`). value decimal string; source SRC Ref; query_revision must equal query origin revision; baseline XOR baseline_exception for release use. planned may have neither. observed/instrumented require query and query_revision. Baseline window must end <= comparison start; exceptions must be recorded release risk_accept decisions bound to this MET scope/revision. |
| REV | `decision` (DEC investment Ref), `hypotheses` (HYP refs), `metrics` (MET refs), `observations` (SRC refs), `actual_costs` (SRC refs), `attribution:{classification,rationale,confounders}` (`descriptive|causal_supported|unknown`), `recommendation` (`scale|iterate|stop|inconclusive`), `limitations`, `reviewed_at`. All non-DEC evidence in depends_on; observed metrics and sources required for scale/causal_supported. Inconclusive may have empty observations with explicit limitations. No financial/causal success inferred from released delivery state. |

Payload type closure: otherwise-unannotated scalar fields in the table are nonempty strings; `limitations`, `uncertainties`, `confounders`, `restrictions`, `nonmonetary` and all rule/trigger collections are string arrays as specified, possibly empty unless a nonempty rule applies. `rules` values are strings, not executable expressions. EXP bounds dates are UTC and starts_at < ends_at; budget_cap uses unsigned decimal-string grammar with <=4 fraction digits and bounded safe minor units, currency is null iff cap is null. MET baseline values allow signed fixed decimals (a measurement may be negative); no exponent/nonfinite value, <=8 fraction digits. SRC observed_at <= retrieved_at <= asOf; DEC decided_at, REV reviewed_at, root updated_at/assessed_at and history at <=asOf. Future experiment/comparison windows are legal plans. Referee review must determine whether source scope truly supports a claim; the validator checks explicit scope identity for DEC/HYP/EXP/MET/INV/REV it consumes, not semantic source applicability.

Once recorded, the complete DEC row (including revision, bindings, freshness and payload) is immutable by contract; validator input alone cannot prove prior bytes were not edited. Revocation/supersession uses a new DEC ID in the same purpose/scope with supersedes pointing to the exact old row; recorded reject revokes, other recorded outcomes supersede. Derive retirement from the acyclic supersession relation without rewriting either row. A proposed DEC may be revised/archived before recording, but no same-ID revision may replace an already recorded DEC. Two recorded successors of one DEC require DECISION_SELECTION_REQUIRED on that lineage, never newest-wins. Explicit imported superseded/revoked labels cannot satisfy gates. State history refs retain exact DEC payloads. Counterevidence/negative snapshots are retained, not erased; re-review requires new current claims/decisions with rationale, never an automatic truth upgrade.

### 2.4 State machine and authority invalidation

`State = {value, reason, scope, hypotheses, decision, assessed_at, history}`. value one of `unvalidated|validating|validated_for_scope|invalidated|inconclusive|not_applicable`; reason nonempty in every state; hypotheses HYP Ref array; decision DEC Ref/null; assessed_at UTC. History entries `{from,to,at,reason,decision}` ordered by strictly increasing instant, adjacent continuity, final to equals value. Empty history is valid only for initial unvalidated or not_applicable. Repeated same-state assessments are not transitions; keep their evidence as DEC/REV records.

Allowed transitions:
- unvalidated -> validating / not_applicable.
- validating -> validated_for_scope / invalidated / inconclusive.
- validated_for_scope -> validating / invalidated / inconclusive.
- invalidated or inconclusive -> validating / not_applicable.
- not_applicable -> unvalidated.

All other transitions rejected. `validating` needs >=1 HYP and recorded experiment/learning DEC; it does not mean execution is host-authorized. `validated_for_scope` needs >=1 HYP, a recorded investment DEC, matching scope/revisions, completed supporting EXP results and supported HYP, current supported critical CLMs, and no refuted result/disputed counterevidence left unexplained. `risk_accept` never upgrades to validated: commit can be proposed under explicit risk acceptance while product remains inconclusive/unvalidated. invalidated/inconclusive must preserve negative/uncertain evidence and link a DEC. not_applicable requires reason and recorded scoped decision for governed existing work; initial intake may have proposed decision but cannot pass commit/release on that basis.

Material changes to scope, hypothesis/price/finance/budget/exposure/metric/guardrail/source/authority bindings invalidate only non-retired recorded decisions reached by the influence predicates in section 2.6. Return their sorted IDs in affected_decisions in all modes. Stored state/history is unchanged; effective_product_state becomes inconclusive only if the root's claimed validating/validated proof is affected. Structural mode emits warnings, readiness not_assessed, exit 0 for a coherent ledger with obsolete bindings. An action gate upgrades only its selected proof's findings to gaps/readiness blocked/exit 3; unrelated affected decisions remain warnings and do not block it. Superseded/revoked decisions cannot satisfy a gate; prior unaffected decisions remain usable. No delivery-state regression, unrecorded-event inference or human authentication.

Error classification: malformed schema/transition/ref kind/ID, missing exact revision, duplicate current ID or duplicate pair, provenance/supersession cycle and bad current declaration are structural errors (exit 1; valid false/readiness blocked). Legitimate retained obsolete refs, scope mismatch of an approval, freshness/availability failures and unmet state-proof predicates are warning/gap findings, not structural failures. Current readable Authority/SRC hash versus current bytes is structural HASH_MISMATCH; archived pointers are never read, and old DEC/INV artifact bindings versus current bytes are warning/gap HASH_MISMATCH. Current required I/O/path/version/limit errors exit 2. A recorded DEC may retain an old authority snapshot with matching original scope and revision: old != current is a scoped AUTHORITY_REVISION finding, not a missing pair. Structural invalidity blocks every assessment, unlike legitimate evolution. All output/exit precedence remains section 3.1.

### 2.5 Trusted-root and URI rules

`--authority-root` is required: existing absolute narrow directory, never filesystem root or user home, canonicalized once. CLI ledger file is an existing regular file inside this root; absolute ledger argument allowed only inside root. Library ledgerPath is the same absolute contained location even when value was supplied in memory. Data-level local paths are POSIX relative, no backslash, NUL, absolute/drive prefix, `.`/`..` segment, URI encoding, query, or fragment. Every component below root is inspected by lstat; reject symlinks, devices, FIFOs, directories as files, and escape via realpath/path.relative. Read bounded files without following symlinks (O_NOFOLLOW where supported); validate before/after identity on platforms lacking it; concurrent mutation is `INPUT_CHANGED`, not approval. These are local checks, not a hardened sandbox: host must deny adversarial concurrent writes during validation/action.

SRC local pointers are checked/read only when public/internal + available; protected external references stay opaque. External URI allowlist: credential-free HTTPS or `urn:<namespace>:<opaque>` with namespace `[a-z0-9][a-z0-9-]*`; reject userinfo, control chars, `file:`, `data:`, `javascript:`, shell/tool schemes, and token-bearing query keys (`token`, `key`, `secret`, `password`, `signature`, `credential`, case-insensitive). No remote fetch, scripts, query execution, redirects, globbing, environment interpolation, or content-as-instructions. Restricted-store URNs identify authorized redacted pointers without access credentials. Privacy content cannot be fully classified automatically; authors and host access policy remain responsible. Diagnostics emit JSON pointers/IDs and sanitized functional messages, not source contents, credentials, absolute paths or protected URIs.

### 2.6 Retained revisions, bounded influence and assessment selection

**Storage and integrity (F1).** A candidate contains one current row per ID plus full prior snapshots in record_history/authority_history. Every archived ID must have a current row; every `(id,revision)` appears once across its two arrays. Revision tokens are opaque, never ordered by numeric/lexical value; array membership selects current. To change any record field, first retain its old complete row and create a new current revision; same-ID proposal/evidence evolution is legal. Do not delete referenced revisions, sources/counterevidence, old bridges or state-history decisions. No recorded DEC can have a later same-ID row; replace it with a new DEC ID. Imported historical superseded/revoked labels are descriptive, not verified approvals. Global shape/pair/DAG checks cover archives, but historical freshness/declaration/artifact claims are not revalidated against today's bytes. A missing historical pair remains structural; an extant obsolete pair never becomes a dangling-reference error. Caps count all snapshots/references; exhausting retention capacity requires an accountable project's explicit archival/new-ledger policy, not silent pruning or an unbounded resolver.

The schema remains schema_version 1 because this is an unimplemented, unaccepted first contract; t01-v2 adds mandatory arrays to the candidate specification, not a shipped v1 migration. Stored history is evidence of what the supplied document says, not authenticated prior payloads: all validator outputs additionally include limitation historical_payloads_not_authenticated. The project must preserve immutable ledger/approval artifacts in its authorized revision history for independent comparison; the resource neither fetches that history nor certifies it.

**Three separate relations.** (1) Structural exact-pair resolution validates every typed pointer. (2) Explicit depends_on is an acyclic provenance graph over the retained union. (3) Influence follows the mandatory support pointers below in addition to depends_on; it may contain descriptive cycles and is evaluated by a visited worklist, not topological recursion. Supersedes is a separate acyclic DEC lineage, never evidence support; REV.decision is exact historical attribution, never a current authorization edge. State history and archived bridges are historical bindings, not current proof roots. No traversal of arbitrary strings/extensions, source documents or nonlisted descriptive fields.

| Kind | Influence pointers / non-record bindings | Role and predicate |
| --- | --- | --- |
| SRC | depends_on derived-origin refs; current locator/origin/privacy/status/license limits | evidence; available status/access and current freshness needed for positive support. External available snapshots remain opaque with source_truth_not_verified; protected/unavailable cannot be treated as verified observed support. No semantic origin independence or license certification. |
| CLM | sources and counterevidence, plus depends_on | evidence; positive authorize needs confirmed/inference + supported, current usable sources and explicit uncertainty. Counterevidence is followed without DAG insertion; stale/disputed/unavailable negative evidence is not discarded or treated as a positive result. A new reviewed claim may explain contradictions, but script does not certify its rationale. |
| OPP | claims, plus depends_on | evidence; selected opportunity/current claims required by investment; no source-count certainty. |
| HYP | opportunity, claims, nonnull primary_metric, plus depends_on | evidence; validated proof requires supported HYP and completed supporting EXP explicitly consumed by its investment DEC. The metric pointer carries measurement support, although it remains descriptive in the DAG. |
| EXP | hypothesis, primary_metric, each guardrail, all result.sources when result nonnull, plus depends_on; authorization when status authorized/running/completed/stopped | evidence; usable result requires completed + classification supported for validation (refuted/inconclusive cannot validate). Current primary and guardrail MET/query/baseline support is required; observed status for completed results, instrumented/observed for execution proposals. Every non-proposed execution/result has recorded experiment authorization with same scope and matching frozen plan/bounds; completed/stopped history is not consent proof. Authorization DEC is visited as plan role below. |
| INV | claims, plus depends_on; financial_input/result paths/hashes if present | evidence; reviewed investment, current artifacts and explicit nonmonetary/accounting rationale. Changed financial artifact hash affects only consuming proof; validator does not recalculate returns. |
| DEC | consumes, critical_claims, plus depends_on; exact authorization + strategy_binding pairs, artifact_bindings, bridges on exact DEC | Current recorded non-retired status/freshness, authorization scope/revision/availability and readable approval artifacts; relevant strategy_binding must equal root strategy_authority's current pair and scope (investment/specification/value_review only). Missing strategy -> AUTHORITY_UNAVAILABLE; changed retained strategy -> AUTHORITY_REVISION. supersedes excluded from support. No automatic strategy retargeting. |
| MET | nonnull query, baseline.source, baseline_exception, plus depends_on | evidence; current query source and query_revision equal that exact source origin revision; baseline current usable source, baseline window before comparison; baseline XOR exception at release. Exception is visited as exception role: recorded non-retired release risk_accept, same scope, consumes this exact current MET, current authority/artifact/freshness and explicit uncertainty; never missing-query/guardrail waiver. |
| REV | hypotheses, metrics, observations, actual_costs, plus depends_on | evidence; current measurement/source support; observed metrics/observations/actual-cost sources for scale/causal_supported as applicable, limitations preserve missing costs/data. decision resolves exact original investment DEC only as historical attribution (retired/obsolete permitted); it cannot supply action authority. A value_review DEC supplies that separately. |

For **evidence** nodes: the consumed exact pair must be current; old retained pair -> OBSOLETE_BINDING, current effective freshness stale/unknown -> STALE_EVIDENCE, disputed -> DISPUTED_EVIDENCE, unusable source/measurement -> EVIDENCE_UNAVAILABLE. Do not replace an old pair with the current payload in the proof; compare current only to detect change and report the gap. Compare scope identity for CLM/OPP/HYP/EXP/INV/DEC/MET/REV to the consuming proof's scope. SRC scope is recorded provenance with explicit claim applicability, not automatic geographic/window equivalence. Authority scope and current revision are exact; AUTHORITY_REVISION identifies a retained old authority binding. Old artifact hash -> HASH_MISMATCH; missing approval/financial artifact -> EVIDENCE_UNAVAILABLE, not a malformed Ref. Current available local source/authority bytes must still pass global hash/declaration checks; unavailable/protected pointers are opaque. Actual permission/read faults on files that must be read remain IO_ERROR/exit 2. A stale unrelated source without an active consumer creates no freshness issue or affected DEC.
Referenced execution authorization requires current non-retired recorded experiment/learning DEC with outcome authorize; baseline exception requires current non-retired recorded release DEC with outcome risk_accept. A reject/defer/propose/inconclusive, revoked/superseded helper or superseded selected approval yields AUTHORIZATION_REQUIRED on the helper/consuming proof, never automatic substitution with its successor. Legitimate negative decisions remain retained history; they cannot be used as action authorization. Purpose/outcome fields remain closed structural enums, while action applicability is a scoped gate predicate.

**Plan role avoids a lifecycle deadlock without changing old approval.** A completed EXP may refer to the same immutable experiment DEC that consumed the earlier proposed/authorized EXP revision. That DEC must bind a separately retained, unchanged plan artifact, not the hash of the evolving whole ledger/result document. In plan role, its EXP/HYP/MET pairs may be older only when frozen plan projections are exactly equal to current: EXP scope + hypothesis ID + method/eligibility/sample_plan/primary_metric ID/guardrail IDs/rules/all bounds; HYP scope + opportunity/claims exact refs + prediction/mechanism/primary_metric ID/disconfirmation; MET scope + definition/unit/denominator/query exact ref/query_revision/baseline/exception/comparison_window/eligibility/target/guardrail/measurement_owner/review_trigger. Compare corresponding HYP/MET projections for those ID pointers; no textual similarity or replacement ID. Only EXP status/result/authorization, HYP status, MET status, and common owner/revision/freshness may differ; current freshness is still checked. All other referenced pairs (including CLM/OPP/SRC) must be current. Walk EXP's hypothesis/primary/guardrail support but omit its result and authorization backedge in plan role; walk HYP/MET support normally under the same role. Any frozen projection difference is OBSOLETE_BINDING and requires a new authorization DEC. Thus adding results/changing lifecycle status does not erase or silently retarget an approval; changing prediction/query/guardrail/budget does invalidate it. In evidence role EXP result sources still influence investment/release proof.
Plan projections also compare common depends_on as unordered exact refs, except EXP/HYP/MET targets may use the corresponding lifecycle-compatible pair projection. Additional/removed dependency targets are material, not ignored common-field changes. Plan-role MET instrumentation/query/baseline support must be usable; HYP need not already be supported and EXP need not already be completed to authorize a plan. Evidence-role validation still requires supported/completed/observed predicates. Current guardrail/query/baseline evidence is never omitted by this lifecycle exception.

**Exception role** uses evidence predicates on the exception DEC and all its support, but does not require baseline on the referenced MET for which that exact DEC supplies the exception. Traverse its query/guardrails/other support normally. The MET->exception DEC->same MET descriptive cycle terminates at visited `(pair,role)`; do not suppress any source edge or unrelated failure. Role exceptions never waive unknown/disputed critical evidence or authenticate risk acceptance. Helper release DECs referenced exclusively as MET baseline_exception are excluded from normal release selection; otherwise an exception plus ordinary release DEC would create false ambiguity. A helper used as a primary gate still needs all ordinary release predicates.

**Current proof roots and results.** Candidate DEC roots are current stored recorded rows not retired by a recorded successor/imported status; obsolete roots remain candidates (they must not disappear to avoid reporting affected IDs). Experiment/learning authorization roots use plan role even when assessed independently, so their own archived plan refs do not create a lifecycle deadlock. MET exception helpers use exception role. Other DEC roots use evidence role. Validate every candidate's role-specific closure, but only the selected gate proof creates gaps; root State proof findings are scoped to its root. Commit selects product_state.decision; experiment selects it when validating, else the unique current scoped experiment/learning candidate; release selects the unique scoped non-helper release candidate. Ambiguous lineage/selection is a selected gate gap. State's effective proof uses its exact decision/hypotheses and supporting experiments; obsolete/failed proof converts validating/validated_for_scope to effective inconclusive without changing stored transitions. For release/experiment an unrelated failed investment state proof stays a warning and adds no unstated global validation requirement. Selecting another investment requires an explicitly prepared root State view with its own genuine transition evidence, not newest-wins.

For every failed candidate closure add its root DEC ID to affected_decisions, including authorization/exception helpers themselves when their own predicates fail; exclude retired historical DECs even if old support is now stale. Propagate failed helper support to all active consuming candidates. Gate-required missing records/predicates on proposals yield proposal_only/AUTHORIZATION_REQUIRED or blocked as section 3.1 defines, never affected recorded IDs for a merely proposed row. Coalesce proof issues to one per `(root DEC,code)` at `/records/<current DEC index>`, record_id=root DEC ID, sanitized fixed functional message; role failure priority is OBSOLETE_BINDING for a retained noncurrent record, AUTHORITY_REVISION for retained noncurrent authority, then current freshness/availability/scope/artifact predicates. If a current pair is obsolete, do not emit additional freshness findings for its archived payload. Structural errors keep their actual offending field path, and root-state-only missing predicates use /product_state. All codes affecting unrelated roots are warnings, selected root/helper closure gaps; sorted issue arrays/exit precedence unchanged. Historical-payload limitation is always present, even without archives.
Proof issue messages are fixed: OBSOLETE_BINDING -> "Recorded proof binds an obsolete retained revision."; AUTHORITY_REVISION -> "Recorded proof binds an obsolete retained authority revision."; other proof codes -> "Recorded proof does not satisfy <CODE>." with CODE from the closed code set, not user content. Selected helper failures have gap severity on both helper and consuming selected root; unrelated roots stay warning. Do not emit root-state duplicates of the same DEC proof issue.

## 3. Resource interfaces and errors (T02/T04)

Resources ship under their skill's `scripts/`; assets/references are sibling directories. Ordinary agents: `<agent-skill-root>/<category>/<skill>/scripts/<resource>.mjs`; Kiro: `<agent-skill-root>/<category>-<skill>/scripts/<resource>.mjs`. Resolve companion assets from `import.meta.url`, never cwd or monorepo paths. Invoke with `node`, not executable permissions. Do not auto-run during install or MCP lookup.

Node >=20.0.0, built-in modules only. Resources check runtime in direct CLI mode; no global installation, connector or environment credentials. Library import has no I/O/stdout/exit side effects. Guard CLI main by resolved argv entry URL; importing a resource never executes main.

### 3.1 Validator

```
node <installed>/scripts/validate-product-evidence.mjs <ledger.json> --authority-root <absolute-root> --as-of <UTC-instant> [--gate structural|experiment|commit|release]
```

Exactly one positional input; required root/as-of; gate defaults structural. --help is standalone, stdout usage/exit 0; unknown/repeated/missing flags or extra positions exit 2. No stdin/output-file flag. File/referenced readable files <=1 MiB each; <=100 current+historical authorities, <=2000 current+historical record snapshots, <=10000 total stored reference occurrences including history/bridges/state, <=128 state transitions, <=256 distinct read files, depth <=64. Caps include archives, so history cannot evade bounds; LIMIT_EXCEEDED never truncates. Influence traversal visits each `(pair,role)` once per decision, at most three roles (evidence/plan/exception); O(D*(V+E)) <=2000*3*(2000+10000), no recursive expansion/cross-document graph. T09 records maximum-fixture duration without inventing an SLO.

Export `async validateProductEvidence(value, {authorityRoot, ledgerPath, asOf, gate = "structural"})`. It returns the envelope below; it does not throw on user input. Programmer/runtime faults become `INTERNAL_ERROR` in CLI, while library may throw unexpected implementation faults for callers to diagnose. Expected I/O errors return issue envelopes.

```json
{
  "schema_version": 1,
  "tool": "product-evidence-validator",
  "valid": true,
  "gate": "structural",
  "readiness": "not_assessed",
  "effective_product_state": "unvalidated",
  "affected_decisions": [],
  "issues": [],
  "limitations": ["source_truth_not_verified", "human_authorization_not_authenticated", "historical_payloads_not_authenticated"]
}
```

readiness not_assessed|proposal_only|eligible_for_host_check|blocked; effective_product_state is computed root state or null for unreadable/malformed root state. Issue={code,severity,path,record_id,message}, severity error|gap|warning, path RFC6901 (empty for input), record_id string/null. ASCII sort by path/code/record_id; no duplicates. valid means absence of structural/input/internal error, never gate approval. Issues about unrelated obsolete proofs remain warnings even during action assessment. Error envelope keeps all keys, valid false/readiness blocked; affected_decisions is sorted unique non-retired recorded DEC IDs whose proof is affected, not all historical rows.

Gate-specific required evidence:
- structural: validate every stored shape/exact pair/DAG/supersession/declaration and current readable local hash/path. Evaluate current candidate proofs for warnings/affected IDs, not global freshness blocking. Archived record/authority/artifact bytes are not read or certified. Protected/external current authority is warning when unused and gap only when needed by selected gate. Synthetic never eligible for any action gate.
- experiment: selected root state's DEC is recorded learning/experiment with complete EXP proposal, finite budget/exposure/time/guardrails and matching bindings. No recorded authorization -> proposal_only + `AUTHORIZATION_REQUIRED`, exit 3. Approval name alone does not satisfy host authority.
- commit: selected state decision is recorded investment authorize/risk_accept, INV and opportunity/hypothesis evidence, business bridge. authorize requires validated_for_scope; risk_accept requires explicit scoped uncertainty/limits and does not change product state. Critical stale/disputed/refuted/unknown evidence blocks authorize; risk acceptance documents the gap but does not claim validation or authenticate approval.
- release: recorded release DEC consuming measurement METs and existing requirements/UAT/release authority references; every MET has baseline evidence or scoped exception, owner, query/instrumentation evidence, guardrails and review trigger. This supplements rather than replaces existing delivery/release gates.

Root state selects investment for commit; release selects the unique current non-retired scoped release DEC excluding MET-only baseline-exception helpers. Zero/multiple candidates -> DECISION_SELECTION_REQUIRED. Experiment selects the root experiment/learning decision while validating, otherwise the unique scoped experiment/learning candidate. Section 2.6 freezes role-specific proof selection; no newest-wins or execution.

CLI stdout exactly one JSON object + LF (except help); expected-error stderr empty. Exit precedence: 4 internal > 2 invocation/JSON/version/I/O/path/limit > 1 structural > 3 selected action gaps > 0 coherent structural or complete gate eligible only for host check. proposal_only exits 3 for action gates; 0 never authorizes action. Codes: INVALID_ARGUMENT, INVALID_JSON, UNSUPPORTED_VERSION, IO_ERROR, UNSAFE_PATH, INPUT_CHANGED, LIMIT_EXCEEDED, INVALID_FIELD, DUPLICATE_ID, DANGLING_REFERENCE, REFERENCE_KIND, REFERENCE_REVISION, DEPENDENCY_CYCLE, INVALID_TRANSITION, BRIDGE_DECLARATION, HASH_MISMATCH, SCOPE_MISMATCH, STALE_EVIDENCE, DISPUTED_EVIDENCE, EVIDENCE_UNAVAILABLE, OBSOLETE_BINDING, AUTHORITY_REVISION, AUTHORITY_UNAVAILABLE, AUTHORIZATION_REQUIRED, DECISION_SELECTION_REQUIRED, SYNTHETIC_EVIDENCE, INTERNAL_ERROR. Sections 2.4/2.6 distinguish missing pairs from obsolete retained bindings. No source/legal/consent/authentication claim.

### 3.2 Calculator

```
node <installed>/scripts/evaluate-investment.mjs <scenario.json>
```

One positional regular JSON input, no stdin or implicit default file. `--help` alone exits 0; all other flags rejected. <=1 MiB input, <=3 scenarios, <=1000 line items per scenario, horizon <=600 periods. Export synchronous `evaluateInvestment(value)` with no I/O; expected input errors return envelope, unexpected faults may throw. CLI reads input, catches faults. Error issue shape/sorting same as validator. Exit 0 for coherent evaluation including unavailable/undefined monetary results; 1 invalid financial/schema data; 2 invocation/JSON/version/I/O/limits; 4 internal fault. No exit 3: missing financial assumptions are explicit results, not experiment permissions.

T04 ships `assets/investment.schema.json`, `references/financial-contract.md`, `references/examples.md`. Input has exactly:
- `schema_version:1`, `analysis_id` (slug grammar, <=40), `currency` (3 uppercase ASCII letters; caller supplies real ISO4217 identity, calculator does not maintain currency tables), `money_scale` integer 0..4, `price_basis` (`nominal|real`), `price_date` Gregorian date, `horizon:{start_date,period,periods}` (`period` month/year, periods 1..600), `cohort`, `counterfactual`, `accounting_boundary`, `discount` object/null, `scenarios` array.
- Start date is a labeling/date origin, not actual/365 math. Period 0 is start, period 1..N declared monthly/yearly period-end cash points. No mixed currencies, cohorts, horizons, real/nominal basis, or currency conversion inside an analysis. Compare separate analyses only with a reviewed external conversion.
- `discount={rate,convention:"effective_annual",price_basis}`; rate nonnegative decimal string <=1 (0..100% effective annual), max 8 fractional places; basis equals input. null means NPV unavailable, not implicit 0%. Explicit zero is permitted.
- scenario `{id,label,assumptions,items,nonmonetary}`; id exactly base/downside/upside, unique, base required; label/rationale nonempty; assumptions nonempty string array; no probability or scenario averaging; nonmonetary string array may be empty.
- item `{id,side,category,mechanism_id,period,amount,currency,basis,netted_cost_categories,rationale,evidence_ids}`; id slug <=64 unique per scenario; side benefit/cost/capacity; period safe integer 0..N; currency equals analysis for monetary, null for capacity; basis `gross_revenue|contribution_margin|cash_saving|cash_cost|capacity_hours`; evidence_ids CLM/SRC grammar, references for attribution only (calculator does not read ledger).
- category for benefit: acquisition/conversion/retention/expansion/cash_saving; cost: development/acquisition/operations/support/experiment/other; capacity: capacity. amount decimal string or null; null explicitly unknown. Monetary decimal grammar `^(0|[1-9][0-9]*)(\\.[0-9]+)?$`, fractional digits <= money_scale, nonnegative, maximum individual and aggregate absolute minor-unit magnitude <=9007199254740991. Capacity uses same nonnegative grammar with <=4 fractional digits. Signs, exponent notation, separators, numbers instead of strings, NaN, Infinity, negative/refund/reversal amounts rejected; reverse flows must be re-authored as positive opposite-side incremental flows with accounting review, not silent coercion.
- `netted_cost_categories`: string array of cost categories; nonempty only for contribution_margin benefit. contribution margin already deducts those categories, so any explicit cost item with same category in this scenario is rejected `DOUBLE_COUNTED_COST`; no subtracting COGS twice. Gross revenue must list all incremental eligible cash costs separately; omitted costs cannot be inferred as zero. `accounting_boundary` states inclusions/exclusions and whether fixed/sunk costs excluded. Finance owner verifies completeness; script cannot discover omitted costs.
- No duplicate `(side,category,mechanism_id,period)` or `(benefit,mechanism_id,period)` even with different IDs/category aliases. Use a disjoint mechanism ID only with rationale. Same acquisition/cohort revenue may not be counted again as retention/LTV/contribution-margin benefit: prohibit overlapping mechanism IDs in the same period and require assumptions explaining nonoverlap across different IDs. Arbitrary duplicate economics cannot be authenticated by a calculator. Capacity rows never enter B or C; saved hours are informational unless a separate finance-reviewed cash_saving mechanism documents actual avoided cash, with no double count.

Side/basis compatibility is mandatory: benefit uses gross_revenue or contribution_margin for acquisition/conversion/retention/expansion, and cash_saving basis for cash_saving category; cost uses cash_cost; capacity uses capacity_hours. Any other pairing is INVALID_FIELD. Contribution_margin lists the actual deducted categories (empty means no deductions, explained by rationale). No automatic tax/inflation/FX/discount/cost-rate estimation.

Arithmetic:
1. Parse money to integer minor units with BigInt, reject scale/range before summing. Sort scenarios base/downside/upside; items by period/id for deterministic output. No per-item rounding.
2. B=sum monetary benefits; C=sum monetary costs; null in either side makes that total unavailable, never 0. Empty monetary side is unavailable (missing inputs), not known zero: supply explicit `amount:"0"` item to declare zero. Known totals emitted fixed money_scale strings, net=B-C may be negative.
3. For known C>0 and known B: ROI=(B-C)/C, ROI%=100*(B-C)/C, benefit_cost=B/C. Use BigInt rational division, six fixed fractional digits, round half away from zero once at presentation. ROI can be -1 for B=0. Known C=0: ratio results undefined, null value, reason `zero_cost`; unknown C/B: unavailable, null value, `unknown_cost`/`unknown_benefit`. No infinity. Net can still be available at zero cost.
4. Payback uses undiscounted cumulative period net cash, never B/C or average annual returns. All B/C cash items must be known. If no net outflow ever: not_applicable/no_investment_outflow; otherwise earliest t after first negative cumulative balance where cumulative >=0 and stays >=0 through horizon is reached. Return integer period, no interpolation; a temporary crossing followed by loss is not durable. No durable crossing -> not_reached/null period; unknown cash -> unavailable. Output retains terminal_balance only. Horizon/start_date/period unit remain in paired input.horizon, and convention is contract t01-v2's undiscounted durable period-end rule; no new output fields.
5. NPV only when discount and complete known cash flows compatible with basis/timing exist: monthly r=(1+annualRate)^(1/12)-1, annual r=annualRate; NPV=sum net[t]/(1+r)^t, t=0 un-discounted. For numeric stability compute discount factor `(1+annualRate)^(-t/12)` monthly or `(-t)` annual directly, sum in ascending t using compensated summation. Convert bounded minor-unit net to binary64 only here; round final money minor units half away from zero. Reject nonfinite/unsafe output `NUMERIC_RANGE`; never emit NaN/Infinity. Independent NPV reference accepts max 1 minor-unit absolute difference to accommodate platform floating math; exact totals/ratios/payback must match byte-for-byte. No displayed rounded intermediate feeds other results. Missing discount -> unavailable reason missing_discount; missing cash -> unknown_cash_flow. Nonnegative rate boundary is deliberate; negative rates need another approved schema, not accidental support.
6. No investment recommendation/hurdle rate inferred from arithmetic. Nonmonetary-only input remains valid: totals/ROI/payback/NPV unavailable with reasons, nonmonetary and capacity preserved. Opportunity cost and displaced work stay rationale, not cash expense by default.

NPV-specific floating-error bound: when discount and complete cash flows request NPV, B+C in minor units must be <=1000000000000; larger analyses return NUMERIC_RANGE/exit 1 rather than asserting the 1-minor-unit tolerance at binary64's safe-integer boundary. Exact undiscounted accounting still accepts the larger general range when NPV is unavailable. Rate/period caps and compensated summation keep this declared narrower discount domain reproducible; finance inputs beyond it require a separately approved higher-precision contract, not an undeclared dependency.

Output exactly `{schema_version:1,tool:"investment-calculator",analysis_id,currency,money_scale,results,issues}`. On invalid input results=[]; analysis_id/currency/money_scale null if unreadable. Result `{scenario_id,benefit,cost,net_value,roi,roi_percent,benefit_cost,payback,npv,capacity,nonmonetary}`. Money/ratio entries `{status:"available|undefined|unavailable",value:string|null,reason:string|null}`. Available reason null. Payback `{status:"reached|not_reached|not_applicable|unavailable",period:integer|null,reason:string|null,terminal_balance:string|null}`; capacity entries `{id,hours:string|null,period}`. Output money uses fixed input scale; ratios/% exactly 6 places. Each scenario stands alone; an invalid scenario rejects the whole analysis, never silently drops downside.

Result reason precedence: benefit unavailable -> unknown_benefit, cost unavailable -> unknown_cost, net unavailable -> unknown_cash_flow. Ratios inspect unknown cost first, then known zero_cost, then unknown benefit. Payback reached has reason null, not_reached reason no_payback_within_horizon, not_applicable reason no_investment_outflow, unavailable reason unknown_cash_flow; terminal_balance is null only when cash is incomplete. NPV inspects missing_discount first, then unknown_cash_flow. Capacity sorted by period/id; monetary values normalize negative zero to positive zero. Result includes no probability or implicit hurdle recommendation.

Calculator issue code set: INVALID_ARGUMENT, INVALID_JSON, UNSUPPORTED_VERSION, IO_ERROR, LIMIT_EXCEEDED (exit 2); INVALID_FIELD, INVALID_AMOUNT, INCOMPATIBLE_UNITS, DUPLICATE_ITEM (repeated id), DOUBLE_COUNTED_BENEFIT (same benefit mechanism/period), DOUBLE_COUNTED_COST (netted category or duplicate cost mechanism/category/period), NUMERIC_RANGE (exit 1); INTERNAL_ERROR (exit 4). JSON/schema/type problems after successful parsing use INVALID_FIELD/exit 1 except unknown schema_version/limit. Expected issue severity error; warnings are not substituted for invalid accounting. Invalid-analysis output results=[] even if some scenarios were calculable.

## 4. Optional category, trigger and workflow contract (T03–T08)

PM category metadata: version `1.0.0`, tag_prefix `product-management-v`, last_updated implementation date, maintainer owner `HoangNguyen0403`, measured token_metrics after canonical drafts settle. No false upstream version/tag claims: public citations go in source references; no freshness upstream monitor unless a reviewed actual package dependency exists. Before release select reviewed immutable SHA in consumer `.skillsrc`; `product-management-v1.0.0` is not claimed published. Common/workflow version bumps and metrics belong to T08; no unrelated dependency changes.

Seven IDs: `product-market-research`, `product-customer-discovery`, `product-strategy`, `product-investment`, `product-experimentation`, `product-metrics`, `product-roadmap`. Every PM skill `triggers.files: []`. Exact narrow keyword triggers:

| Skill | Keywords |
| --- | --- |
| common-product-evidence | product evidence ledger; product decision authority; product evidence freshness |
| product-market-research | product market research; product competitive analysis |
| product-customer-discovery | product customer discovery; product research synthesis |
| product-strategy | product strategy decision; product opportunity framing |
| product-investment | product investment analysis; product ROI scenario |
| product-experimentation | product hypothesis validation; product experiment design |
| product-metrics | product measurement contract; product value review |
| product-roadmap | product roadmap prioritization; product portfolio trade-off |

Common file trigger only `docs/product/*/evidence.json`; T08 adds `file_routing.json: ["common"]`. No markdown candidate category expansion; no broad_globs/base_language additions. Installed PM gets an explicit static router row `Product discovery, investment, validation or value-review request -> <SKILLS>/product-management/_INDEX.md` only if installed/allowed. Keyword matching remains current whole-declared-phrase/word-boundary, case-insensitive; bare `market`, `metrics`, `ROI`, `strategy`, unrelated markdown and unrelated JSON must not activate these skills. Workflows explicitly `get_skill` dependencies when doing their defined tasks rather than relying on broad keyword synonyms. Do not add composites coupling PM to every engineering file.

Required available capabilities, checked before generating a readiness claim:
- discover-product: common-product-evidence + product-market-research + product-customer-discovery + product-strategy.
- validate-product: common-product-evidence + product-investment + product-experimentation; metrics when designing executable measurement.
- review-product-value: common-product-evidence + product-metrics + product-investment; roadmap only when proposing ordering changes.
- Financial calculation is optional; qualitative investment uses product-investment but does not demand monetary data.

Workflow `workflows:false`: none; omitted: current defaults only; explicit array: selected optional workflow(s) plus existing reconciliation of default spine only; true: all exported noninternal workflows, including three PM workflows. None of these cases implicitly adds product-management/common include overrides or bypasses exclusions. Selected workflows remain loadable even if dependencies absent: invocation emits `capability_gap` naming exact category/skill/resource/runtime and next safe action, preserves current Outcome feature_status and adds gap to missing_evidence. Examples: `product-management/product-investment not installed; opt in at a reviewed ref and sync`, `common/common-product-evidence excluded`, `evaluate-investment.mjs missing; repair package`, `Node >=20 unavailable; calculation not performed`, `analytics evidence unavailable; value inconclusive`. These are workflow payload fields/text, not new Outcome top-level fields or MCP tool schemas. Existing generic MCP missing-skill/setup guidance remains unchanged; workflow preflight supplies the precise product gap.

Incidents route incident-hotfix first; known low-risk maintenance direct dev-fix/delivery. Existing current approved decisions/specs reused by revision/scope; reopen only affected gap. Stale product evidence does not unrelease delivery. No experiment approval -> proposal-only, negative/inconclusive -> stop/pivot/bounded new learning/defer recommendation, never unconditional full build. Before rollout MET baseline or scoped exception + owner + instrumentation/guardrail + review trigger required. Value review can be inconclusive even after verified/released implementation.

## 5. Exact implementation change boundary and join

| Owner | Exact files / symbols and required change |
| --- | --- |
| T02 | `skills/common/common-product-evidence/{SKILL.md,references/ledger-contract.md,references/authority-and-freshness.md,references/examples.md,assets/product-evidence.schema.json,scripts/validate-product-evidence.mjs,evals/evals.json}`; `scripts/skill-tests/common-product-evidence/validate-product-evidence.test.mjs` + fixtures. Implement t01-v2 sections 2/3.1 including mandatory history arrays, three graph relations/roles, exact history/influence vectors and real normalized BRD fixture. No parser edits or inferred approval. |
| T03 | Three assigned PM `SKILL.md`, package-local references and evals; independently authored decision-led research, sampling/counterevidence and strategy views refer ledger IDs. |
| T04 | Assigned investment/experimentation `SKILL.md`, references/evals; `product-investment/{scripts/evaluate-investment.mjs,assets/investment.schema.json,references/financial-contract.md,references/examples.md}`; `scripts/skill-tests/product-investment/evaluate-investment.test.mjs` + fixtures. Implement 3.2 closed API; retain input.horizon + contract revision as timing metadata, no horizon/convention fields in output. Experimentation follows 2.6 immutable plan/result history and complete influence; no execution from JSON approval. |
| T05 | Assigned metrics/roadmap SKILL.md/references/evals; MET/REV contract, baseline/query/cohort/attribution, capacity/dependency/displaced-work ordering. |
| T06 | `.agents/workflows/{discover-product,validate-product,review-product-value}.md`; <=80 lines each, portable runtime/handoff/outcome/cost sections and exact capability preflight. |
| T07 | `.agents/workflows/{sdlc,brainstorm-feature,plan-feature,implementation-readiness,verify-work,deploy-release,publish-notes,retro-learn}.md`; conditional routing and scoped evidence links, incident/maintenance/prior-decision protection. `docs/{getting-started-product-owner,sdlc-workflow-quick-reference}.md`; usage and gap paths. |
| T08 | `skills/metadata.json`: PM category, common JSON candidate route, package/workflow versions/metrics. `cli/src/services/IndexGeneratorServiceImpl.ts`, method assembleRouterIndex: conditional PM keyword-only row; same signature. Existing `cli/src/services/__tests__/IndexGeneratorService.spec.ts`: installed/absent row and scoped JSON route. `scripts/audit-sdlc.ts`: private optional-workflow set and its rules, runtime/operator checks and explicit outcome-template validation for three new workflows; DEFAULT_WORKFLOWS and CORE_SDLC_CHAIN stay unchanged. `scripts/audit-sdlc.product-evidence.test.ts` new future node test for missing optional sections/budgets. `package.json`: only bounded product test command grouping and doc/runtime correction if needed, no dependencies. `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `skills/product-management/references/framework-map.md`. Run existing generator unchanged after join. |
| T08 tests | `mcp/test/SkillIndex.spec.ts`: extend real temporary skill fixtures with narrow common JSON/qualified PM keyword positives and unrelated negatives. `mcp/test/Tools.spec.ts`: actual bodies/gap guidance with those fixtures. `cli/src/services/__tests__/WorkflowSyncService.spec.ts`: optional array/true/omitted/false behavior with new workflows, defaults unchanged. Existing ownership/resource/transport tests remain, not copied into new tautological tests. |
| T09 | `scripts/skill-tests/product-evidence-integration/{consumer-smoke.mjs,registry-fixture.mjs,network-preload.cjs,consumer-smoke.test.mjs,fixtures/}` and `artifacts/runs/product-evidence-sdlc/verification/consumer-smoke.json`; section 6. Integration proof through real processes. |
| T10 | Frozen new eval manifests/transcripts/results/reports only after H2; source/package hashes and isolated blinded arms. No T01 live evals. |
| T11 | `docs/srs/product-evidence-sdlc/{final-review,release-dossier}.md`; independent contract/behavior/evidence/rights review and H3 readiness, not implementation patches. |

**Intentionally unchanged:** SkillSyncService, WorkflowSyncService, GithubService, SyncService, MetadataReader, ownership writers, manifest verifier, CLI constants/defaults/detection, mcp SkillIndex algorithms, tools public schemas/handlers, server/config/transports, scripts/trace and scripts/outcome, scripts/workflow-chain.ts, scripts/generate-indices.ts implementation. No exported existing symbol is added/renamed or signature changed. Language-server status returned `No language servers configured`; inspected concrete text callers instead: SyncService.applyIndices generates category indices at 494 and router at 526; generator calls assembleRouterIndex at 176; tests listed above. T08 must revisit references if an actual exported API change becomes necessary, not speculate now.

T08 generated-output barrier: wait for T02–T06 canonical packages/workflows and T07 shared integrations; freeze their source/resource hashes; then run `rtk pnpm generate-indices` once, review generated native mirrors/indices, run focused audits/tests/smoke against that same revision. Any canonical correction requires regeneration and re-verification; do not hand-edit mirrors or run generator while T07 writes. T09/T10/T11 consume the integrated pinned candidate, not a mixture of drafts.

## 6. Executable real-consumer harness contract (T09)

Entry: `rtk proxy node scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs --cli <absolute-built-cli-entry> --mcp <absolute-built-mcp-entry> --candidate-root <absolute-candidate> --out <verification-json>`; orchestrator builds once after drafts settle. Node22+ harness host because current CLI SyncService uses Promise.withResolvers; shipped standalone resources still require only Node20. Capture exact runtime/build/package/source hashes; do not infer resource runtime support from harness Node22 success. Include separate Node20 resource run when that runtime is available; absence is a reported coverage limit.

1. Make fresh temporary consumer, HOME and XDG_CONFIG_HOME; no node_modules, parent AGENTS/skills, user tokens, repo imports, inherited NODE_OPTIONS or model environment. Process executable paths are pinned arguments. Consumer `.skillsrc` selects a fixture GitHub registry URL, immutable candidate commit, agents codex/claude/gemini, optional workflows array, common include common-product-evidence and PM seven IDs; mcp disabled/prompted true, telemetry false, no specialists. Running real `sync` performs install; do not call writeSkills/transformers directly. Fixture latest metadata uses same candidate versions so `--yes` cannot silently change ref. Assert actual lock/bytes/resources, not exit code alone because SyncCommand catches failures.
2. Stdlib loopback `node:http` fixture serves GitHub repository info, commit resolver (40-hex body), recursive tree (real Git blob SHA1s), raw files, tags/update responses, and release MANIFEST responses when requested. Bytes come from frozen candidate source files, not copied fake SKILL bodies. Snapshot tree/notices/resources and its SHA256; record requested paths. Branch metadata aliases resolve to this snapshot, not live main. Release-only branches serve a scoped generated manifest or explicit 404 consistent with current service behavior. Deny unknown routes and all external egress.
3. Test-only `--require <network-preload.cjs>` changes `require('node:https').request` for api.github.com, raw.githubusercontent.com and github.com requests to `node:http.request` at fixture host/port, preserving method, path and original host in a fixture header, removing credentials. Match exact approved fixture owner/repo; reject other HTTPS requests, unexpected redirects or authorization headers. Also deny child HTTP targets except fixture loopback. This is only remote-network substitution; production cross-fetch, GithubService integrity, assembly, native transforms, ownership, config and lock writes all execute. Never patch SyncService/SkillSyncService/WorkflowSyncService/fs or return anticipated internal results. CLI transport migration invalidates preload assumption and fails harness.
4. Run `node <cli-entry> sync --yes`, then `verify --agent codex` (fixture network still isolated); inspect installed common/PM script bytes and hashes, reference contents, lock ownership, preserved custom override and unrelated user file on a second sync. Native Codex workflow SKILL.md, Claude commands markdown, Gemini TOML must contain the actual product workflow body/capability preflight. Execute standalone installed resources via `node` with cwd empty consumer; clear NODE_PATH/NODE_OPTIONS and reject imports outside installed package/builtins. Run AC005 scenario and validator happy/adversarial fixtures; assert parsed outputs/exit statuses. Libraries imported from installed resource paths give same results and no import side effects.
5. Connect SDK Client from existing mcp dependency through StdioClientTransport to real `node <mcp-entry>` with SKILLS_PROJECT_ROOT=consumer, MCP_TRANSPORT=stdio, telemetry disabled. Call initialize/listTools, get_skill(common,common-product-evidence), get_skill(product-management,product-investment), load_skills_for_keywords qualified phrase with force_reload true, load_skills_for_files ledger path and unrelated README, audit_session_compliance. Validate returned canonical bodies/provenance and selected IDs, not empty strings or mocks. Then restart and repeat in consumer with PM omitted/common resource excluded as separate negative fixtures; check generic MCP missing-body guidance and workflow-specific capability gap clauses, no false loaded-product body.
6. `get_workflow` currently scans only `<root>/.agents/workflows`; Codex/Claude/Gemini-only consumers do not install that canonical directory. For real get_workflow transport proof, run a separate fresh Antigravity consumer via actual sync (agent antigravity writes `.agents/workflows`) then call get_workflow for all three through real stdio MCP. Do not manually copy canonical workflows to pretend the native-only consumer has them. Also exercise list_workflows in Codex-only consumer and document that native workflow invocation exists but MCP canonical workflow lookup is absent there. No production scanner expansion required by this feature.
7. Repeat sync configuration variants explicit arrays, workflows:true without PM, omitted workflows, false. Optional three present only selected/all; none implicit in defaults; PM absent remains absent. Check the content contract gives exact dependency gap when agent invocation lacks pack/runtime/analytics. Harness proves export/loading/calculation, not stochastic agent obeying preflight: behavior pressure/evals and human host checks remain separate evidence.
8. Close SDK clients, processes and fixture, remove temp HOME/consumers/preload files in finally; emit report with step/command/exit/assertions/durations/hashes/limitations and nonzero harness exit for any failed assertion. Never publish results as efficacy or authenticate human names. One integrated candidate per report.

## 7. Synthetic examples and adversarial vectors

Examples are deliberately fictional; never cite them as customer interviews or observed product success. Complete structural intake example (no action authorization):

```json
{
  "schema_version": 1,
  "slug": "synthetic-intake",
  "product_id": "synthetic-product",
  "revision": "r1",
  "synthetic": true,
  "updated_at": "2026-10-11T10:00:00Z",
  "strategy_authority": null,
  "strategy_gap": "Synthetic intake has no approved strategy",
  "authorities": [],
  "records": [],
  "record_history": [],
  "authority_history": [],
  "bridges": [],
  "product_state": {
    "value": "unvalidated",
    "reason": "No research or approval supplied",
    "scope": {"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
    "hypotheses": [],
    "decision": null,
    "assessed_at": "2026-10-11T10:00:00Z",
    "history": []
  }
}
```

Complete nine-kind structural example. Create `docs/brd/brd-synthetic-nine.md` under the synthetic authority root with the exact UTF-8 bytes `# BRD-OBJ-001: Synthetic objective\n` (LF, no BOM). Its hash below is an actual digest of those explicit fictional bytes, not claimed customer research. HTTPS/URN source locators remain unfetched; all findings are illustrative. At asOf `2026-10-11T10:00:00Z`, structural validation can succeed with the external-source limitation; action gates cannot pass because synthetic=true and no recorded authorization.

```json
{
  "schema_version":1,"slug":"synthetic-nine","product_id":"synthetic-product","revision":"r1","synthetic":true,
  "updated_at":"2026-10-11T10:00:00Z","strategy_authority":null,"strategy_gap":"Synthetic example has no strategy approval",
  "authorities":[{
    "id":"AUTH-001","domain":"business",
    "locator":{"kind":"local","path":"docs/brd/brd-synthetic-nine.md","sha256":"8a8f21a25b1799f44743c9faa798603d731c20f5c8f0cab271d15672c656a2cf"},
    "revision":"sha256:8a8f21a25b1799f44743c9faa798603d731c20f5c8f0cab271d15672c656a2cf","owner":"synthetic author",
    "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
    "declared_ids":["BRD-OBJ-001"],"access":"available"
  }],
  "record_history": [],"authority_history": [],
  "records":[
    {
      "id":"SRC-001","kind":"SRC","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[],"freshness":{"status":"current","rationale":"Fictional example only","reviewed_at":"2026-10-11T09:00:00Z","expires_at":"2026-11-01T00:00:00Z","review_triggers":["example revision changes"]},
      "data":{"locator":{"kind":"external","uri":"urn:synthetic:source-001","snapshot_sha256":null},
        "origin":{"publisher":"synthetic publisher","origin_id":"urn:synthetic:original-001","classification":"primary","revision":"fictional-r1","observed_at":null,"scope":"Fictional test context"},
        "retrieved_at":"2026-10-11T09:00:00Z","privacy":{"classification":"public","redaction":"pointer_only","access":"unavailable"},
        "license":{"identifier":"unknown","usage":"citation_only","restrictions":["Not real research"]},"status":"unavailable","limitations":["No real observation occurred"]}
    },
    {
      "id":"CLM-001","kind":"CLM","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[{"id":"SRC-001","revision":"r1"}],"freshness":{"status":"unknown","rationale":"No observed evidence","reviewed_at":null,"expires_at":null,"review_triggers":["authorized research supplied"]},
      "data":{"statement":"A synthetic problem might merit study","classification":"assumption","sources":[{"id":"SRC-001","revision":"r1"}],"counterevidence":[],"rationale":"Test-only assumption","uncertainty":"No customer evidence","status":"unresolved","critical":true}
    },
    {
      "id":"OPP-001","kind":"OPP","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[{"id":"CLM-001","revision":"r1"}],"freshness":{"status":"unknown","rationale":"Proposal only","reviewed_at":null,"expires_at":null,"review_triggers":["evidence changes"]},
      "data":{"problem":"Synthetic test problem","customer_job":"Fictional task","claims":[{"id":"CLM-001","revision":"r1"}],"substitutes":["unknown"],"alternatives":["defer","study"],"status":"candidate","rationale":"No selection is approved"}
    },
    {
      "id":"HYP-001","kind":"HYP","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[{"id":"OPP-001","revision":"r1"},{"id":"CLM-001","revision":"r1"}],"freshness":{"status":"unknown","rationale":"Untested prediction","reviewed_at":null,"expires_at":null,"review_triggers":["test results"]},
      "data":{"opportunity":{"id":"OPP-001","revision":"r1"},"prediction":"A fictional intervention might reduce synthetic task time","mechanism":"Illustrative fewer steps","claims":[{"id":"CLM-001","revision":"r1"}],"primary_metric":{"id":"MET-001","revision":"r1"},"disconfirmation":"No task-time improvement in eligible test","status":"proposed"}
    },
    {
      "id":"EXP-001","kind":"EXP","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[{"id":"HYP-001","revision":"r1"}],"freshness":{"status":"unknown","rationale":"Not authorized or run","reviewed_at":null,"expires_at":null,"review_triggers":["authorization decision"]},
      "data":{"hypothesis":{"id":"HYP-001","revision":"r1"},"method":"Offline synthetic walkthrough proposal","eligibility":"Synthetic cases only","sample_plan":"Three fictional cases; no population inference",
        "primary_metric":{"id":"MET-001","revision":"r1"},"guardrails":[],
        "rules":{"success":"Eligible synthetic case time improves","failure":"No improvement","inconclusive":"Missing or conflicting cases"},
        "bounds":{"starts_at":"2026-10-12T00:00:00Z","ends_at":"2026-10-13T00:00:00Z","budget_cap":null,"currency":null,"exposure_cap":0,"stop_rules":["Never contact real people"]},
        "authorization":null,"status":"proposed","result":null}
    },
    {
      "id":"INV-001","kind":"INV","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[{"id":"CLM-001","revision":"r1"}],"freshness":{"status":"unknown","rationale":"No investment approval","reviewed_at":null,"expires_at":null,"review_triggers":["finance review"]},
      "data":{"alternatives":[{"name":"defer","rationale":"No evidence"},{"name":"study","rationale":"Resolve uncertainty"}],"claims":[{"id":"CLM-001","revision":"r1"}],"financial_input":null,"financial_result":null,"nonmonetary":["Illustrative learning"],"status":"proposal","accounting_rationale":"No monetary benefit or cost claimed"}
    },
    {
      "id":"DEC-001","kind":"DEC","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[{"id":"INV-001","revision":"r1"},{"id":"HYP-001","revision":"r1"},{"id":"CLM-001","revision":"r1"}],"freshness":{"status":"unknown","rationale":"No approval","reviewed_at":null,"expires_at":null,"review_triggers":["human review"]},
      "data":{"purpose":"investment","status":"proposed","outcome":"propose","consumes":[{"id":"INV-001","revision":"r1"},{"id":"HYP-001","revision":"r1"}],"critical_claims":[{"id":"CLM-001","revision":"r1"}],"authority_id":null,"authority_revision":null,"strategy_binding":null,"artifact_bindings":[],"decided_at":null,"rationale":"Proposal only","uncertainties":["No research or budget"],"revisit_triggers":["authorized evidence supplied"],"supersedes":null}
    },
    {
      "id":"MET-001","kind":"MET","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[],"freshness":{"status":"unknown","rationale":"Not instrumented","reviewed_at":null,"expires_at":null,"review_triggers":["measurement design review"]},
      "data":{"definition":"Synthetic completed-task duration","unit":"seconds","denominator":"one eligible synthetic task","query":null,"query_revision":null,"baseline":null,"baseline_exception":null,
        "comparison_window":{"start":"2026-10-12T00:00:00Z","end":"2026-10-13T00:00:00Z"},"eligibility":"Synthetic cases only","target":"Lower time than baseline if baseline exists","guardrail":"No real-world exposure","measurement_owner":"synthetic author","review_trigger":"Before any real test","status":"planned"}
    },
    {
      "id":"REV-001","kind":"REV","revision":"r1","owner":"synthetic author",
      "scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},
      "depends_on":[{"id":"HYP-001","revision":"r1"},{"id":"MET-001","revision":"r1"}],"freshness":{"status":"unknown","rationale":"No outcomes","reviewed_at":null,"expires_at":null,"review_triggers":["eligible observation window"]},
      "data":{"decision":{"id":"DEC-001","revision":"r1"},"hypotheses":[{"id":"HYP-001","revision":"r1"}],"metrics":[{"id":"MET-001","revision":"r1"}],"observations":[],"actual_costs":[],"attribution":{"classification":"unknown","rationale":"No real release or data","confounders":[]},"recommendation":"inconclusive","limitations":["Synthetic design example, not a performed value review"],"reviewed_at":"2026-10-11T10:00:00Z"}
    }
  ],
  "bridges":[{"record":{"id":"DEC-001","revision":"r1"},"authority_id":"AUTH-001","authority_revision":"sha256:8a8f21a25b1799f44743c9faa798603d731c20f5c8f0cab271d15672c656a2cf","ids":["BRD-OBJ-001"]}],
  "product_state":{"value":"unvalidated","reason":"Synthetic proposal only","scope":{"segment":"synthetic cohort","geography":"test-only","window":{"start":"2026-10-01T00:00:00Z","end":"2026-11-01T00:00:00Z"}},"hypotheses":[{"id":"HYP-001","revision":"r1"}],"decision":{"id":"DEC-001","revision":"r1"},"assessed_at":"2026-10-11T10:00:00Z","history":[]}
}
```

Standalone financial happy example; monetary inputs are synthetic assumptions, not a recommendation:

```json
{
  "schema_version": 1,
  "analysis_id": "synthetic-roi",
  "currency": "USD",
  "money_scale": 2,
  "price_basis": "nominal",
  "price_date": "2026-10-01",
  "horizon": {"start_date":"2026-10-01","period":"year","periods":1},
  "cohort": "synthetic cohort",
  "counterfactual": "synthetic do-nothing case",
  "accounting_boundary": "Incremental synthetic cash; no costs netted from benefits; no omitted cash costs in this illustration",
  "discount": {"rate":"0.10","convention":"effective_annual","price_basis":"nominal"},
  "scenarios": [{
    "id":"base","label":"Synthetic base","assumptions":["Illustrative cash amounts only"],"nonmonetary":[],
    "items":[
      {"id":"benefit","side":"benefit","category":"conversion","mechanism_id":"synthetic-sale","period":1,"amount":"150000.00","currency":"USD","basis":"gross_revenue","netted_cost_categories":[],"rationale":"Synthetic incremental cash","evidence_ids":[]},
      {"id":"cost","side":"cost","category":"development","mechanism_id":"synthetic-build","period":0,"amount":"100000.00","currency":"USD","basis":"cash_cost","netted_cost_categories":[],"rationale":"Synthetic incremental expense","evidence_ids":[]}
    ]
  }]
}
```

Expected: B=150000.00, C=100000.00, net=50000.00, roi=0.500000, roi_percent=50.000000, benefit_cost=1.500000, durable payback period=1, terminal=50000.00, NPV=36363.64. Paired horizon is start_date 2026-10-01/year/1 from the input; convention t01-v2 is undiscounted durable period-end. Payback object exactly `{status:"reached",period:1,reason:null,terminal_balance:"50000.00"}`; neither it nor the result/root gains timing fields. Retain input + output + contract revision together. Original arithmetic observation is not rerun for N1.

Executable mutation vectors (each is a JSON object describing a test mutation, not an incomplete ledger passed as a valid example):

```json
[
  {"base":"synthetic-intake","mutation":{"schema_version":2},"expected":{"code":"UNSUPPORTED_VERSION","exit":2}},
  {"base":"synthetic-intake","mutation":{"product_state.value":"validated_for_scope"},"expected":{"code":"INVALID_TRANSITION","exit":1}},
  {"base":"synthetic-roi","mutation":{"cost.amount":"0.00"},"expected":{"roi_status":"undefined","roi_value":null,"reason":"zero_cost","exit":0}},
  {"base":"synthetic-roi","mutation":{"cost.amount":null},"expected":{"roi_status":"unavailable","reason":"unknown_cost","exit":0}},
  {"base":"synthetic-roi","mutation":{"benefit.currency":"EUR"},"expected":{"code":"INCOMPATIBLE_UNITS","exit":1}},
  {"base":"synthetic-roi","mutation":{"duplicate":"benefit"},"expected":{"code":"DUPLICATE_ITEM","exit":1}},
  {"base":"synthetic-roi","mutation":{"benefit.amount":"50000.00"},"expected":{"payback_status":"not_reached","period":null,"exit":0}},
  {"base":"synthetic-roi","mutation":{"discount":null},"expected":{"npv_status":"unavailable","reason":"missing_discount","exit":0}},
  {"base":"synthetic-roi","mutation":{"cost.amount":"-1"},"expected":{"code":"INVALID_AMOUNT","exit":1}},
  {"base":"synthetic-nine","mutation":{"duplicate_record":"SRC-001"},"expected":{"code":"DUPLICATE_ID","exit":1}},
  {"base":"synthetic-nine","mutation":{"SRC-001.depends_on":[{"id":"CLM-001","revision":"r1"}]},"expected":{"code":"DEPENDENCY_CYCLE","exit":1}},
  {"base":"synthetic-nine","mutation":{"CLM-001.sources":[{"id":"MET-001","revision":"r1"}]},"expected":{"code":"REFERENCE_KIND","exit":1}},
  {"base":"synthetic-nine","mutation":{"AUTH-001.locator.path":"../private.txt"},"expected":{"code":"UNSAFE_PATH","exit":2}},
  {"base":"synthetic-nine","mutation":{"AUTH-001.locator.path":"/etc/passwd"},"expected":{"code":"UNSAFE_PATH","exit":2}},
  {"base":"synthetic-nine","mutation":{"SRC-001.locator.uri":"https://example.invalid/?token=synthetic-secret"},"expected":{"code":"UNSAFE_PATH","exit":2}},
  {"base":"synthetic-nine","mutation":{"DEC-001.unexpected_human_name":"synthetic approver"},"expected":{"code":"INVALID_FIELD","exit":1}},
  {"base":"synthetic-nine","mutation":{"gate":"commit"},"expected":{"code":"SYNTHETIC_EVIDENCE","exit":3}}
]
```

T02 derives executable local-source/inference/counterevidence variants from the complete nine-kind example, with fixture hashes generated from actual temporary bytes. Negative vectors include duplicate SRC ID, SRC->CLM->SRC depends_on cycle, legal descriptive HYP/EXP/MET cycle, wrong reference kind/revision, absolute/traversal/symlink/device pointer, encoded path, credential-bearing URI, bridge reference without declaration, stale critical CLM, old recorded DEC artifact binding, name-only approval, synthetic claimed validation, missing experiment authorization, release without baseline/exception, query revision change, and unaffected DEC retention. Exact filenames and acceptance assertions are in the SRS matrix; no customer data required.

### 7.1 Exact history/change/supersede timeline (F1)

This is a **design test descriptor/graph projection**, not a partial ledger accepted by a validator or evidence of real approval. T02 expands it into complete fixtures, retaining all common/payload fields. An isolated synthetic test may use synthetic=false only to exercise positive gate algorithms; mark the fixture file/test root as synthetic and never export its decisions as authority. No investment decision for the actual project is fabricated here.

Before: current HYP-001@r1 supported, EXP-001@r1 completed with current result/primary/guardrail evidence. Archived HYP-001@plan1 (testing) and EXP-001@plan1 (proposed) retain identical frozen plan projections; recorded DEC-003@r1 authorizes that exact plan with an unchanged separate plan artifact. DEC-001@r1 investment authorize consumes INV-001@r1/HYP-001@r1/EXP-001@r1 and supported critical claims. Independent DEC-010@r1 consumes the independent 010 chain with helper DEC-013@r1; no 001 support shared. All source/query/baseline/approval/strategy/business bridges are available/current and scope-identical, genuine host consent not asserted.

Change: HYP-001 freshness review changes at 11:00Z, new revision r2, same frozen prediction/plan; archive entire HYP@r1. Create EXP-001@r2 with hypothesis r2, same plan/result/measurement refs; archive EXP@r1. DEC-001/DEC-003/DEC-010/DEC-013 and old bridges remain byte-identical. DEC-003's plan projection remains compatible, but DEC-001's evidence bindings are obsolete. Root stored validated state/history retains r1 proof: effective inconclusive only. The independent State view selects DEC-010 with its own unchanged HYP-010/transition history and remains validated.

Recovery: retain every old snapshot and DEC-001 row; append new DEC-002@r1 investment authorize consuming INV@r1/HYP@r2/EXP@r2 and supersedes DEC-001@r1, new approval artifact/current bridge. Record validated_for_scope -> validating at 11:10Z with DEC-003 and r2 hypothesis, then validating -> validated_for_scope at 11:20Z with DEC-002. Prior history still references DEC-001. DEC-001 is now effectively superseded and excluded from active affected IDs; its r1 refs continue resolving exactly. Arrays do not silently revise or drop a past decision.

The fixed descriptor below enumerates six assessments. Issue arrays are projected as `[code,severity,path,record_id]`; expand each with the fixed section 2.6 message, and add schema_version/tool/gate plus the three mandatory limitations from 3.1 to obtain the exact full envelope. A State view is an explicit prepared fixture state with complete valid transitions, not a hidden CLI selection flag.

```json
{
  "fixture":"revision-timeline",
  "decision_indices":{"DEC-001":0,"DEC-010":1,"DEC-003":2,"DEC-013":3,"DEC-002":4},
  "steps":[
    {"step":"before","current":["HYP-001@r1","EXP-001@r1"],"retained":["HYP-001@plan1","EXP-001@plan1"],"selected":"DEC-001","gate":"structural","expected":{"valid":true,"readiness":"not_assessed","effective_product_state":"validated_for_scope","affected_decisions":[],"issues":[],"exit":0}},
    {"step":"before","selected":"DEC-001","gate":"commit","expected":{"valid":true,"readiness":"eligible_for_host_check","effective_product_state":"validated_for_scope","affected_decisions":[],"issues":[],"exit":0}},
    {"step":"change","current":["HYP-001@r2","EXP-001@r2"],"retained":["HYP-001@plan1","EXP-001@plan1","HYP-001@r1","EXP-001@r1"],"selected":"DEC-001","gate":"structural","expected":{"valid":true,"readiness":"not_assessed","effective_product_state":"inconclusive","affected_decisions":["DEC-001"],"issues":[["OBSOLETE_BINDING","warning","/records/0","DEC-001"]],"exit":0}},
    {"step":"change","selected":"DEC-001","gate":"commit","expected":{"valid":true,"readiness":"blocked","effective_product_state":"inconclusive","affected_decisions":["DEC-001"],"issues":[["OBSOLETE_BINDING","gap","/records/0","DEC-001"]],"exit":3}},
    {"step":"change","selected":"DEC-010","gate":"commit","expected":{"valid":true,"readiness":"eligible_for_host_check","effective_product_state":"validated_for_scope","affected_decisions":["DEC-001"],"issues":[["OBSOLETE_BINDING","warning","/records/0","DEC-001"]],"exit":0}},
    {"step":"supersede","selected":"DEC-002","gate":"commit","expected":{"valid":true,"readiness":"eligible_for_host_check","effective_product_state":"validated_for_scope","affected_decisions":[],"issues":[],"exit":0}}
  ],
  "structural_countercase":{"replace":{"DEC-001.data.consumes[1].revision":"absent-r9","DEC-001.depends_on[1].revision":"absent-r9"},"selected":"DEC-010","gate":"commit","expected":{"valid":false,"readiness":"blocked","effective_product_state":"validated_for_scope","affected_decisions":["DEC-001"],"issues":[["REFERENCE_REVISION","error","/records/0/data/consumes/1","DEC-001"]],"exit":1}},
  "exit_precedence":[4,2,1,3,0]
}
```

For the structural countercase, missing HYP-001@absent-r9 has no retained payload. Coalesce duplicate occurrences of that exact missing pair in the same row at the ASCII-first actual referring field (consumes before depends_on); global missing-pair errors in other rows keep their own field paths. Do not assess the malformed proof as ready. Include direct/transitive current recorded consumers when resolvable; no invented IDs from malformed records. Independent root State is shape-valid/effective validated here, but global corruption makes readiness blocked. T02 also tests deleting a genuinely consumed historical snapshot, including every resulting broken field/affected root; unlike obsolete extant pairs, that deletion is structural.

### 7.2 Source-only influence vectors (F2)

Complete future fixture `influence-support.json` adds release DEC-020 at records index 4 consuming MET-001 (not EXP result); current DEC order 001/010/003/013/020. DEC-001 consumes completed EXP-001, whose primary MET-001 query=SRC-003 and baseline=SRC-004; guardrail MET-002 query=SRC-005 with its own independent baseline; result.sources=[SRC-002]. MET-001 depends_on=[] deliberately, proving typed influence, not accidental DAG coverage. HYP primary points MET-001. DEC-003's archived plan has those same measurement refs; its plan walk omits EXP result. Independent DEC-010/013 consume only 010 support. All other fields/predicates stay current/supported/available and the root is validated_for_scope.

Each vector changes **only one SRC current revision** r1->r2 and retains its whole r1 payload, leaving every immutable DEC and all MET/EXP refs untouched. SRC-002 changes result content; SRC-003 changes query content/origin revision; SRC-004 changes baseline evidence; SRC-005 changes guardrail query evidence. New current locator bytes/hash agree, so none fabricates a global HASH_MISMATCH. Negative/disputed annotations on r2 remain inspectable; old payloads are never silently replaced in proof.

```json
{
  "fixture":"source-only-influence",
  "vectors":[
    {"change":"SRC-002 result r1->r2","affected":["DEC-001"],"selected_helpers":[]},
    {"change":"SRC-003 query r1->r2","affected":["DEC-001","DEC-003","DEC-020"],"selected_helpers":["DEC-003"]},
    {"change":"SRC-004 baseline r1->r2","affected":["DEC-001","DEC-003","DEC-020"],"selected_helpers":["DEC-003"]},
    {"change":"SRC-005 guardrail query r1->r2","affected":["DEC-001","DEC-003"],"selected_helpers":["DEC-003"]}
  ],
  "assessments":[
    {"selected":"DEC-001","gate":"structural","valid":true,"readiness":"not_assessed","effective_product_state":"inconclusive","exit":0,"issue_code":"OBSOLETE_BINDING","gap_ids":[]},
    {"selected":"DEC-001","gate":"commit","valid":true,"readiness":"blocked","effective_product_state":"inconclusive","exit":3,"issue_code":"OBSOLETE_BINDING","gap_ids":["DEC-001","selected_helpers"]},
    {"selected":"DEC-010","gate":"commit","valid":true,"readiness":"eligible_for_host_check","effective_product_state":"validated_for_scope","exit":0,"issue_code":"OBSOLETE_BINDING","gap_ids":[]}
  ],
  "decision_indices":{"DEC-001":0,"DEC-010":1,"DEC-003":2,"DEC-013":3,"DEC-020":4}
}
```

For each of the 12 combinations, affected_decisions equals vector.affected exactly; issues contain exactly one OBSOLETE_BINDING tuple per affected ID at its decision index, sorted by path, severity gap only for DEC-001 + the vector's selected_helpers during selected 001 commit. All others warning, including DEC-020. Fixed message is section 2.6's obsolete message. Thus result-only changes affect DEC-001 but not DEC-003/020, while query/baseline support also affects experimental authorization and measurement release. Selected unaffected DEC-010 remains eligible; no source-count confidence or hidden current retargeting.

Additional T02 boundary fixtures: expiry at asOf on still-current SRC-003 creates STALE_EVIDENCE on 001/003/020; initially-current unavailable SRC-002 creates EVIDENCE_UNAVAILABLE on 001 only; initially-current disputed SRC-005 creates DISPUTED_EVIDENCE on 001/003. The latter are separately constructed input fixtures, not same-revision edits of a prior approved snapshot; an actual revised source with old retained approval refs first yields OBSOLETE_BINDING as the twelve evolution vectors specify. Missing exact query SRC pair is structural; extant retained old query/origin pair is scoped obsolete. Exception authority/artifact/current-MET changes affect helper plus consumers; frozen plan budget/guardrail/query/HYP prediction changes affect DEC-003/consumers even without result changes. Lifecycle/result-only additions with equal plan projection do not. Legal CLM counterevidence and MET->exception->MET cycles terminate without DAG failure. Retired REV investment attribution is not current consent.

### 7.3 Authorized real business authority preparation (F3)

Ownership/prerequisite: orchestrator as document/authority-preparation owner expressly authorized T01-correction-brief.md:17–18's **declaration-only** edit to docs/brd/brd-product-evidence-sdlc.md:29–33. Only split the Objective ID from its existing description; retain exact objective meaning, metric/baseline/role strings and proposal status. This prepares machine declarations, does not approve an investment, target, budget or H1. Parser behavior remains unchanged; nine record kinds remain unchanged.

Normalized full BRD SHA256 is `ce2fb8f9bf3878d45ce15b57ff927ba1b6366564a14611d7604559741aa5123d`; local Authority revision is `sha256:ce2fb8f9bf3878d45ce15b57ff927ba1b6366564a14611d7604559741aa5123d`. Any consumer binding the preceding file revision must retain the old Authority snapshot and rebind through a new recorded DEC/bridge after real approval, not edit its old recorded payload. There is no real recorded project investment DEC in this assignment.

Real-authority-shaped fixture body (exact table, not synthetic strong headings):

```markdown
| Objective ID | Objective | Proposed SMART metric | Baseline | Accountable role |
| --- | --- | --- | --- | --- |
| BRD-OBJ-001 | Make investment decisions traceable | Within six weeks of pilot start, 100% of three pilot initiative decisions link their critical claims to provenance, uncertainties, and recorded decision authority | Unknown; assess at pilot intake | Pilot Product Owner |
| BRD-OBJ-002 | Test product risk before full commitment | Within six weeks, each pilot initiative has a bounded validation decision or an explicit risk-accepted exception before full-build commitment | Unknown; assess at pilot intake | Product Owner with engineering/design |
| BRD-OBJ-003 | Close the value loop | Before each pilot release, register a metric baseline, measurement owner, guardrails, and review trigger; at the first eligible review, record scale/iterate/stop/inconclusive with evidence | Unknown; assess at pilot intake | Product Owner with analytics/finance |
```

T02 adds `fixtures/authorities/brd-product-evidence-table.md` from this table (UTF-8/LF/no BOM; exactly one trailing LF), hashes actual fixture bytes, declares exactly BRD-OBJ-001/002/003 and tests BRD-OBJ-999 rejection. Retain separate `brd-reference-only.md` negative fixture with former first cells `BRD-OBJ-001: Make investment decisions traceable` etc; the supplied reviewer diagnostic is ground truth that former full BRD declared none. Do not rerun unchanged full BRD just to confirm that observation; future unit fixture verifies citation/reference-only rejection without relaxing scanner rules.

T01 changed-BRD diagnostic must import actual scripts/trace/parse.ts, copy **only changed BRD** into an isolated root and observe three declaration-role objectives at lines 31/32/33; no repository authority scan. Report pins full prior/new BRD hashes (prior reconstructed by exact inverse table normalization, not claimed independent prior byte capture), table fixture hash and actual command/output. T02 shipped validator remains standalone and uses its own compatible declaration implementation; the design diagnostic importing repo parser is not a shipped dependency.

### 7.4 Paired timing metadata (N1)

External consumer/test descriptor only; not new fields on resource output:

```json
{
  "fixture":"paired-payback-metadata",
  "contract_revision":"t01-v2",
  "input_horizon":{"start_date":"2026-10-01","period":"year","periods":1},
  "convention":"undiscounted_durable_period_end",
  "expected_payback":{"status":"reached","period":1,"reason":null,"terminal_balance":"50000.00"},
  "closed_payback_keys":["status","period","reason","terminal_balance"]
}
```

T04 checks exact closed keys and retains input.horizon with output/contract revision in caller evidence; no output horizon/start_date/unit/convention fields. This corrects contradictory metadata prose only, not payback/NPV arithmetic, model scope or schema version.
