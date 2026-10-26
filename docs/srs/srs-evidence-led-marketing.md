# SRS: Evidence-led marketing measurement contracts

Status: Offline synthetic contract approved and implemented; Plausible collection contract approved for implementation (live collection deliberately blocked by owner decision); real-data contracts remain proposed | Owner: Hoang Nguyen | Date: 2026-10-26
Sources: [approved PRD](../prd/prd-evidence-led-marketing.md), [task list](srs-task-list-evidence-led-marketing.md).
Scope: T01 contracts for T02 offline measurement, installed resources, evaluation and later website integration. The owner approved the offline synthetic contract and subsequently approved the Plausible collection contract for implementation (docs/product/evidence-led-marketing/plausible-collection-contract.md); no actual data, spending, publishing, recruitment or deployment authorized.

## 1. Architecture and component ownership

- CMP-001: T02 measurement owner owns offline cohort/cost inputs and deterministic JSON/Markdown scorecard.
- CMP-002: same owner maps canonical product-evidence records; report views do not create a second editable ledger.
- CMP-003: T07 integration owner owns installed resources and explicit advanced PM dependencies.
- CMP-004: T08/T10 web owner owns event semantics and selected real provider (Plausible contract approved for implementation, live collection deliberately kept blocked by owner decision; default website gates passed; configured collection browser acceptance passed 10 cases / 37 assertions in `collection-browser-acceptance.md`; T08 open pending test site ID/URL/caps).
- CMP-005: T11 independent QA owns paired evaluation assessment, not skill implementation.

Use a dependency-light Node >=20 CLI, no service/database/dashboard/generic transport framework and no new financial engine. Package proposed runtime resources inside skills/marketing/marketing-measurement/: SKILL.md, assets/measurement-input.schema.json, assets/scorecard.schema.json, scripts/report-marketing.mjs, references/measurement-contract.md and a clearly synthetic fixture resource. Evals and monorepo scripts are not consumer runtime dependencies.

Invocation: node <installed-marketing-measurement>/scripts/report-marketing.mjs <absolute-input.json> --authority-root <absolute-narrow-initiative-root> --as-of <UTC-instant> --format json|markdown. JSON default. Required explicit cutoff, stdout only, no network, ledger mutation, retries or permission grants.

## LLD-001: Input interface

Closed root schema, all fields required:
- schema_version: integer 1; synthetic: boolean; revision: nonblank snapshot token.
- ledger: {path, sha256} identifying canonical product-evidence ledger.
- campaign: registration below.
- cohort: snapshot below or null when unavailable.
- investment: {path, sha256} pointing to existing investment-schema input or null.
- sources: array of {ref, path, sha256} binding exact ledger SRC pairs to sanitized artifacts.
- metric_bindings: closed map activation, repeat_rate, cash_per_activation, cash_per_repeat, hours_per_repeat -> exact MET references.
- limitations: nonblank string array.
- cost_mapping: null or {source:exact SRC ref, window:{start,end}, cash_complete:boolean, hours_complete:boolean, cash_item_ids:string[], consumed_hour_item_ids:string[]}. Explicit accounting assertions map exact base-scenario item IDs, never parse prose to infer completeness.
- public_projection: null or {campaign_id:string,input_revision:string,source_aliases:[{ref,alias}]}; explicit publication-safe labels, synthetic-only labels during T02. These declarations do not authorize actual publication.

ref is exactly {id, revision}. Hashes are lowercase SHA256. Data paths resolve relative to the narrow authority root. Each input must be a contained regular file, maximum 1 MiB. Reject symlinks, escapes, changed reads, invalid JSON, unknown fields, unsupported versions and invalid timestamps. Diagnostics never interpolate private input values. These file/resource boundaries follow existing PM resource conventions, not a claim of OS sandboxing.

Campaign registration, all required: id (kebab-case); context_revision; assets (unique {id, revision, channel}); acquisition_window and cost_window ({start,end}); owner; state (prepared|authorized|closed); authorization (exact DEC ref|null). UTC second timestamps YYYY-MM-DDTHH:mm:ssZ, valid calendar values. Windows half-open [start,end), start<end. Real pilot uses 30 elapsed acquisition days only after approval; no actual start fabricated. An authorized string or DEC ref is not authenticated runtime consent. Anonymous attribution is never joined to participant identities.

Cohort snapshot: source (exact SRC ref), coverage_end (valid UTC instant), participants[], reports[]. Historical as-of replay against later coverage is allowed; occurrence cutoff is min(as-of,coverage_end) and late reports are excluded. Participant: participant_key (opaque local ID), role (external|maintainer|evaluator|bot|synthetic), consent (granted|absent|withdrawn). Report: report_id, participant_key, kind (starter|activation|repeat|no_return), occurred_at, reported_at, task_ref (exact SRC ref|null).

Constraints: occurred_at<=reported_at. Only eligible external consent-granted participants contribute; exclude absent/withdrawn rows before constructing the calculation dataset. Synthetic fixtures use fictional external roles and root synthetic:true, never real-adoption claims. Duplicate participant declarations reject input. Identical duplicate report IDs collapse; conflicting reuse rejects input. Multiple report IDs never multiply person counts. Activation/repeat require task evidence; activation evidence establishes setup plus useful task. A starter is pilot initiation, not anonymous website activity.

Inputs are immutable snapshots. Corrections create new source revisions/hashes and explicitly selected inputs, retaining exact referenced history. Never choose newest implicitly or mutate recorded DEC bytes. Private withdrawal and removal of prior published aggregates require a separately approved procedure.

## 2. Requirement Trace

| BRD Objective | PRD Req | AC | SRS | Design / Owner / Verification |
| --- | --- | --- | --- | --- |
| BRD-OBJ-003 | REQ-001 | AC-001, AC-002 | SRS-001 | CMP-001; research owner; VER-001 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-002 | AC-003, AC-004 | SRS-006 | CMP-001; campaign owner; VER-006 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-003 | AC-005, AC-006 | SRS-001, SRS-004, SRS-006 | CMP-001; measurement owner; VER-001, VER-005 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-003 | AC-007, AC-009 | SRS-002, SRS-004, SRS-006 | CMP-001; measurement owner; VER-002, VER-003, VER-005 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-003 | AC-008 | SRS-003, SRS-004, SRS-006 | CMP-001; measurement owner; VER-004, VER-005 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-003 | AC-010, AC-011, AC-012 | SRS-004, SRS-005, SRS-006 | CMP-001; measurement owner; VER-006, VER-007 |
| BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | REQ-004 | AC-013, AC-014, AC-015 | SRS-008 | CMP-005; QA owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | REQ-004 | AC-016 | SRS-007 | CMP-003; integration owner; VER-008 |
| BRD-OBJ-001, BRD-OBJ-003 | REQ-005 | AC-017 | SRS-008 | CMP-005; research owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-003 | REQ-006 | AC-018 | SRS-008 | CMP-005; research owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-003 | REQ-007 | AC-019 | SRS-008 | CMP-005; evidence owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-008 | AC-020 | SRS-008 | CMP-005; campaign owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-009 | AC-021 | SRS-008 | CMP-005; content owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | REQ-010 | AC-022 | SRS-008 | CMP-005; content owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-011 | AC-023 | SRS-008 | CMP-005; web owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002 | REQ-012 | AC-024 | SRS-008 | CMP-005; content owner; VER-009 |
| BRD-OBJ-002, BRD-OBJ-003 | REQ-013 | AC-025 | SRS-008 | CMP-005; campaign owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | REQ-014 | AC-026 | SRS-008 | CMP-005; campaign owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | REQ-015 | AC-027 | SRS-008 | CMP-005; media owner; VER-009 |
| BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | REQ-016 | AC-028 | SRS-001, SRS-006 | CMP-001; measurement owner; VER-001 |
| BRD-OBJ-001, BRD-OBJ-003 | REQ-017 | AC-029, AC-030, AC-031, AC-032 | SRS-009 | CMP-004; web owner; VER-010 |
| BRD-OBJ-001, BRD-OBJ-003 | REQ-018 | AC-033, AC-034 | SRS-006, SRS-010 | CMP-001; privacy/measurement owner; VER-011 |

## 3. Requirement cards

All SRS requirements below: Priority Must, status Proposed. AC IDs reference the PRD without silently renumbering them.
### SRS-001: Source-bound contracts

Source: REQ-001, REQ-003, REQ-016, AC-001, AC-002, AC-005, AC-006, AC-028. Each measure references canonical MET fields: definition, unit, denominator, eligibility, comparison window, target, guardrail, owner, review trigger, query and query_revision. query_revision matches query SRC data.origin.revision, not internal record revision. Missing baseline remains unknown with reason, never zero. Proposal status planned/unavailable; synthetic output never promotes actual MET to instrumented/observed. Verify VER-001 through JSON walkthrough and existing structural validator.

### SRS-002: Activation and maturity

Source: REQ-003, AC-007, AC-009. Require starter and qualifying activation within acquisition window; a starter must not follow the selected activation. Earliest qualifying activation is a. Count once. Maturity=a+14*24h. Effective occurrence cutoff=min(as-of,coverage_end); reports with reported_at>as-of or occurred_at>effective cutoff do not contribute. Mature iff cutoff>=maturity.

eligible_starters counts distinct eligible participants with at least one starter occurrence inside the acquisition window and at/before effective cutoff, reported by as-of, whether or not they activate. activation_rate=activated/eligible_starters; zero eligible starters -> unavailable/zero_starter_denominator. VER-005 includes two starters with only one activation -> 0.500000.

Qualifying repeat: a<occurred_at<=a+14d and UTC date differs from activation date. A repeat before maturity may enter confirmed_repeat_all, but cannot enter mature repeat-rate numerator/denominator yet. Verify VER-002/003.

### SRS-003: Nonreturn versus unknown

Source: REQ-003, AC-008. Among mature activations, partition confirmed repeat, explicit full-window no-return and unknown. A no-return dated before maturity is insufficient. Contradictory qualifying repeat plus explicit full-window no-return rejects the snapshot with fixed conflict issue, never newest-wins. Confirmed-observed repeat rate=mature_confirmed_repeat/mature_activated; unknowns remain denominator. This is cohort evidence, not population retention. Verify VER-004.

### SRS-004: Missing and zero states

Source: REQ-003, AC-006, AC-007, AC-008, AC-009, AC-010. Null cohort -> unavailable adoption, not zero. Complete empty snapshot -> valid count zero. Zero mature denominator -> unavailable repeat rate with zero_mature_denominator. Report exclusion/duplicate counts, never identifiers. Immaturity is rationale for unavailable MET state, not a new enum. Verify VER-005.

### SRS-005: Incremental cost and investment

Source: REQ-003, AC-010, AC-011, AC-012. Reuse installed product-investment schema/calculator for financial scenarios without changes. For adoption efficiency, cost_mapping explicitly selects base-scenario cash_cost items and consumed (not saved) capacity_hours item IDs. IDs must be unique, exist exactly once and match their side/basis; selection sets must not overlap. Mapping window must exactly equal campaign cost_window, and source must be an available exact SRC. Included items represent whole amounts wholly allocated to that window; no inferred prorating of monthly/yearly investment periods. Authoring/evaluation/maintenance/campaign work coverage is a human accounting assertion recorded in source, not something the calculator proves.

Known cash requires investment plus mapping, cash_complete:true, at least one selected cash item, and all amounts non-null. Known zero requires an explicitly selected zero-valued cash item and completeness assertion; empty selection is unknown. Known consumed hours similarly requires hours_complete:true and selected non-null capacity items explicitly asserted consumed, never saved. Missing/null mapping, false completeness or missing amounts yields unknown for that numerator. Keep investment scenario totals distinct from this mapped campaign subset; do not sum scenarios or convert capacity to cash.

Use exact rational/integer arithmetic, six decimal places half away from zero for efficiency. Unknown numerator takes precedence; otherwise zero denominator is unavailable. cash_per_activation uses activated; cash_per_repeat/hours_per_repeat use mature_confirmed_repeat. Label ratios as interim cohort-efficiency diagnostics with cost and observation windows, not lifetime acquisition cost. Positive denominator/known zero cash yields zero cash efficiency, labor still visible. Preserve canonical financial calculator precedence: known zero investment cost yields undefined/zero_cost even when benefits are unknown; otherwise missing benefits yield unknown ROI. Financial result is scenario analysis, never realized attributable ROI without separate evidence. Verify VER-006/007 independently.

### SRS-006: Derived public-safe report

Source: REQ-002, REQ-003, REQ-016, REQ-018, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-028, AC-033, AC-034. Closed JSON root: schema_version:1, tool:marketing-scorecard, synthetic, valid, as_of, campaign_id, input_revision, provenance[], calculation:{revision,sha256}, context, counts, measures, attribution:descriptive|unknown, recommendation:inconclusive, limitations[], issues:[{code,path,message}]. context is null on invalid input, otherwise {scenario:"base",acquisition_window,cost_window,observation_cutoff,follow_up_days:14,baseline_status:"unknown"}. Windows/cutoff are UTC values, not free text. Null count/measure objects on invalid input; no partial success. Hash actual executable and consumed ledger/investment/source artifacts. Provenance uses designated public aliases/hashes, not private refs/paths.

counts keys: eligible_starters, activated, immature_activated, mature_activated, confirmed_repeat_all, mature_confirmed_repeat, mature_confirmed_no_return, mature_unknown, excluded_participants, duplicate_reports.

measures keys: activation_rate, repeat_rate, cash_total, hours_total, cash_per_activation, cash_per_repeat, hours_per_repeat, financial_roi, baseline. Each is {status:available|unavailable|undefined,value:decimal-string|null,unit,reason:nonblank-string|null}. Baseline remains unavailable/baseline_unknown for this initial package; no metric-specific baseline values are computed or implied. Future comparable baselines require a reviewed contract extension, not rendering hidden private input. context supplies windows/scenario for identical JSON/Markdown meaning.

Markdown deterministically renders the same result with synthetic/prepared banner, counts/unknowns, cash/hours, windows, source/calculation identity and limitations. Website/reputation observations are source-linked ledger evidence or unavailable; no fabricated fields. Public output/errors contain no participant/report IDs, task text, contacts, private paths or raw URLs. Automatic recommendation stays inconclusive; narrative REV can advise scale/iterate/stop only with sufficient actual evidence. Actual-data publication still needs human privacy review.

Public projection is generated, not a dump of source strings. Do not copy free-form input limitations, investment descriptions, query text, private record refs or downstream diagnostic text. Output limitation/reason/message strings come from the package's fixed code dictionary; unrecognized keys use path "/" rather than echoing the key. Known field paths use literal schema keys and numeric indexes only. Translate parser, file-system, validator and calculator failures into fixed error codes/messages; never forward stack traces or raw stderr to public JSON/Markdown/errors.

Public campaign/revision identifiers must be explicitly designated public aliases in the approved campaign context; without that designation render campaign_id/input_revision null and a fixed public_identity_unavailable limitation. Do not infer safety from a regex. Public provenance uses only designated public SRC/MET aliases and hashes; private observation/task record refs remain in private source artifacts. Missing public binding produces an unavailable source reference, not an invented alias or leaked internal identifier. Synthetic fixtures may explicitly designate their fictional aliases. Expand VER-011 with tainted free-text/revisions/refs, identifying unknown property names, invalid JSON, missing private paths and downstream failures; neither JSON nor Markdown nor stderr may echo them.

Exit codes: 0 coherent including legitimate unknowns; 1 schema/semantic error; 2 invocation/runtime/resource/I/O/limit/version error; 4 internal error. No permanent-error retries. Verify VER-001,004..007,011.

### SRS-007: Installed dependency preflight

Source: REQ-004, AC-016. Resolve actual standard/flattened agent root; require Node>=20, reporting script/schemas, product-evidence validator/schema and product-investment calculator/schema. Check reviewed package selection, not MCP skill-body availability alone. Validate narrow root/cutoff/containment; invoke existing product-evidence structural validation and preserve permanent limitations. No auto-install, fetch, broadening root or monorepo fallback. Existing .skillsrc foundation-only PM selection is insufficient. Verify VER-008 standard/flattened/missing dependency scenarios.

### SRS-008: Independent skill evaluation

Source: REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, AC-013, AC-014, AC-015, AC-017, AC-018, AC-019, AC-020, AC-021, AC-022, AC-023, AC-024, AC-025, AC-026, AC-027. Freeze package/brief/rubric/model/tool revisions, baseline/with-skill arms, trigger positives/negatives and guardrail cases. Retain failures, human acceptance, material revisions, author/review/correction time and actual usage or unknown cost. No fixture success or token-size estimate establishes effectiveness. Live eval resource bounds require separate approval. Verify VER-009.

### SRS-009: Website event boundary

Source: REQ-017, AC-029, AC-030, AC-031, AC-032; provider-specific portion blocked. Closed app payload: schema_version:1, event_name:demo_play|setup_guide_open|install_command_copy|github_click, campaign_id:registered|unknown, asset_id:registered|unknown, placement:build-time allowlist. Validate campaign/asset association. Transport fields need separate approval.

Actual user-initiated playback -> demo_play once per media instance/page lifecycle; not render, illustration, failed play or pause/resume multiplication. Per owner explicit UX decision ("Explicit start, then native controls"), in configured collection artifacts with JS, an accessible Play demo button initiates trusted first start, with native controls available afterward; without JS and in default unconfigured builds, existing native player is retained. Copy success only after clipboard resolves and stale-operation guard. One event classification per action; no overlapping listeners. Unknown tags -> unknown. No raw URL/query/referrer, identity, clipboard/code/path. Disabled collection -> no analytics script/request. Transport failure cannot block primary navigation/copy/media. Preserve static export and no-JS actions. Verify VER-010 real browser/network then separately authorized real-provider receipts. Local sink never establishes provider completion.

Unconfigured or absent enablement is disabled. The default static build emits no analytics script or collection request. Only an explicitly approved provider/consent configuration may enable collection; a build flag alone is not authorization. VER-010 includes a default/unconfigured browser-network scenario, not only a manually disabled transport scenario.

### SRS-010: Real-data privacy gate

Source: REQ-018, AC-033, AC-034. T02 acceptance uses synthetic data only. Actual normalized cohorts/contact/consent sources remain outside public checkout in approved private storage. Before live use Hoang approves purpose/consent/withdrawal, storage/access/retention, deletion/backups/public aggregates, dates/population/caps and source/redaction boundaries. No period or provider invented. Flags/schema validation/agent messages are not consent. Verify VER-011 synthetic exclusion/public output; actual controls need real authorized evidence.

## Verification matrix and expected cases

All planned, not executed:
- VER-001: missing baseline -> unknown; query-origin revision mismatch rejects binding.
- VER-002: Jan 1 12:00Z activation; Jan 15 11:59:59Z immature; 12:00:00Z mature.
- VER-003: same UTC date repeat excluded; exact +14d included; +1 second excluded; occurrences after coverage cutoff excluded.
- VER-004: three mature participants: one repeat, one no-return, one unknown -> 0.333333. Contradictory full-window reports reject input.
- VER-005: null vs complete empty vs all-immature; duplicate report collapse and conflicting-ID rejection; late reported data excluded as of cutoff.
- VER-006: positive cash/zero mature repeats -> unavailable ratio; missing cash -> unknown.
- VER-007: known cash 0, hours 6, two mature repeats -> cash/repeat 0.000000, hours/repeat 3.000000. Combined fixture four activations, three mature and one immature, one mature repeat, cash 12/hours 6 -> cash/activation 3.000000, cash/repeat 12.000000, hours/repeat 6.000000. No monetary benefit fabricated.
- VER-008: actual installed standard/flattened resources; missing/excluded PM dependency -> exact capability gap without install.
- VER-009: paired isolated eval evidence, per-skill FP/FN, preserved failures/unknown costs.
- VER-010: clipboard failure/stale completion emits no success; actual media start one event; disabled/failed transport leaves actions usable; no raw query values transmitted.
- VER-011: absent/withdrawn participants excluded; public JSON/Markdown/errors reveal no private identifiers or source paths.

## Authority compatibility and action gates

Existing product-evidence schema and validator authority/bridge IDs accept only (BRD-OBJ|REQ|AC|SRS)-[0-9]{3,}; PRD uses canonical REQ-001..018 and AC-001..034. Proposal ledger keeps authorities/bridges empty and decision authorization null, with explicit strategy/bridge gaps. This SRS's numeric SRS-001..010 retains trace back to exact PRD IDs. Integration owner must resolve formal bridge compatibility through reviewed design before action/release claims; offline structural proposal remains possible.

Required trace: BRD-OBJ-001, BRD-OBJ-002 -> REQ-003 -> AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012 -> SRS-001, SRS-002, SRS-003, SRS-004, SRS-005, SRS-006 -> VER-001, VER-002, VER-003, VER-004, VER-005, VER-006, VER-007; all BRD objectives BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 -> REQ-004 -> AC-013, AC-014, AC-015, AC-016 -> SRS-007, SRS-008 -> VER-008, VER-009; BRD-OBJ-001, BRD-OBJ-003 -> REQ-017, REQ-018 -> AC-029, AC-030, AC-031, AC-032, AC-033, AC-034 -> SRS-009, SRS-010 -> VER-010, VER-011.

Provider selection and contract: owner selected Plausible hosted custom events in PR 263 and approved the implementation contract (docs/product/evidence-led-marketing/plausible-collection-contract.md; supersedes analytics-disabled-decision.md for implementation only) specifying direct browser events without tracker SDK, explicit opt-in, default-off, and withdrawal. Disclosed provider processing, retention, and deletion limitations are accepted for implementation. Owner implementation approval includes conditional exact https://plausible.io/api/event in connect-src for valid configured artifact and controlled intercepted smoke (default builds retain self-only connection policy; no broad origin, default-build override, production activation, account registration, purchase, or event transmission approved). Sources: https://plausible.io/docs/custom-event-goals and https://plausible.io/data-policy .

Source references: product-evidence/assets/product-evidence.schema.json authority declared_ids and metData; product-evidence/scripts/validate-product-evidence.mjs ID grammar; product-investment/assets/investment.schema.json and references/financial-contract.md; website/src/landing/CopyCommand.client.tsx; website/next.config.ts; website/scripts/generate-headers.mjs; website/docs/deployment.md:107-135.

## Approval requested and outcome

Approve offline synthetic contract first: packaged CLI, closed input/output, source hashes, UTC cohort semantics, separate cash/capacity and existing PM calculation reuse. Architecture/privacy reviewer examines these contracts before code. Actual cohort storage/retention/consent and analytics provider remain separate decisions and do not imply production readiness.

Status: offline_synthetic_contract_approved and delivered; Plausible collection contract approved for implementation (live collection deliberately kept blocked by owner decision; default website gates passed: unit 38/38 on Node 26, typecheck, lint, static build, 72/72 E2E in 51.8s; code conditionally approved; configured collection browser acceptance passed 10 cases / 37 assertions in `artifacts/evidence-led-marketing/collection-browser-acceptance.{json,md}`; enabled AC-029/030/032 locally technically verified, real provider receipt unverified; T08 open pending test site ID/URL/caps). Real-data cohort and production activation remain blocked. Independent implementation reviews remain required. All six remaining tasks target completion in PR #263.
