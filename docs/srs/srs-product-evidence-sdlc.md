# SRS/FRS: Product-Evidence SDLC

**Status:** corrected review candidate; independent re-review and human H1 pending. **Revision:** `t01-v2`. **Slug:** product-evidence-sdlc. **Owner:** T01 original bounded design worker; accountable human approvers remain orchestrator-owned. **Scope:** corrected registry contract, not implementation or pilot evidence.

## 1. Context, authority and trace source

[PRD](../prd/prd-product-evidence-sdlc.md) defines What; [BRD](../brd/brd-product-evidence-sdlc.md) defines Why. The approved T01 brief and conversation resolve H0 repository/account/design authorization despite those historical documents' draft labels. Neither that authorization nor this SRS supplies H1 implementation, H2 live-eval or H3 adoption permission. Authority order remains accepted BRD/PRD -> accepted SRS -> scoped implementation brief. User correction belongs with the orchestrator, not an unowned PRD edit.

Normative implementation detail: [contract-decisions.md](product-evidence-sdlc/contract-decisions.md), revision `t01-v2`. Provenance register unchanged. SRS/contract/register form one candidate; contradictions stop the affected action for owner correction. F1/F2 integrate retained revision storage and complete bounded influence; F3 uses only the explicitly authorized BRD objective-column normalization; N1 retains the exact financial output API. Original t01-v1 evidence stays identified in T01-report.md; no human approval is supplied.

**Confirmed:** Registry -> CLI -> consumer architecture, existing byte-preserving resources/ownership, optional workflow reconciliation and MCP native transport are supported by the source files cited in contract section 1. **Assumed design choices for H1:** decimal accounting, strict scope/revision identity, optional category routing and test-only network fixture described there. **Unknown:** pilot product, finance inputs, approved experiment budget, evidence retention policy, actual product value, human gate approvers; none is invented.

Out of scope: implementation now, connectors/database/new daily ags runtime, approval enforcement bypass, new public MCP tool, Outcome v2/product trace kinds, provider-specific reusable recipes, default PM installation, publication/pilot/live eval/premium consultation. Agent assistance never creates consent or spend/release/retirement authority.

## 2. Architecture, ownership and design trace

HLD-001: local-file evidence and human authority remain separate from distribution and delivery truth. HLD-002: installed resources work offline without monorepo imports. HLD-003: optional product methods add conditional branches to the existing spine rather than replace it.

| Component | Design lane / contract | Implementation responsibility | Failure domain |
| --- | --- | --- | --- |
| CMP-001 evidence ledger/validator | HLD-001; LLD-001 = contract sections 2/3.1 | T02; product/research human owns actual ledger/source applicability | Structural corruption blocks assessment; legitimate obsolete support blocks only selected affected proof; histories/JSON cannot authenticate humans |
| CMP-002 investment/calculator | HLD-001/002; LLD-002 = contract 3.2 | T04; finance/product owns input boundary and authorization | Invalid units/duplicates rejected; unknown/zero inputs explicit, no invented money |
| CMP-003 specialist methods | HLD-003; contract 4 | T03 research/strategy, T04 experimentation, T05 metrics/roadmap | Missing data produces unknown/inconclusive, not manufactured findings |
| CMP-004 portable workflows | HLD-003; contract 4 | T06 new workflow files; T07 existing integrations | Missing optional capability produces exact gap; incidents/maintenance retain existing route |
| CMP-005 distribution/routing | HLD-002/003; LLD-003 = contract 4/5 | T08 canonical metadata/index/audit/generated mirrors | Resource ownership/overrides preserved; no implicit package install or cross-owner edit |
| CMP-006 consumer proof | HLD-002; LLD-004 = contract 6 | T09 runtime smoke; T10 separately gated efficacy; T11 independent final review | Real consumer boundary required; mocks, name strings and structural checks cannot certify runtime/efficacy |

Dependencies: standalone resource -> Node builtins + package-local assets; workflow -> installed skills/resources + existing BRD/PRD/SRS + host authorization; CLI -> current GitHub transport/ownership/native transformers; MCP -> installed skill/workflow files. Resources do not depend on CLI/MCP/repository scripts, models or connectors. Synchronous local calculations, asynchronous bounded filesystem validation; no jobs/events/database/network in these resources. No delivery migration or dual-write protocol. First schema is v1, unknown versions fail explicitly.

RACI: product/research owns source applicability and claims; budget-holder/finance owns monetary assumptions/commit authority; analytics/product owns measurement/value interpretation; engineering owns specifications and runtime; QA/evaluation owns observed verification; host/operator owns authenticated action control; orchestrator owns briefs/shared-file integration; independent reviewer cannot approve human gates. One implementation owner per path, as contract section 5 and plan ownership section 5 specify.

## 3. Requirement trace and owner verification

All SRS cards below: priority Must/P0; status Review (not approved/implemented/tested). `VER-*` IDs identify future verification units, not observed passing tests. T01's actual design checks are in its report.

| BRD objective | PRD requirement | Acceptance criteria | SRS | Design / owner / verification |
| --- | --- | --- | --- | --- |
| BRD-OBJ-001 | REQ-001 | AC-001 | SRS-001, SRS-002 | HLD-001/CMP-001/LLD-001; T02; VER-001/002 |
| BRD-OBJ-001 | REQ-001 | AC-002 | SRS-003, SRS-004 | CMP-001; T02/T07; VER-003/004 |
| BRD-OBJ-001 | REQ-002 | AC-003, AC-004 | SRS-005 | CMP-003; T03/T05; VER-005 |
| BRD-OBJ-002 | REQ-003 | AC-005, AC-006 | SRS-006, SRS-007 | HLD-002/CMP-002/LLD-002; T04; VER-006/007 |
| BRD-OBJ-002 | REQ-004 | AC-007, AC-008 | SRS-004, SRS-008 | CMP-003/004; T04/T06/T07; VER-004/008 |
| BRD-OBJ-003 | REQ-005 | AC-009, AC-010 | SRS-009 | CMP-001/003/004; T02/T05/T07; VER-009 |
| BRD-OBJ-002 | REQ-006 | AC-011, AC-012 | SRS-010 | HLD-003/CMP-004; T06/T07; VER-010 |
| BRD-OBJ-001 | REQ-007 | AC-013, AC-014 | SRS-011, SRS-012, SRS-013 | HLD-002/CMP-005/006/LLD-003/004; T08/T09; VER-011/012/013 |
| BRD-OBJ-001 | REQ-008 | AC-015, AC-016 | SRS-013, SRS-014 | CMP-006; T09/T10/T11; VER-013/014 |
| BRD-OBJ-002 | REQ-009 | AC-017, AC-018 | SRS-015 | all owners/orchestrator/T11; VER-015 |
| BRD-OBJ-003 | REQ-010 | AC-019, AC-020 | SRS-016 | T11; VER-016; pilot/publication human-gated T12/T13 |

Corrective trace (no new business requirements): F1 -> REQ-001/006, AC-002/011, SRS-001/002/003/010, T02/T07, VER-001/002/003/010; F2 -> REQ-001/004/005, AC-001/002/007/009, SRS-002/003/008/009, T02/T04/T05/T07, VER-002/003/008/009; F3 -> REQ-001, AC-001, SRS-002, T01 authorized declaration preparation + T02 fixture, VER-002; N1 -> REQ-003, AC-006, SRS-007, T04, VER-007. Existing IDs and PRD/BRD scope remain unchanged.

### SRS-001: Canonical ledger and typed evidence

- **Statement:** Each local initiative shall have one versioned ledger at `docs/product/<slug>/evidence.json`, with independent product_id, nine typed record kinds and explicit uncertainty/provenance/privacy/freshness; readable views shall reference its authority and IDs.
- **Source:** REQ-001, AC-001; HLD-001/CMP-001/LLD-001.
- **Input/trigger:** Discovery, validation, investment or value review creates/consumes ledger.
- **Processing/output:** Contract 2 current records/authorities plus mandatory full record_history/authority_history; exact pair identity, all nine kinds, source/counterevidence and explicit unknowns. Archived recorded DEC payloads immutable; new decision IDs replace recorded decisions. Synthetic flag visible; historical_payloads_not_authenticated limitation mandatory.
- **Error/fallback:** Invalid version/kind/field/ID rejected; incomplete real evidence stays proposal-only/unvalidated, no fabricated customer result.
- **NFR/measurement:** NFR-001/002/003; Node assertions with complete nine-kind fixtures, typed negative boundaries; VER-001 unit + owner review.

### SRS-002: Deterministic graph and delivery bridge

- **Statement:** References and declared authority bridges shall resolve deterministically at exact revisions; dependency and supersession graphs shall be acyclic without forbidding legal descriptive cycles.
- **Source:** REQ-001/007, AC-001/013; CMP-001/LLD-001.
- **Input/trigger:** Validator structural run with bounded root/asOf and local requirement declarations.
- **Processing/output:** Unique current IDs and retained `(id,revision)` pairs, typed resolution, provenance/supersession DAGs, bounded cyclic influence worklist, current readable SHA256/declarations, domain-specific bridges. Archived refs resolve exactly without reading current files as historical payloads.
- **Error/fallback:** Missing ID/revision, duplicate pair/current ID, wrong kind/cycle/current undeclared bridge are structural errors. Retained obsolete approvals are scoped warnings/gaps, never silently retargeted. Protected/external authority not fetched/authenticated.
- **NFR/measurement:** NFR-001/002; VER-002 history resolution/retention/corruption and real normalized BRD table fixture plus former ID+description reference-only rejection. Exactly BRD-OBJ-001/002/003 declare; parser/outcome APIs unchanged.

### SRS-003: Use-specific freshness and affected-only invalidation

- **Statement:** A material scope/revision/freshness change shall flag only consumed decisions, prohibit silent validation upgrades, and preserve unaffected prior decisions/delivery states.
- **Source:** REQ-001/006, AC-002/011; CMP-001/004.
- **Input/trigger:** Explicit asOf expiry/event-marked stale/disputed claim or changed artifact/query/cost/scope/authority.
- **Processing/output:** Contract 2.4/2.6 per-kind influence (including EXP results/primary/guardrail, MET query/baseline/exception, authorization, financial/artifact/strategy/bridge bindings). Three roles preserve lifecycle-compatible experiment plans, exact exceptions and legal descriptive cycles. Effective root state can be inconclusive without rewriting retained transitions.
- **Error/fallback:** Missing historical payload is structural; legitimate obsolete binding is warning in structural mode, gap only for selected proof. Unrelated current/retired evidence never globally blocks freshness readiness; missing event truth stays limitation.
- **NFR/measurement:** NFR-001/004; VER-003 exact before/change/supersede and isolated result/query/baseline/guardrail vectors with full affected IDs, issues/readiness/state/exit and selected unaffected decision; malformed missing pair remains global error.

### SRS-004: Human authority is not JSON attribution

- **Statement:** Resources/workflows shall distinguish recorded decisions from host/operator authorization; missing sensitive-action authority shall permit proposal only, not execute or authenticate human approval.
- **Source:** REQ-001/004/009, AC-002/007/018; CMP-001/004.
- **Input/trigger:** Learning/outreach/exposure/spend/commit/spec/UAT/release/retirement request.
- **Processing/output:** Purpose/scope/revision-specific DEC binding and separate runtime check; limits and uncertainties preserved. Resource can return eligible_for_host_check only.
- **Error/fallback:** Name string, recorded status, green validator or model assertion alone never grants permission; AUTHORIZATION_REQUIRED/proposal_only gap. No action side effect.
- **NFR/measurement:** NFR-002/004; VER-004 adversarial unit and workflow eval: name-only approval, mismatched/expired scope, no outreach/spend, risk_accept stays unvalidated/inconclusive.

### SRS-005: Original decision-led specialist methods

- **Statement:** Opt-in methods shall record decision question, source/sample limits, substitutes, contradictory evidence, strategy/capacity/dependencies/displaced work, without invented findings or ROI from prioritization scores.
- **Source:** REQ-002, AC-003/004; CMP-003.
- **Input/trigger:** Qualified PM request with available authorized inputs, possibly incomplete.
- **Processing/output:** T03/T05 independently author approved methods; product strategy/readable research link canonical ledger and existing requirement authority.
- **Error/fallback:** Unknown customer/market facts remain unknown; sample frequency not representative market percentage; ordering score is not financial return.
- **NFR/measurement:** NFR-003/004; VER-005 package behavior evals and human semantic rubric; not source-text equality tests.

### SRS-006: Optional deterministic investment calculations

- **Statement:** For one compatible incremental accounting boundary the calculator shall compute B, C, net B−C, ROI (B−C)/C, ROI percent and B/C separately; zero/unknown denominator shall never yield infinity.
- **Source:** REQ-003, AC-005/006; HLD-002/CMP-002/LLD-002.
- **Input/trigger:** Schema v1 analysis with explicit currency/scale/horizon/cohort/counterfactual/scenarios or legitimate nonmonetary-only case.
- **Processing/output:** Contract 3.2 BigInt exact money, six-place rational rounding, individual scenario results, explicit available/undefined/unavailable values. B=150000/C=100000 -> net 50000, ROI .5/50%, B/C 1.5.
- **Error/fallback:** Unknown inputs preserved, incompatible units/double-counted mechanisms/costs/negative/nonfinite/out-of-range rejected; capacity informational, not cash savings.
- **NFR/measurement:** NFR-001/005; VER-006 deterministic unit and installed script smoke; no mandated numerical ROI for nonmonetary benefits.

### SRS-007: Timing, payback, discount and duplicate accounting

- **Statement:** Payback shall use complete period cash-flow cumulative durable break-even; NPV shall be returned only for complete compatible time/rate assumptions; scenario accounting shall reject known overlap.
- **Source:** REQ-003, AC-006; CMP-002/LLD-002.
- **Input/trigger:** Period 0..N scenario items, explicit effective-annual rate or null, price basis and netted-cost categories.
- **Processing/output:** Contract 3.2 closed payback object includes period and terminal balance only. Retain paired input.horizon (origin/unit/count) and t01-v2 durable undiscounted period-end convention; no output API additions. Discount/compensated rounding/scenarios unchanged.
- **Error/fallback:** Discount absent not zero; temporary break-even with later loss not durable payback; no LTV/revenue/capacity duplication.
- **NFR/measurement:** NFR-005; VER-007 unit: period zero, no payback, recrossing, monthly annual conversion, half rounding, zero rate, missing discount, 1-minor-unit NPV tolerance.

### SRS-008: Bounded validation and honest product states

- **Statement:** Validation shall predeclare hypothesis/cohort/metrics/sample/method/time/budget/exposure/stop rules and route supported/refuted/inconclusive outcomes without unconditional full build.
- **Source:** REQ-004, AC-007/008; CMP-003/004.
- **Input/trigger:** Falsifiable HYP and proposed/authorized EXP under separate learning authority.
- **Processing/output:** Complete kind payloads/2.4 transitions; validated_for_scope requires current result sources, primary/guardrail measurement support and immutable recorded scoped investment DEC. 2.6 plan projection allows result/lifecycle additions but changed query/prediction/cap/guardrail requires new authorization. Risk acceptance never implies validation.
- **Error/fallback:** Authorization/cap/guardrail missing -> proposal-only; negative -> stop/pivot; inconclusive -> bounded further learning/defer. No autonomous experiment execution.
- **NFR/measurement:** NFR-004; VER-008 T04/T06 package pressure cases, T09 negative consumer vectors, human host authority review.

### SRS-009: Measurement before release; value separate from delivery

- **Statement:** Rollout readiness shall require MET definition/denominator/query revision/eligible cohort, baseline or scoped exception, owner, instrumentation/guardrail and review trigger; released delivery may have inconclusive product value.
- **Source:** REQ-005, AC-009/010; CMP-001/003/004.
- **Input/trigger:** Release decision or eligible post-release review window.
- **Processing/output:** Contract 2 MET/REV influence includes query/baseline sources and exact exception authority/bindings; historical REV.decision is attribution, not current consent. Actual-cost/observation sources and confounder limits remain explicit. No causal/financial success inferred from delivery.
- **Error/fallback:** Missing baseline/query/analytics -> blocked release gap or explicit scoped human exception, not invented observations. Insufficient/confounded review -> product inconclusive, feature_status released unchanged.
- **NFR/measurement:** NFR-004; VER-009 validator fixture plus T05/T07/T10 behavior scenarios and independent finance/analytics review.

### SRS-010: Proportional connected routing

- **Statement:** New workflows shall be conditional, preserve active-incident precedence, known maintenance routes and valid approved evidence; reopen only affected gaps.
- **Source:** REQ-006, AC-011/012; HLD-003/CMP-004.
- **Input/trigger:** Existing sdlc intake/planning/readiness/release/retro flows with task type and scoped authority.
- **Processing/output:** Discover-product/validate-product/review-product-value branches in contract 4; original Why/What/How remains canonical; execution/handoff/outcome/cost portable.
- **Error/fallback:** Missing optional workflow/package returns specific safe gap; no mandatory research restart, no substitute PRD generator.
- **NFR/measurement:** NFR-003/004; VER-010 pressure fixtures incident, maintenance, approved spec, stale affected claim; audits plus behavioral review, not a graph diagram alone.

### SRS-011: Standalone shipped resources and native exports

- **Statement:** Actual CLI sync shall distribute package scripts/assets/references/attribution through existing resource/ownership support and native exports; installed tools shall run with only Node builtins in an empty consumer.
- **Source:** REQ-007, AC-013; HLD-002/CMP-005/LLD-003.
- **Input/trigger:** Explicit common/PM selection at reviewed immutable ref, native agent selection and workflow selection.
- **Processing/output:** Contract 3 layout and CLI/library interfaces; ordinary and Kiro package-relative paths; native Codex/Claude/Gemini/Antigravity workflows as current transformers prescribe.
- **Error/fallback:** Absent runtime/resource/pack is explicit gap; never install-run scripts, import repository-only modules or replace unknown/user-edited files. CLI service rewrites unnecessary.
- **NFR/measurement:** NFR-002/006; VER-011 actual consumer sync, lock integrity, override/unowned file, byte hashes and installed resource behavior; tests alone not runtime proof.

### SRS-012: Opt-in narrow routing and honest capability gaps

- **Statement:** PM shall not install/activate unconditionally; file routing shall target only common ledger JSON and PM qualified keywords; selected optional workflows shall remain honest without packages.
- **Source:** REQ-007, AC-014; CMP-005/LLD-003.
- **Input/trigger:** Files/keywords and workflows array/true/omitted/false.
- **Processing/output:** Contract 4 metadata/keyword table/conditional static router row, same public APIs and DEFAULT_WORKFLOWS. Workflow preflight names exact missing skill/resource/runtime/data and next safe action, preserves Outcome schema.
- **Error/fallback:** README/unrelated markdown/JSON and bare metrics/market/ROI do not match; workflows true may export PM workflows without PM package but cannot claim readiness. No implicit excludes override.
- **NFR/measurement:** NFR-003/006; VER-012 existing CLI/MCP fixture tests plus real stdio load/get negatives and sync selection matrix.

### SRS-013: Real transport consumer proof and revision join

- **Statement:** The integrated candidate shall be verified with actual CLI install/native export and actual MCP transport requests, plus installed resource execution; only remote registry/network may be substituted.
- **Source:** REQ-007/008, AC-013/014/015; CMP-006/LLD-004.
- **Input/trigger:** Frozen T02–T07 source/resource revision followed by T08 regeneration.
- **Processing/output:** Contract 6 executable harness, isolated consumer/HOME, test-only loopback redirect, source/lock/resource hashes, command/output/assertion report. Antigravity second consumer supplies canonical workflow MCP lookup; native-only limitations disclosed.
- **Error/fallback:** No internal service/fs/transform echo mocks. Unexpected external network/route, missing native surface, library side effect or built transport bypass fails harness; no production backdoor.
- **NFR/measurement:** NFR-002/006; VER-013 actual runtime smoke and independent T11 review. Candidate changes invalidate smoke/evals and require regeneration/recheck.

### SRS-014: Independent behavior and gated efficacy evidence

- **Statement:** Package trust claims shall distinguish deterministic contract/runtime proof, independent semantic review, and separately human-authorized blinded live efficacy evaluation.
- **Source:** REQ-008, AC-015/016; CMP-006.
- **Input/trigger:** Stable integrated package and immutable eval plan accepted at H2.
- **Processing/output:** Pinned eligible model/effort/tools/package/inputs, isolated and blinded candidate/current/no-skill arms, held-out cases; existing per-skill case pass >85%, assertion >=85%, delta >=0, trigger recall/specificity >=90% from CONTRIBUTING.
- **Error/fallback:** No live run before H2, manufactured pass scores, historical result mutation or reviewer-name approval. Incomplete/invalid arms remain incomplete; findings return to original owners.
- **NFR/measurement:** NFR-004/006; VER-014 existing eval machinery audit/immutable inputs/source hashes and independent rubric. T01 creates no live manifest/transcript/result.

### SRS-015: Bounded ownership, profiles and gates

- **Statement:** Every implementation brief shall preserve authorized domain/profile/settings, exact files/interfaces/dependencies/ACs, no worker delegation, independent review and human approval gates.
- **Source:** REQ-009, AC-017/018.
- **Input/trigger:** Dispatch, path collision, model/account contradiction, consequential unresolved disagreement or proposed premium consultation.
- **Processing/output:** Personal authorization and Gemini cheap override recorded in T01 brief; T01 itself is Personal · Analysis & Review, omp/openai-codex/gpt-6.1-sol high/write, no features. Exact owners contract 5; H1 before implementation, H2 before live eval, H3 before adoption. Premium not authorized.
- **Error/fallback:** Stop conflicting edit/unsafe dependent decision and message orchestrator; do not impersonate human or change policy/provider/approval controls. Independent safe design work continues.
- **NFR/measurement:** NFR-004; VER-015 brief/settings/permissions/path audit by orchestrator and independent reviewer; controls enforced at host, not attributed JSON fields.

### SRS-016: Reviewable dossier, pilot and rollback

- **Statement:** Handoff/adoption artifacts shall expose scope/contracts/profiles/evidence/missing decisions separately; pilot/publication shall require explicit revision-bound human authority and reversible pinned package adoption.
- **Source:** REQ-010, AC-019/020; CMP-006.
- **Input/trigger:** T11 independent review/release dossier, later H3 pilot or publication decision.
- **Processing/output:** Contracts/sources/verification per owner, H1/H2/H3 status, affected source hashes, finance/analytics/research/release accountable roles, prior pinned revisions and preserve-custom-overrides rollback plan.
- **Error/fallback:** Missing real pilot baseline/access/owners/budget blocks impact claims, not independent registry design. No commit/push/publish/pilot/customer action now. H3 pilot approval does not authorize publication/default adoption.
- **NFR/measurement:** NFR-004/006; VER-016 human dossier checklist and controlled pilot evidence; no agent may mark human checkbox approved.

## 4. Functional flows (one actor/goal/session)

| FRS | Actor / goal | Normal course | Alternate course | Exception / recovery |
| --- | --- | --- | --- | --- |
| FRS-001 | Research owner / inspect investment claim | Load canonical ledger, resolve source origin/time/scope/classification/counterevidence, validate links, produce referenced synthesis | Authorized protected source pointer remains opaque and limitations recorded | Invalid path/ref/revision produces deterministic issue; repair owner record, never fetch protected data or fabricate |
| FRS-002 | Finance owner / compare incremental options | Provide coherent scenario JSON, run installed calculator, inspect B/C/net/ROI/payback/NPV and assumptions | Qualitative investment or unknown inputs -> explicit nonmonetary/unavailable outputs | Incompatible units/duplicates reject entire analysis; repair inputs, not coercion |
| FRS-003 | Product owner / propose bounded test | HYP/EXP/MET proposal, predeclared rules/bounds and DEC authority scope, host checks action permission | No authorization -> proposal-only; test negative/inconclusive routes stop/pivot/learning | Guardrail/cap/data/scope changed -> affected decision re-review; do not proceed from earlier name string |
| FRS-004 | Release owner / assess measurement readiness | Inspect existing delivery/UAT authority plus MET baseline/query/owner/guardrail/review trigger and release DEC | Explicit scoped baseline exception with host authority | Missing measurement -> gap; preserve delivery progress, no market success claim |
| FRS-005 | Registry consumer / use opt-in capabilities | Real sync at immutable refs, native invocation, MCP get/load, installed tools executed offline | workflows true without PM exports procedures but preflight identifies exact absent dependencies | Partial/missing resource runtime -> honest gap; no monorepo import/default install workaround |
| FRS-006 | Analytics/product owner / decide value review | Eligible observation window, MET/REV/source/actual-cost evidence, compare original scoped prediction and assumptions | Confounded/insufficient -> inconclusive product value; released feature remains released | No retirement/scale/customer action without matching human/host authorization |

## 5. Interface, data and migration rules

Ledger API/JSON schemas, resource CLI/library shapes, exit precedence, errors, field tables, transitions, root/path/URI behavior, numeric precision and installed paths are normative in contract 2–4. No HTTP API/event payload or new public MCP schema is introduced. Existing MCP get/load/get_workflow remains current API. Async validator reads only bounded trusted-root files; synchronous calculator consumes only supplied value. No daemon/cache/database/connector. Import is side-effect-free; commands emit one JSON result.

Consumers keep full prior record/authority snapshots in the single bounded ledger and preserve authorized immutable ledger/approval artifacts for independent comparison. Archive arrays are not authenticated history; mandatory historical_payloads_not_authenticated limitation. t01-v2 revises unimplemented schema v1 (adds history arrays + DEC strategy_binding), not a shipped migration. Unknown versions fail. Project retention policy governs bound exhaustion; resource never deletes/prunes/resolves an external store. Workflows prepare one consistent candidate, retain exact old DEC/bridge/State refs, explicitly select current proof, and re-review affected bindings. No automatic stale-approval fallback or whole-ledger approval hash for evolving experiment results.

Outcome schema v1, `feature_status` enum, BRD-OBJ/REQ/AC/SRS arrays and all existing consumers remain unchanged. Product states belong only to ledger contract. Outcome completed_evidence/missing_evidence link ledger path + revision/IDs. Existing trace/outcome parsers remain read-only. The core SDLC chain/default workflow list stays unchanged; optional workflows are audited explicitly rather than added to default installation.

## 6. NFR thresholds and measurement

These are contract constraints, not observed deployment performance/availability claims.

| NFR | Requirement / numeric threshold | Method and evidence |
| --- | --- | --- |
| NFR-001 determinism/bounds | Same input/asOf/gate -> identical sorted issues/results; permutations preserve readiness/affected IDs, field paths follow actual indexes. Ledger <=1MiB; <=2000 current+history snapshots, <=100 current+history authorities, <=10000 stored refs incl state/bridges/history, <=128 state transitions, <=256 read files, depth 64. Influence visited once per pair/role, <=3 roles; finance <=3 scenarios/1000 items/600 periods | Limit/+1 incl archives, iterative cyclic-influence termination, unchanged-history comparison, exact projected gate outputs; record maximum duration, no invented SLO |
| NFR-002 isolation/privacy | Zero network/query/script execution by resources; zero writes; zero repository/nonbuiltin runtime imports; zero escaped/symlink/device file reads; no secret/absolute-path diagnostics | Host-isolated installed execution, malicious URI/path/symlink/input mutation cases, command stdout/stderr and filesystem observations |
| NFR-003 token/routing | Canonical skill <=100 lines; new workflow <=80; PM file triggers empty; common only one narrow ledger JSON glob; zero PM matches for unrelated README/JSON and bare keywords | Scoped content audits and actual MCP match/get/load plus native consumer surfaces |
| NFR-004 authority/evidence | Zero fabricated observations/approval/pilot outcomes; no unsupported state upgrade; every relevant critical claim/decision has source/scope/revision/freshness rationale; every sensitive action requires actual host/operator control | Negative pressure cases plus independent semantic/human review; deterministic resources alone cannot certify enforcement |
| NFR-005 numeric | Money scale 0..4, safe minor-unit range <=9007199254740991, ratios 6 decimals half-away, rate 0..1 effective annual <=8 decimals; NPV B+C <=1000000000000 minor units and error <=1 minor unit against independent reference | Exact rational/boundary/rounding/payback oracle; NPV timing/range oracle; known zero vs null/empty-side and incompatible unit tests |
| NFR-006 delivery proof | One frozen integrated source/resource candidate per generated/smoke/eval report; real CLI and real MCP requests; no internal mock consumer proof; independent reviewer not implementer | Reported hashes/native bytes/lock ownership/transport requests; T08 join, T09 observed smoke, T10 gated efficacy, T11 review |

## 7. Failure analysis and stop rules

| Failure | Detect | Required outcome |
| --- | --- | --- |
| Copied citations share original observation | SRC origin_id/dependency + claim limitations | Do not call repeated sources independent or a probability |
| Evidence stale/disputed or authority/artifact changed | asOf/expiry/status/hash/revision/dependency closure | Only affected DEC/readiness blocked; retain unrelated approvals and delivery state |
| Record loops/dangling/wrong type | deterministic schema/graph checks | Nonzero structured error, no partial readiness |
| Protected data/unsafe path/URI | URI allowlist, root/path components and policy | No fetch/read of forbidden target; sanitized error; host isolation remains responsibility |
| Capacity counted as cash, duplicate revenue/netted COGS | financial side/basis/category/mechanism checks and human boundary review | Reject known overlap; capacity informational; unknown monetary return explicit |
| Zero/unknown costs or missing discount | exact inputs / null fields | undefined/unavailable reason; never Infinity/default 0% |
| Temporary cash break-even then loss | cumulative durable-payback rule | not_reached unless later durable crossing exists |
| Pack/resource/runtime absent | explicit workflow preflight and installed checks | Exact capability gap/next safe action, not fake readiness or silent install |
| Native workflow absent from MCP canonical scanner | consumer agent format + scanWorkflows source | Native invocation remains available; separate Antigravity real-sync lookup proof, disclose limit |
| Fixture redirect doesn't cover built CLI | real network path logging/deny unknown egress | Fail harness, return evidence/options; never mock internals or weaken claim |
| Shared path collision / canonical correction during join | owner map/source hashes | Stop conflicting edit, orchestrator restores ownership; regenerate/reverify settled revision |
| Human approval/profile/premium unresolved | brief/host authority | Block dependent action, continue safe independent work; no silent model/policy bypass |
| Missing real pilot economics or confounded metrics | MET/REV/INV and finance/analytics review | Product value inconclusive/return unknown; no fabricated success |

## 8. Verification matrix and exact future execution units

Future commands below are **plans, not claims of executed implementation tests**. All final owner runs happen only after drafts settle, in the authorized integrated workspace. Use current locked dependencies; do not approve ignored build scripts from within a worker. Orchestrator owns consolidated build/audit run after join.

| VER | Exact owner file / command or scenario | Required observable assertion |
| --- | --- | --- |
| VER-001/002/003/004/009 | T02 `scripts/skill-tests/common-product-evidence/validate-product-evidence.test.mjs`; `rtk proxy node --test scripts/skill-tests/common-product-evidence/validate-product-evidence.test.mjs` | Full current/history fixtures; retained old refs valid, absent pair structural; six timeline outputs, twelve source-only influence outputs with exact affected IDs/issue severities/state/exits; result/query/baseline/guardrail/plan/exception/strategy/authorization/artifact boundaries; archived bytes not read/authenticated; legal descriptive cycles; normalized real BRD declarations + reference-only rejection; unchanged path/URI/limits/no-human-approval checks |
| VER-006/007 | T04 `scripts/skill-tests/product-investment/evaluate-investment.test.mjs`; `rtk proxy node --test scripts/skill-tests/product-investment/evaluate-investment.test.mjs` | Original numeric boundaries unchanged; exact closed output/payback keys, paired input.horizon + contract timing metadata with no added output fields; zero/null/empty, overlap/capacity, durable/recrossing payback, discount/nonmonetary cases remain |
| VER-005/008/009/010 | T03/T04/T05 package `evals/evals.json`; T06/T07 portable workflows; no live workers until H2 | Semantic pressure review and later blinded cases for invented customer facts, sampled percentages, negative/inconclusive experiments, unavailable analytics, scored roadmap vs ROI, incident/maintenance/valid-evidence route preservation |
| VER-011 | Existing `cli/src/services/__tests__/SkillSyncService.package.spec.ts`, `SyncInstallLifecycle.spec.ts` plus T09 real sync | Bytes/attribution/overrides/unowned files and no partial unsafe install; installed scripts work with cwd consumer and no repo imports |
| VER-012 | T08 existing `IndexGeneratorService.spec.ts`, `WorkflowSyncService.spec.ts`; `rtk pnpm --filter ./cli exec vitest run src/services/__tests__/IndexGeneratorService.spec.ts src/services/__tests__/WorkflowSyncService.spec.ts` | Optional router visible only installed; common JSON narrowed; arrays/true/default/false keep existing semantics/default list |
| VER-012 MCP | T08 existing `mcp/test/SkillIndex.spec.ts`, `Tools.spec.ts`; `rtk pnpm --filter ./mcp exec vitest run test/SkillIndex.spec.ts test/Tools.spec.ts` | Qualified actual bodies/ledger JSON positives; unrelated README/JSON and bare keywords negative; missing skill guidance truthful |
| VER-013 | T09 `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs` and `consumer-smoke.test.mjs`; `rtk proxy node --test scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs`; actual executable invocation contract 6 | Fresh isolated real CLI/native install + real stdio MCP initialize/get/load/get_workflow + installed validator/calculator behavior; network-only fixture; ownership and selection variants; report command/exit/assertions/hashes |
| VER-013 audit | T08 new `scripts/audit-sdlc.product-evidence.test.ts`; `rtk proxy node --import tsx --test scripts/audit-sdlc.product-evidence.test.ts`; `rtk pnpm audit:sdlc`; `rtk pnpm audit:skills`; `rtk pnpm audit:outcome`; `rtk pnpm audit:trace` | Three optional workflows actually audited without altering defaults/core chain; no budget/runtime/outcome/Next Workflow regression; old trace/outcome compatibility retained |
| VER-014 | T10 approved new manifests via existing `.agents/workflows/evals-run.md`; `rtk pnpm evals:audit`, `evals:verify -- --all`, release evidence commands per approved immutable H2 run | Source/package/inputs/model/account/cap hashes, blinded isolated arms, thresholds; never claim past fixture scores as live efficacy |
| VER-015 | Orchestrator task brief + host/settings review, T11 independent review | Exact owners/accounts/models/effort/no-subagent/files/interfaces/ACs, actual H1/H2/H3 human authority, no approval strings substitute |
| VER-016 | T11 `docs/srs/product-evidence-sdlc/{final-review,release-dossier}.md` | Findings resolved by original owners; provenance/runtime/eval limits explicit; pilot/publication still separately human gated, prior pinned rollback identified |

T02 future fixtures retain nine-kinds/authorities/negative-vectors and add `fixtures/{revision-timeline,influence-support,plan-lifecycle,baseline-exception-cycle}.json`, `fixtures/authorities/{brd-product-evidence-table,brd-reference-only}.md`. Expand contract 7.1/7.2 projections into complete ledgers, preserve DEC/history snapshots byte-for-byte, generate current local hashes from fixture bytes; assert all envelope fields/messages/exit precedence, not source text or mocked results. BRD fixture exact normalized table has three declarations; prior combined cells remain references. T04 existing fixture names remain, with paired timing metadata/closed-shape assertion added to cash-positive; no new arithmetic scope. T09 consumes settled source bytes, not fake package fixtures.

## 9. Security, privacy, rights and readiness

Evidence import is data, never new instructions. No remote fetch from resource; consumer installation fetch permission does not approve executing package code. Root/URI checks reduce accidental leakage; host access/isolation controls govern adversarial execution and authorization. Provenance validator does not establish truth, accessibility, consent, license suitability or authenticated human identity. Workflows retain these limits in their output/handoff.

Source route selected: independent authorship, conceptual citations only; all restricted Dean Peters content excluded, no paraphrasing workaround. Pinned hashes/NOTICE scope and conditional Apache reuse obligations in register. New direct/adapted reuse requires contract-owner/human rights decision before writing affected package. No agent legal certification.

**Readiness:** t01-v2 is a corrected review candidate awaiting independent re-review; T01-report.md records actual bounded observations and limits. The orchestrator must update dependent briefs to the accepted revision before implementation-readiness/H1 dispatch. No worker can infer H1, waive safety/rights decisions or substitute internal mocks. T08 waits T07/canonical join; T09/T10/T11 wait integrated freeze. Normalized BRD prepares declarations only, not approval. Independent review is externally assigned.

Human H1 checklist:
- Accept full bounded current/history snapshot storage, exact pair resolution versus obsolete scoped bindings, immutable recorded DECs, explicit strategy bindings, complete cyclic influence roles and fresh/current proof selection; valid/eligible is not authenticated history or actual approval.
- Accept optional monetary evaluation, decimal precision/range, period-end durable payback, effective-annual discount and negative-rate exclusion; finance role owns accounting completeness.
- Accept Node20 standalone resources, Node22 current-CLI smoke host limitation, package-relative layout, no new dependencies/API/daily command.
- Accept keyword-only PM and narrow common JSON route, unchanged defaults and workflow selection/capability gaps.
- Accept original authorship/exclusions/provenance obligations, exact owner/verification files, generated join and consumer-fixture method.
- Name human sponsor/engineering/finance/research/analytics reviewers as applicable; authorization scope/revision preserved. None of these boxes is checked by this design worker.

## 10. Outcome and handoff

Product implementation status is not_started. The technical design is a review candidate; design_ready is the artifact-progress status, not H1 approval. Outcome Report schema v1 shall link these design docs/report through existing evidence arrays only. No product IDs or new fields enter requirement_trace.

Synthetic schema-compatibility example only (timestamps are fictional, not T01 execution evidence):

```json
{
  "schema_version":1,
  "run_id":"synthetic-design-contract-example",
  "slug":"product-evidence-sdlc",
  "workflow":"design-solution",
  "feature_status":"design_ready",
  "started_at":"2026-10-11T09:00:00Z",
  "completed_at":"2026-10-11T10:00:00Z",
  "requirement_trace":{"brd_objectives":["BRD-OBJ-001","BRD-OBJ-002","BRD-OBJ-003"],"requirements":["REQ-001","REQ-003","REQ-004","REQ-005","REQ-007","REQ-009"],"acceptance_criteria":["AC-001","AC-002","AC-005","AC-006","AC-007","AC-009","AC-013","AC-014","AC-018"],"srs":["SRS-001","SRS-002","SRS-003","SRS-004","SRS-006","SRS-007","SRS-008","SRS-009","SRS-011","SRS-012","SRS-013","SRS-015"]},
  "completed_evidence":["docs/srs/srs-product-evidence-sdlc.md","docs/srs/product-evidence-sdlc/contract-decisions.md","docs/srs/product-evidence-sdlc/source-reuse-register.md"],
  "missing_evidence":["Independent contract review","Human H1 contract approval","Product implementation and consumer verification","Human H2 approval and live efficacy evidence","Human H3 adoption approval and real pilot evidence"],
  "decision_needed":["Orchestrator assigns independent contract review; human decides H1"],
  "recommended_next_workflow":"implementation-readiness",
  "cost":{"source":"unavailable"},
  "agent":{"identity":"synthetic design example","model":"not-a-runtime-model"}
}
```

Handoff: slug product-evidence-sdlc; SRS path this file; contract/source register linked above; trace matrix section 3; HLD/CMP/LLD/VER mapping sections 2/8; exact interfaces/contracts sections 2–4 of companion; no migration/database; scoped NFRs section 6; evidence/limits in T01 report; approval pending H1; operator_profile technical (bounded design-worker brief, no re-inference of parent operator). Cost source unavailable unless host provides actual fields; MCP consultation counts are not monetary costs or proof of enforcement.

**Next workflow:** independent contract review assigned by orchestrator -> human H1 contract decision -> implementation-readiness against accepted revision and updated briefs. Do not launch implementation, live evaluation, pilot, premium consultation or publication from this handoff.
