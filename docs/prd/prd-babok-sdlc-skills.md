# BABOK-Informed BA and SDLC Skills — Implementation Plan

Status: T5–T7 canonical changes and bounded static reviews are complete; T8a packaging and independent projection verification, plus bounded native-consumer capture and independent semantic grading, are complete. PR preparation and human acceptance remain pending. Distribution rights, broader efficacy, and complete runtime-usage/billing semantics are not established.
Slug: `babok-sdlc-skills`  
Date: 2026-10-23  
Operator profile: technical; lane: direction  
Proposed owner: repository maintainer (product owner and human acceptance authority)  
Execution: Maintainer selected staged execution through a reviewed PR and authorized the bounded work described in later amendments. T5–T7 source changes, bounded static review, integrated checks, and bounded runtime evidence are complete; PR preparation and human acceptance remain open. No merge, release, activation, or private-reference publication is implied.
SNC: S=2 N=2 C=2 total=6 tier=high; model_tier=strong for planning/review depth, not permission to bypass profile routing or invoke premium models.

## 1. Review Contract and Authority

This document is the requested detailed implementation plan, not an instruction to start it. No book conversion, installation, worker dispatch, paid model comparison, live evaluation, registry implementation, publication, release, or activation is authorized by creating it.

The maintainer requested a full BABOK-informed SDLC improvement, local source measurement, and staged implementation through a reviewed PR, subject to explicit scope, handling, evaluation, and publication gates.

Proposed execution approach: Subagent-Driven, with bounded workers and independent review. At plan creation, the instruction to wait for an eligible execution route established intended sequencing, not current execution authorization. Load `subagent-driven-development` before future implementation. Do not launch workers or switch to inline execution without the applicable authority. No automatic fallback, quota polling, scheduled restart, or premium invocation.

Approval of this plan concerns its scope and decisions only. Starting local preparation, model generation, registry integration, live evaluations, and publication each requires the applicable explicit authority described below. A later start instruction must identify the approved phase; do not infer approval of all spending from approval of local measurement.

### Resume amendment — 2026-10-23

Maintainer instruction authorized staged implementation using the approved delivery route in place of the earlier wait, with the source supplied. This supersedes the earlier quota wait and routing assumption; it does not imply quota restoration. Analysis/review remained separately routed. No automatic fallback or premium route is authorized.

Local measurement was authorized using the supplied read-only PDF in a private, isolated preparation area outside the repository and automatic skill discovery. No full-text ingestion into model context, installation, paid comparison, bulk generation, registry change or publication was included in that local measurement dispatch. G1–G6 remain active; measured usage/budget and rights boundaries must be settled before dependent phases. Source availability supersedes the missing-source blocker; its edition, page count and extraction quality remained to be measured at this checkpoint.

## 2. Objective, Users, and Success

### Objectives

- **BRD-OBJ-001 — Improve BA judgment:** source-grounded elicitation, requirements analysis, governance, change assessment, and solution evaluation improve agent decisions rather than merely vocabulary.
- **BRD-OBJ-002 — Cover the entire SDLC:** map BABOK practices into existing lifecycle owners without creating a competing six-stage pipeline or second requirements database.
- **BRD-OBJ-003 — Control conversion cost:** measure source size locally, bound generation, checkpoint results, and expose actual usage before committing to remaining work.
- **BRD-OBJ-004 — Preserve distribution boundaries:** separate private book-derived artifacts from independently authored registry changes and reviewed reusable material.

### Users / Jobs

| Persona | Job |
| --- | --- |
| BA / product analyst | Turn evidence and stakeholder needs into validated, change-controlled requirements |
| PM / delivery owner | Make scope, priority, authority, readiness, and value decisions explicit |
| Engineering / QE | Consume stable contracts and trace changes to verification without inventing business policy |
| Maintainer | Improve skill behavior with evidence while controlling quota and publication risk |

Proposed acceptance target: before human final acceptance, disposition every task in the verified edition's six knowledge areas; demonstrate coverage of every approved behavioral improvement; introduce zero critical source-fidelity, authority, sensitive-change, or low-risk-routing regressions in the frozen acceptance scenarios. These are proposed targets, not observed results or BABOK-mandated metrics.

A numerical improvement percentage or dollar ceiling is deliberately not fabricated. Freeze these after local measurement and rubric review, before generation/evaluation. No delivery deadline is promised before the PDF, rights, account eligibility, quota, and budget are confirmed.

## 3. Scope and Non-Goals

### Capability inventory

| Capability | Disposition | Trace |
| --- | --- | --- |
| Validate source, rights, and model handling | in_scope | REQ-001 |
| Extract and measure the complete PDF locally | in_scope | REQ-002 |
| Calibrate bounded conversion quality and cost | in_scope | REQ-003 |
| Convert the full authorized source into a private reference skill | in_scope | REQ-004 |
| Crosswalk all knowledge areas/tasks and supporting material | in_scope | REQ-005 |
| Improve approved existing skills and lifecycle handoffs | in_scope | REQ-006 |
| Verify consumer behavior and semantic outcomes | in_scope | REQ-007 |
| Prepare a reviewed repository delivery and private handoff | in_scope | REQ-008 |
| Launch conversion now or automatically on quota recovery | excluded | Maintainer instruction |
| Publish BABOK PDF, extracted text, or detailed private derivative notes | excluded | Rights boundary |
| Implement a generic document-conversion platform or new registry service | excluded | Unrequested scope |
| Replace existing requirements/evidence IDs, add a parallel ledger, or force waterfall gates | excluded | Existing contracts |
| Claim IIBA certification, endorsement, legal clearance, or complete BABOK equivalence | excluded | Unsupported authority |
| Run a paid Flash-versus-GPT comparison | deferred | Separate optional authorization only |
| Merge, tag, release, or activate installed consumers | excluded | Separate maintainer decision |

A pilot validates the method; it does not shrink the requested full-book conversion or full-SDLC assessment. Skipping a chapter, technique, competency, perspective, or integration target requires an explicit disposition, not silent omission.

## 4. Evidence and Existing Contracts

| Claim | Evidence / status |
| --- | --- |
| Source has 514 pages | User-supplied; actual metadata and edition not yet measured |
| No PDF available during discovery | No matching PDF/BABOK filename found in this checkout; no source contents processed |
| Upstream separates Python extraction from agent synthesis | Inspected upstream README, `SKILL.md`, architecture guide, and `book_to_skill/parsers/pdf.py`; branch references are mutable and must be pinned before reuse |
| BRD/PRD/QE BA/SRS capabilities already exist | `skills/product-management/product-business-requirements/SKILL.md`; `skills/product-management/product-requirements/SKILL.md`; `skills/quality-engineering/quality-engineering-business-analysis/SKILL.md`; `skills/common/common-software-requirements/SKILL.md` |
| Shared requirements rules must retain one owner | `skills/product-management/product-requirements/references/requirements-modeling.md`, especially sizing, canonical rules, and scoped change impact |
| Canonical workflows are not native export copies | `ARCHITECTURE.md:161-175`; author `.agents/workflows/*.md`, use established distribution tooling |
| Prior modeling work is not proof of semantic efficacy | `docs/prd/prd-plan-requirements-workflow-modeling.md:274-320` separates source delivery from pending native/pilot/final acceptance |
| Existing provenance precedent | `docs/srs/product-evidence-sdlc/source-reuse-register.md`; independent authorship and explicit exclusions, not legal certification |
| Evaluation infrastructure already exists | `docs/EVALS.md`; `package.json` validation, audit, selective eval, generation, and token-report scripts |
| Comprehensive BABOK alignment currently unknown | Discovery found substantial BA coverage but no explicit BABOK crosswalk; absence of a named baseline does not prove absence of practices |
| Cheap profile quota unavailable | Maintainer-directed wait; do not probe or route around it |

Source links:

- Converter: https://github.com/virgiliojr94/book-to-skill/tree/master/book_to_skill
- Generator instructions: https://github.com/virgiliojr94/book-to-skill/blob/master/SKILL.md
- IIBA tasks: https://www.iiba.org/knowledgehub/business-analysis-body-of-knowledge-babok-guide/tasks/
- IIBA AI/BA article: https://www.iiba.org/business-analysis-blogs/your-new-colleague-doesnt-replace-the-babok-guide-they-read-it/
- Supplied Vietnamese overview: https://www.bacs.vn/vi/blog/nghe-nghiep/babok-la-gi-vi-sao-babok-duoc-xem-la-kinh-thanh-cho-business-analyst-19865.html

The IIBA article returned HTTP 403 directly; discovery used indexed content. The Vietnamese page reader exposed metadata, not substantive article text. Neither is treated as a substitute for the book or as measured efficacy evidence.

## 5. Requirements and Acceptance Criteria

All requirements: priority P0, status Draft. Product owner: maintainer; engineering owner: assigned slice owner; verification owner: separate reviewer/QE role. IDs below are local to this plan and do not replace IDs in existing plans.

| Requirement / objective | Accountable delivery role | Observable acceptance criterion |
| --- | --- | --- |
| REQ-001 / OBJ-004: establish source and reuse authority | Maintainer + provenance reviewer | AC-001: before source text reaches any model, record edition, hash, permitted uses, private/public destinations, eligible provider/account, and handling terms; unresolved rights block the affected processing/distribution lane |
| REQ-002 / OBJ-003: measure extraction without LLM ingestion | Local preparation owner | AC-002: report actual pages, per-section token counts with tokenizer/method, blank or low-text pages, table/diagram limitations, and printed/PDF page mapping; do not send full text to the orchestrator |
| REQ-003 / OBJ-001,003: qualify conversion method | Conversion owner + independent reviewer | AC-003: bounded representative pilot has source-checked outputs, actual usage or explicitly unavailable fields, correction costs, and approved remaining-work forecast; fail closed if enforceable limits are unavailable |
| REQ-004 / OBJ-001,004: produce full private reference | Conversion owner | AC-004: every source section has a completion or explicit exclusion disposition; reference skill routes topics to source-linked notes and reports unreadable content without inventing it |
| REQ-005 / OBJ-002: establish complete crosswalk | BA mapping owner | AC-005: all tasks in verified edition mapped to existing ownership with covered/partial/missing/intentionally-out-of-scope dispositions; techniques, key concepts, competencies, and perspectives each have a reuse/disposition inventory |
| REQ-006 / OBJ-001,002: integrate approved improvements | Canonical component owners | AC-006: every accepted gap maps to one canonical behavioral rule/reference and a verification scenario; callers reference it without competing definitions; existing low-risk and sensitive-change gates remain intact |
| REQ-007 / OBJ-001,003: prove behavior and quota discipline | Independent reviewer / QE | AC-007: deterministic checks, actual native reference-consumption smoke, and frozen baseline/candidate scenarios have revision-bound evidence; no critical regressions; no claim of improvement from formatting/keyword checks alone |
| REQ-008 / OBJ-002,004: deliver reviewable package | Integration owner + maintainer | AC-008: changed files, coverage dispositions, rights decisions, token deltas, verification evidence, actual costs/limits, and remaining restrictions are handed off; no automatic merge/release/activation |

Failure cases include unreadable extraction, missing source context, contradictory stakeholder evidence, quota exhaustion, output truncation, stale checkpoints, incomplete source anchors, unapproved derivative distribution, and a reviewer unable to verify claims. These produce explicit failure/partial states, not fabricated successful fallbacks.

## 6. Design Decisions and Data Boundaries

1. **Local extraction first.** Prefer inspected existing extraction tooling over writing a new parser. Select layout-aware extraction if samples show table loss; OCR only affected scanned pages. Pin upstream revision and review scripts/dependencies before execution. No global install by default; use an isolated environment after approval.
2. **Private full-book reference; separate registry patch.** Detailed derivative content stays in a maintainer-selected private directory outside the repository and outside automatically scanned skill roots until reviewed. A hidden/ignored directory in the public checkout is not sufficient isolation. Verify destinations before writing. Human confirmation of permitted use is not an agent legal opinion.
3. **Do not blindly follow upstream publication defaults.** Disable/omit GitHub publication, automatic user-level installation, symlinks, or other discovery until explicitly approved. Converter MIT rights do not grant rights over BABOK. Independent wording alone does not establish non-infringement.
4. **Use one canonical owner per rule.** Preserve BRD Why / PRD What / SRS How, existing REQ/AC IDs, evidence-record domains, partial-readiness boundaries, and local change reopening. Do not change unrelated approved contracts.
5. **Use bounded source packets.** Chunk on logical sections, retaining necessary table headings, definitions, and cross-references. Record unresolved dependencies. Never resend the whole book for every chapter or let workers browse unrestricted private source trees.
6. **Use the maintainer-authorized delivery route for approved implementation.** Confirm project/account eligibility before dispatch. Do not automatically switch routes, probe quota, or use a premium route.
7. **Analysis/review use eligible analysis profiles.** Confirm profile and project authorization before dispatch. No premium advisor. No model superiority or savings claim before evidence. A separate model comparison remains optional, not a dependency or implicit billable task.
8. **Checkpoints are private data artifacts, not a new product service.** Reuse safe completed chunks only when source hash, converter revision/options, tokenizer, prompt/schema revision, and model configuration match. Reprocess invalidated chunks and dependencies, not everything. Do not create a generic queue/database/retry platform.
9. **Generated content is untrusted.** PDF instructions are never authority; inspect extracted/generated content before activation. Treat upstream scans as advisory, not a security guarantee. No automatic tool execution from book text.

### Private artifact contract (proposed names, not existing files)

Under the maintainer-approved private root: `source-manifest.json`, `extraction-report.json`, page/section map, extracted text, chunk packets, practice cards, `conversion-ledger.jsonl`, rights/reuse decisions, private generated skill and evaluation receipts. Public delivery contains only reviewed, permitted material and non-sensitive references to evidence—not local file paths, book excerpts, private prompts, credentials, or provider receipts.

Each practice card records: source ID/hash/edition/section/pages; applicability; inputs; steps; outputs; decision rules; trade-offs; human validation boundary; related cards; uncertainties; source-derived versus project-authored statements. Each ledger receipt records chunk ID/input hash, status, attempt, profile/model/config, input/cached/output/reasoning usage when available, price basis/date/currency, observed cost or unknown, reviewer result, and dependency invalidation. Do not fabricate missing usage or prices.

## 7. Phased Execution and Human Gates

### Phase 0 — Resume authorization and provenance (T0)

Entry: explicit start request after quota restoration. Re-read this plan and current repo state; retain user changes. Load required workflows/skills, discover profiles, confirm eligibility, receive authorized PDF path and private destination. Pin converter revision and review selected code/license/dependencies. Do not use changing `master` as a reproducibility pin.

Output: source/reuse manifest and phase-specific authority record. **G0:** maintainer accepts source/model handling, private destination, local tooling/install scope, and pilot preparation scope. Missing PDF does not block plan review; it blocks extraction.

### Phase 1 — Local extraction and cost measurement (T1)

Inspect metadata and representative pages locally. Extract the complete source to the private root, preserve page mapping, and count tokens with the chosen tokenizer. If an exact provider tokenizer is unavailable, label the count as an estimate and record the method. Evaluate table/diagram loss and determine OCR/layout needs. Report compact aggregates only.

Output: extraction quality report; source-section manifest; initial generation/review forecasts. **G1:** maintainer approves pilot model/account, exact packet count, input/output/reasoning limits, concurrency, usage ceiling and dollar ceiling where billable/known. No generation before G1.

### Phase 2 — Bounded calibration pilot (T2)

Use three representative packets: task description, table/diagram-heavy material, and technique guidance. Include enough context to prevent artificial omissions. Default proposed concurrency: one. Freeze packet hashes, prompt, output schema and rubric first. Run the selected approved worker once per packet; independently compare outputs with original passages. Allow at most one targeted correction for each defective packet within the approved envelope; exhausted envelope requires renewed approval.

Assess fidelity, actionable guidance, source anchoring, human authority boundaries, cross-reference preservation, actual cost, and repair burden. No GPT comparison arm unless separately approved. Independent review is budgeted separately from generation.

Output: pilot report and measured forecast for full conversion. **G2:** maintainer accepts quality, remaining conversion budget, concurrency and stop conditions. Pilot failure changes method/packet design or returns a routing decision; it is not permission to silently switch models.

### Phase 3 — Full private conversion (T3)

Partition logical source sections into bounded assignments with exclusive ownership. Run a small approved batch first, then continue within caps. Produce practice cards and topic-indexed private reference files. Include supporting concepts, techniques, competencies and perspectives; do not limit processing to six chapter summaries. Review high-risk/ambiguous material against source and sample ordinary content. Preserve uncertainty and dependency links.

Reconcile every section against the source inventory; assemble a compact `SKILL.md` with on-demand references, glossary and decision aids only where useful. Do not reproduce long text/tables/figures or automatically activate the generated skill. Resolve scan findings and source-fidelity review before a controlled consumer smoke.

Output: complete private skill, coverage report, conversion usage ledger. **G3:** source-fidelity/coverage acceptance and permission to use the reviewed private material in mapping; no public distribution permission inferred.

### Phase 4 — Crosswalk and freeze registry changes (T4)

Map verified edition tasks to current canonical skills/workflows; inspect referenced resources before labeling gaps. Capture technique/concept/competency/perspective dispositions and distinguish absent behavior from absent terminology. Identify already-covered rules and source-only/evidence-only improvements. Reuse public-source and source/reuse precedents without importing unrelated approvals.

Output: task crosswalk, target-file ownership matrix, accepted-gap list, source/reuse review, frozen evaluation scenarios and changed-skill list. **G4:** maintainer accepts public/private rights boundary, exact target files and behavior contract, token budget, and integration scope. Any genuinely new shared skill/router contract requires `design-solution` before editing; otherwise document why existing patterns suffice and route to `implementation-readiness`.

### Phase 5 — Implement approved canonical changes (T5–T8)

Dispatch independent component owners in one batch only where write sets do not overlap. Workers follow approved requirements and do not delegate. Shared requirements reference and lifecycle integration have one integration owner; competing component proposals return evidence to that owner rather than editing it concurrently. Add behavioral eval scenarios alongside owned skill changes. Expand beyond the initial elicitation/change pilot across every approved full-SDLC gap.

Only canonical `skills/` and `.agents/workflows/` are authored. Use established generators/export paths after integrations settle; do not hand-edit native projections. Update package metadata/versioning and documentation per repository conventions after smoke evidence, not before knowing the final patch. No unrelated refactor or new CLI/server/MCP service.

### Phase 6 — Integrated verification, review and handoff (T9–T10)

Run deterministic validation once on the integrated bundle; use focused checks after actual corrections, not repeated unchanged failures. Run approved native-consumer smoke and frozen semantic comparisons under explicit limits and source isolation. Independently review the exact final revision for source fidelity, public/private leakage, ownership drift, regressions and AC completion. Human maintainer decides acceptance and any later PR/publication action.

**G5:** separately authorize live evaluation model/account/runtime, cases/arms, repetitions, reasoning, concurrency and enforceable caps before execution. **G6:** human accepts final evidence. Source completion is not semantic efficacy; neither is release/activation.

## 8. Full-SDLC Integration Map

These are candidate targets, not instructions to modify every file. T4 freezes exact paths based on confirmed gaps.

| BABOK area / concern | Existing owners / candidate workflows | Improvement questions |
| --- | --- | --- |
| Planning and Monitoring | BRD skill, `brainstorm-feature`, `plan-feature`, readiness | Is BA approach proportional to risk? Are engagement, governance, information handling and analysis performance addressed? |
| Elicitation and Collaboration | customer discovery, BRD, QE BA | Are preparation, elicitation, result confirmation, communication and disagreement handling explicit without conflating customer research and all elicitation? |
| Requirements Life Cycle Management | PRD shared modeling, traceability audit, readiness/change handoffs | Are trace, maintenance, prioritization, change assessment and approval coherent with existing IDs and authority? |
| Strategy Analysis | strategy, business requirements, discover/validate-product | Are current/future state, risks and change strategy linked to need/value, including non-software options? |
| Requirements Analysis and Design Definition | PRD, QE BA, SRS, design-solution | Are modeling, quality verification, need validation, requirements architecture, design options and potential value kept distinct? |
| Solution Evaluation | metrics, verify-work, UAT, review-product-value, monitor/retro | Are delivered output, observed performance, solution limitations, enterprise limitations and value recommendations distinguished? |
| Key concepts, techniques, competencies and perspectives | Existing on-demand references and owning skills | Are technique choice, terminology, professional judgment and context tailoring useful without loading the whole book or claiming universal mandatory use? |

Proposed full-SDLC scenarios must cover implementation handoff, verification, UAT, release readiness and post-release value—not just upstream document production. A workflow with no confirmed gap gets an evidence-backed no-change disposition.

## 9. Worker Slices and Dependencies

Sizes are relative planning estimates, not quotes or authorization. S=1, M=3, L=5 points; confidence is low before measurement, medium for existing-pattern integration. Integration breadth and exact files freeze at G4.

| Slice | Role / profile class | Owned scope and artifact | Depends on | REQ / AC | Size |
| --- | --- | --- | --- | --- | --- |
| T0 | Orchestrator + eligible provenance reviewer | Authorization, source manifest, upstream pin/reuse boundary | Start | 001 / 001 | M |
| T1 | Approved local-preparation owner | Private extraction/measurement artifacts only | G0 | 002 / 002 | M |
| T2 | Approved conversion worker + separate eligible analysis reviewer | Three bounded pilot packets, rubric/usage report | T1,G1 | 003 / 003 | M |
| T3 | Approved conversion owners, exclusive chunk owners + one assembler | Private cards, reference skill, reconciliation | T2,G2 | 004 / 004 | L |
| T4 | Eligible BA analysis profile, orchestrator decides scope | Crosswalk, rights dispositions, target matrix, frozen scenarios | T3,G3 | 005 / 005 | L |
| T5 | Approved canonical component owner | Approved discovery/BRD/strategy reference changes and owned evals | T4,G4 | 006 / 006 | M |
| T6 | Approved canonical integration owner | Approved PRD/QE BA/SRS contracts; shared modeling reference; lifecycle edits | T4,G4 | 006 / 006 | L |
| T7 | Approved canonical component owner | Approved metrics/solution-evaluation references and owned evals | T4,G4 | 006 / 006 | M |
| T8 | Integration owner | Merge compatible work, canonical exports, docs/metadata | T5,T6,T7 | 006,008 / 006,008 | M |
| T9 | Separate eligible verification owner | Deterministic checks, native smoke, approved semantic runs | T8,G5 | 007 / 007 | L |
| T10 | Independent reviewer + maintainer | Exact-revision review, delivery report, human acceptance | T9 | 008 / 008 | M |

Provisional total: 41 points; not a calendar forecast. T5/T6/T7 are the genuine parallel implementation batch. T3 chunks can run concurrently only after G2 approves concurrency and exclusive assignments. No worker may edit another slice's owned component; eval prompts/rubrics must be frozen before evaluating the candidate.

Every future brief includes project/domain, approved workspace and private source access boundary, exact owned files/chunks, steps/interfaces, REQ/AC IDs, commands/scenarios, limits, non-goals and escalation conditions. Worker returns changed files, completed/failed ACs, actual commands/output, usage, and risks. Worker success is not independent verification.

## 10. Token, Quota and Cost Controls

Local extraction/OCR/token counting uses no LLM API tokens; it still uses local compute and may require approved dependencies. Do not send full text through model-backed file reads to measure it.

For each priced lane:

`cost = (uncached_input * input_rate + cached_input * cached_rate + billable_output * output_rate + separately_billed_reasoning * reasoning_rate) / 1,000,000 + other_charges`

Use the provider's billing semantics so reasoning is not counted twice when included in output. Record actual dated rates, currency, tiers/long-context effects and subscription-versus-API basis. Missing rates produce token/quota forecasts, not invented USD. Earlier page-density ranges and illustrative prices are not approved budgets.

Forecast remaining work from measured packet size and observed generation/correction/review usage, including fixed instructions, context replay, source spot checks, synthesis, native smoke, and eval arms. Do not extrapolate a prose-only sample to tables or claim that 30% overhead bounds all agent work.

Before each batch, require remaining allowance to cover the worst permitted batch envelope. Record max input, output/reasoning, calls, concurrency, corrections and reserved review allowance. Use runtime/provider caps where available; notifications or a spreadsheet alone are not enforcement. If actual usage is unavailable, bound by maximum billable request envelope where the route supports it. If neither usage nor enforceable limits is available, stop that lane and request a different approved mechanism.

Stop on quota exhaustion, approved cap, unexpected context expansion, missing fidelity, unsafe source instructions, truncated output, or mismatched checkpoints. Save completed artifacts; do not keep retrying the exhausted profile. Per the user's wait instruction, request authorization before any fallback. Routine quality failures get one concrete corrective follow-up inside budget, not unlimited model escalation.

No automatic premium invocation. No paid model bake-off included. A future GPT review has its own approved scope and usage allocation and sees bounded source excerpts, not automatically the entire book.

## 11. Verification Plan

### Local measurement / extraction proof

- Compare PDF metadata with actual section inventory and page map.
- Inspect representative extracted prose, multi-column/table content and diagrams against the original rendering; report omissions and OCR confidence limitations.
- Confirm source identity/hash before counting or resuming; distinguish exact tokenizer results from estimates.
- Prove a completed chunk is reused only for matching inputs/options and an intentionally changed private test input invalidates its own affected output. Use throwaway checks, not source-text tests.

### Frozen semantic scenarios

| Case | Intended consumer-visible distinction |
| --- | --- |
| E1 Domain ambiguity | Ask/record the consequential meaning; do not invent it |
| E2 Conflicting stakeholders | Preserve evidence and identify decision authority, not majority voting by the agent |
| E3 Interview notes | Separate statement, inference, proposed requirement and confirmed result |
| E4 Missing stakeholder | Raise impact and owned decision without inventing an organization |
| E5 Baseline/change impact | Retain IDs and trace affected AC/contracts/approvals/tests only |
| E6 Requirement verification vs validation | Distinguish clear/testable wording from satisfying the business need |
| E7 Solution options | Consider process/non-build alternatives and explicit value/risk assumptions |
| E8 Delivery handoff | Give engineering/QE observable behavior, errors and NFR verification without hidden policy |
| E9 Low-risk maintenance | Preserve direct approved-ticket route without mandatory BABOK paperwork |
| E10 Sensitive/partial readiness | Keep sensitive approval floor; block affected slices, not unrelated ready work |
| E11 UAT/release boundary | Distinguish business acceptance, technical verification and release authority |
| E12 Post-release limitation | Distinguish solution versus organizational constraint; no ROI claim from delivery completion |

Freeze expected behavior and critical-failure criteria before runs. Compare current baseline and candidate using identical supplied facts, model/configuration, tools and independent contexts; prevent candidate/reference leakage into baseline. The book need not be present for ordinary registry-behavior scenarios. Use blinded scoring where practicable, preserve transcripts, and report counts and uncertainty; a small pilot does not establish broad statistical superiority.

Each accepted gap has at least one corresponding behavioral scenario. If the full gap set exceeds E1–E12, extend the frozen suite with distinct cases rather than silently leaving accepted changes unverified. Deterministic keyword/assertion checks do not replace source fidelity or semantic judging.

### Repository and consumer checks (future execution only)

Confirmed entrypoints from `package.json` and `docs/EVALS.md`; prepend `rtk` to shell invocations. Scope additional commands to actual changed artifacts and inspect generator behavior before using it.

- `rtk pnpm validate:all`
- `rtk pnpm audit:sdlc`
- `rtk pnpm check-alignment`
- `rtk pnpm audit:keywords` when triggers change.
- `rtk pnpm evals:preflight -- --skills-file <approved-private-changed-skill-list>`; no model quota.
- `rtk pnpm test:trace`, `rtk pnpm test:outcome`, or `rtk pnpm test:product-evidence` only when affected contracts warrant them.
- Use existing `generate-indices` and native workflow export paths for actual canonical changes; do not assume one command regenerates every surface.
- Inspect selective manifest case/arm counts before any execution. `--execute`, baseline worker execution, scoring/promotion and release commands are not authorized by this plan.
- Exercise at least one real installed/native consumer through the existing supported sync/export route in an isolated destination. Observe intended reference loading and actual scenario output, not only file existence. Demonstrate ordinary low-risk work does not load the whole BABOK reference.

At G4, freeze exact commands and installed-client scenario using available runtime and CLI contracts. If no supported client/runtime can exercise the changed surface, record AC-007 as incomplete; a unit test or generated-file snapshot does not waive it. Do not alter the existing eval framework or route it through unapproved providers just to satisfy the plan.

## 12. RACI and Escalation

| Decision / activity | Responsible | Accountable | Consulted / verification |
| --- | --- | --- | --- |
| Source rights, budget, distribution, final acceptance | Maintainer | Maintainer | Human/legal authority when needed; agents cannot certify rights |
| Scope, slice contracts, integration decisions | Orchestrator | Maintainer | BA/PM, canonical owners |
| Private conversion | Assigned cheap worker | Orchestrator | Separate source-fidelity reviewer |
| Registry content and shared contracts | Assigned component owner | Orchestrator | BA, architect when contracts change, QE |
| Native smoke / eval and independent review | Separate eligible reviewer/QE | Maintainer | Engineering/integration owner |
| Frontend/backend/mobile/release changes | No implementation assigned | Maintainer | Consumers consulted only where relevant; no application deployment scope |

Material new skill architecture or unresolved source-distribution risk returns to maintainer/design review. Do not invent eligible account status, bypass profile restrictions, or treat a premium model as legal/governance authority. Independent review disagreements require evidence and an owner decision, not silent acceptance.

## 13. Risks, Blockers and Resume Inputs

| Item | State / consequence | Owner / required input |
| --- | --- | --- |
| Source and private preparation | Local T0/T1 preparation, T3 assembly, and T4 crosswalk have documented bounded evidence; this does not claim exhaustive source fidelity, redistribution rights, or BABOK equivalence | Parent/maintainer: retain source-isolation and rights boundaries |
| Public canonical integration | T5/T6/T7 changes are implemented; independent bounded static reviews and the reported integrated local gates are complete | Parent: retain scoped evidence and handle any newly observed defect |
| Generated consumer projections | Official generation completed; independent review verified all 29 selected leaves and four expected selected Product Management index refreshes. The original verification wrapper failed; its later read-only parity/preservation checks closed F2 without retroactively changing that receipt | Parent: retain the failed-wrapper history and independent verification boundary |
| Native runtime and semantic behavior | Bounded local consumer capture and 12 paired synthetic semantic cases completed; baseline 11 PASS/1 PARTIAL, candidate 12 PASS, one bounded completeness improvement, 11 ties, and no observed critical regression. This does not establish broad efficacy or comprehensive host behavior | Parent: preserve scenario and runtime limits |
| Public reuse rights | Unresolved for redistribution of book-derived material; public changes are repository-authored and do not establish legal clearance | Maintainer/human rights authority |
| Usage and billing | 35 raw runtime-usage fields were observed, but counter scope, agent coverage, and pricing remain unverified; no session total, billing, or savings claim | Report as unknown, not zero |
| Final acceptance / publication | Human acceptance and PR preparation remain pending; no merge, release, activation, or private-reference publication | Maintainer |

No question must be answered to review this plan. These inputs gate the named future phases only. Do not ask the maintainer to supply facts available in PDF metadata, repository tooling or profile discovery.

## 14. Delivery, Rollback and Acceptance

Deliverables: private reviewed reference skill and its coverage/usage receipts; full crosswalk and supporting-material dispositions; reviewed canonical skill/workflow improvements for every accepted gap; selective behavioral evidence; token/context deltas; non-sensitive provenance/reuse documentation; maintainer handoff.

Before delivery, update relevant package metadata/changelog/docs under existing conventions; change `ARCHITECTURE.md`/`CONTRIBUTING.md` only if their described contract changes, otherwise explicitly record unchanged rationale. Keep raw private content and machine-specific helpers out of the public patch. No commit/tag/release is implied.

Rollback is scoped to this feature's exact changes and generated outputs using repository conventions; preserve unrelated user edits. A private generated skill is not activated before review, so failed conversion does not alter active behavior. Consumer activation, if later approved, needs its own restoration path and evidence.

Completion requires every approved REQ/AC, all source/task dispositions, budget reconciliation, integrated behavior proof, independent review and human acceptance. Record `repository_status`, `private_reference_status`, `semantic_evidence_status` and `activation_status` separately. Do not relabel partial delivery as complete or lower acceptance targets after seeing results.

## 15. Current Handoff and Approval

- Plan status: T5–T7 canonical changes, T8a packaging, independent selected-projection verification, and the bounded T9 evidence checkpoint are complete. PR preparation and human acceptance remain pending.
- Implementation status: T0/T1 preparation, T3 assembly, T4 crosswalk, T5/T6/T7 source work, integrated checks, bounded consumer capture, and independent semantic grading have documented outcomes. This does not establish exhaustive source fidelity, general runtime efficacy, full BABOK compliance, or distribution rights.
- Private reference status: private preparation/assembly evidence remains outside this public plan; it is not included in public distribution and its rights status is not legal clearance.
- Generation/runtime: the official corrective generator exited 0; the original wrapper exited 1 on its ESM/CommonJS import check and reported aggregate projection changes. A separate independent read-only review verified all 29 selected leaves and reconstructed the six-root preservation delta as exactly four selected Product Management index files. That review closes the packaging finding; it does not convert the failed wrapper receipt to PASS. Bounded local consumer and semantic evidence is complete, with limits below.
- Repository publication and activation: PR preparation and maintainer acceptance remain pending; no merge, release, activation, or publication of private reference material is authorized.
- Current public delivery: repository-authored canonical guidance, selected generated projections, and conceptual/provenance evidence only; see the [integration evidence](../srs/babok-sdlc-skills/integration-evidence.md). No private book text, private paths, cards, prompts, rubrics, answers, or provider receipts.
- Next action: complete independent final review and parent-owned PR preparation; maintainer retains human acceptance, rights, merge/release, and activation decisions. No second generation is needed for the verified current outputs.
- Workflow routing: `implementation-readiness` for settled existing-pattern slices; `design-solution` only for material new architecture/contracts.
- Usage and payload: matched selected-source payload is 107,490 versus 104,672 local `o200k_base` tokens (+2,818); this is file payload accounting, not runtime consumption or savings. 35 raw runtime usage fields have unverified counter scope/coverage/pricing; no total cost or savings claim.

This amendment supersedes earlier routing and phase-state statements only to the extent explicitly stated; current limitations and unresolved gates remain active.

### Local preparation checkpoint — 2026-10-23

- T0 static provenance inspection pinned converter revision `a24e62f4d8caf2ee433f6e48d9073800f56f906e`; parent independently read the pinned MIT license. No upstream code was installed or executed. Installed Poppler was selected to preserve form-feed page provenance rather than upstream cleanup.
- T1 confirms 514 PDF pages and 152,604 whitespace-split words. Source SHA-256 `10a97b1e16a52ae56c6c51163c946bae1e584db97bd35495366d2795216db00b` was independently confirmed by the parent.
- Whole extraction contains 2,223,989 characters including 514 page separators; per-page character sum is 2,223,475. Whitespace-normalized whole-text diagnostic is 1,028,281 characters. Layout whitespace materially changes character-based estimates; none is a target-model billing-token count.
- Root manifest/lock declare `gpt-tokenizer`, but both local Node resolution attempts failed `MODULE_NOT_FOUND`; Python tokenizer libraries were also unavailable. No dependency installed. Exact tokenizer measurement remains incomplete.
- Initial independent review found truncated bookmark parent ranges and an unsuitable introductory task packet. Corrections passed focused independent verification: all 626 hierarchy records and counts, all 514 per-page rows, raw/form-feed/normalized reconciliation, actual task packet PDF pages 34–41, and both failed Node tokenizer resolutions. No open MAJOR/BLOCKER remains in bounded local preparation. Shared-page overlap and incomplete full-source fidelity remain explicit; AC-001/AC-002 are partial.
- Extracted source, page maps, scripts and bounded rendered samples remain in a private sibling directory beside the uploaded PDF, not the repository or automatic skill roots. The member-copy notice restricts distribution/resale; no agent has granted rights clearance.
- Available Personal Delivery launch settings exposed no token/spend-cap feature. A limited packet count is not a hard session/token/dollar cap. G1 needs either an enforceable route or an explicit maintainer amendment to permit best-effort bounded sessions.
- No pilot conversion, full private skill, canonical skill/workflow implementation, live evaluation, publication or activation has occurred. AC-001 and AC-002 remain partial; preparation is not whole-feature completion.

### Tokenizer authorization checkpoint — 2026-10-23

Maintainer selected isolated local installation of `gpt-tokenizer@4.1.0` with package lifecycle scripts disabled and a named supported encoding. The assigned local-measurement worker owns the private tokenizer environment and report; previously reviewed extraction artifacts remain unchanged. No provider disclosure of book text, conversion, global/repository dependency installation, comparison arm, or G1 hard-cap amendment was authorized by that selection. Counts are exact for the selected encoding, not asserted as target-model billable usage.

### Tokenizer measurement acceptance — 2026-10-23

Isolated `gpt-tokenizer@4.1.0` installation completed with lifecycle scripts disabled; no global/repository dependency changes. Named encoding `o200k_base` was independently verified by inspecting and importing its explicit export, with identical binding to the package default. Parent reproduced the unchanged extraction hash and raw count; independent reviewer recomputed all 514 page records and pilot packets. No confirmed measurement defect remains for this input. Installation receipt/version/integrity agreement was checked; no whole-package supply-chain attestation is claimed.

| Measured source scope | `o200k_base` tokens |
| --- | ---: |
| Whole unchanged extraction | 233,884 |
| Global whitespace-normalized diagnostic | 189,900 |
| Sum of separately counted pages | 233,370 |
| Task packet, PDF 34–41 | 3,712 |
| Table-heavy packet, PDF 468–470 | 1,120 |
| Technique packet, PDF 227–229 | 1,257 |

The three independently measured packets total 6,089 source tokens as separate inputs. Whole-file/pagewise counts are not additive because separators/token boundaries differ. Normalization is diagnostic only, not approved removal of layout. Previous tokenizer-unavailable notes describe the pre-install checkpoint and are superseded for this installed proxy encoding only.

Counts exclude agent instructions/history, output, reasoning, reviews, retries and billing-specific request framing. Exact GPT-6 Luna billing/usage and effective prices remain unknown. AC-002 tokenizer gap is resolved for this encoding; overall source-fidelity/printed-page mapping and rights limitations remain. No private reference skill, pilot generation, full conversion, canonical implementation, live evaluation, publication or activation is accepted by this checkpoint.

### Staged implementation and PR authority — 2026-10-23

Maintainer explicitly selected “Staged execution through PR” after being informed that Personal Delivery cannot enforce a hard token/dollar cap. Authorized: private book-excerpt processing on Personal Delivery; three-packet pilot; full private conversion and original registry improvements after independent evidence gates pass; scoped verification and opening a reviewed PR against `develop`. Best-effort controls replace the previously required hard budget mechanism for this execution: at most two conversion workers, one corrective follow-up per failed slice, stop on quota exhaustion, no premium model or automatic provider fallback.

This amendment delegates normal G1–G5 stage advancement to the orchestrator using documented independent review evidence; it does not waive source fidelity, completeness, scope, security or rights/distribution review. Material new architecture, unresolved safety/rights decisions or changed exposure/spend assumptions return to the maintainer. G6 remains human final acceptance. No merging, release, activation or publication of the detailed private book-derived reference is authorized. The PR contains independently authored registry practices and non-sensitive conceptual/provenance references only, never the PDF, extraction, private cards or copied proprietary matrices.

Execution branch: `feat/babok-sdlc-skills`; initial branch and fetched `origin/develop` had zero divergent commits. T2 pilot is assigned three source packets (6,089 measured `o200k_base` source tokens); canonical ownership analysis runs independently without private source access. Neither source-token counts nor concurrency limits guarantee billable session usage.

### Initial T8a static integration and generation checkpoint — 2026-10-23

At this initial checkpoint, T5/T6/T7 implementation reports and bounded independent reviews recorded the current source changes and corrective closure. Those reviews were static only and did not establish native-consumer behavior, manual semantic grading, measured efficacy, or distribution-rights clearance. The required index and token-metric generators completed after temporarily holding and byte-verifying the active preparation evidence; the evidence was restored unchanged. Existing configured generated projections were produced without generator or CLI changes. At that point, native-consumer execution and independent semantic grading remained in the parent-owned T9 lane. The generated token metric is repository-calculated metadata, not provider usage or billing evidence. The later corrective and T8b checkpoints below supersede only those then-current pending-status statements; they do not rewrite this history.

### T8b bounded integration, consumer, and semantic evidence checkpoint — 2026-10-23

#### Packaging and projection verification

The subsequent official `generate-indices` command exited 0. Its original verification wrapper exited 1: an ESM named-import adapter failed to load the repository's CommonJS-exported `WorkflowTransformer`, and the wrapper raised an aggregate non-target projection-root alert. The failed receipt remains a failure; no wrapper PASS is claimed. A separate independent read-only review loaded the existing transformer through CommonJS and verified all 20 selected skill/reference leaves byte-equal to canonical source and all 9 workflow leaves byte-equal to the supported command/skill/prompt transformation. All 29 are regular mode 644 files with matching ownership/hash entries.

The independent reviewer reconstructed the guard's six-root aggregate before-state by substituting only the four Product Management `_INDEX.md` Git HEAD blobs in memory. All six reconstructed hashes matched the recorded before hashes; the six current hashes matched the recorded after hashes. The complete non-target path/mode/payload delta within those roots is exactly the four selected Product Management index files; all other 1,901 non-target files were unchanged within that measured scope, with 1,905 files and no symlinks across the six roots. Each index remains mode 644 with matching ownership and adds only the two qualified elicitation terms to the selected BRD entry. The aggregate does not cover empty-directory changes or paths outside those roots. This independent evidence closes F2 but does not retroactively pass the failed wrapper.

#### Integrated checks and bounded consumer/semantic evidence

- `validate:all`: 333 passed, 0 failed, 55 warnings. `audit:sdlc`: PASS. `check-alignment`: passed the ≥70% threshold; 3 warnings. `audit:keywords`: 134 warnings; the newly qualified BRD terms did not collide. The five-skill preflight reported 0 issues; the original benchmark report was restored.
- Fresh baseline/candidate local CLI captures matched 64 and 65 selected files respectively. Twelve exact prompt identities were captured per arm; numeric CLI exit codes were not exposed. These captures do not establish every host's read-first behavior, alias resolution, aggregate context assembly, bytes actually consumed, or host-level isolation/containment.
- Independent grading covered 12 paired synthetic scenarios (24 graded outputs): baseline 11 PASS/1 PARTIAL/0 FAIL; candidate 12 PASS/0 PARTIAL/0 FAIL. One bounded completeness improvement was observed; the other 11 cases tied. No critical semantic regression was observed. This small bounded comparison does not establish statistical or causal superiority, broad efficacy, or certified BABOK compliance.

#### Matched selected-source payload

The source-contract selection was applied to the already measured exhaustive per-file receipts; no tokenizer rerun or source snapshot change was made. Counts use `gpt-tokenizer@4.1.0` with the explicit `o200k_base` binding and sum independently encoded complete files.

| Matched source group | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Seven top-level selected skill entries | 7 files / 7,829 tokens | 7 / 8,141 | +312 |
| Ten selected workflow files | 10 / 11,213 | 10 / 11,421 | +208 |
| Lazy reference Markdown | 32 / 54,312 | 33 / 56,582 | +2,270 |
| Other selected-source files (metadata, 7 eval JSONs, 4 public examples, LICENSE) | 13 / 31,318 | 13 / 31,346 | +28 |
| **Selected-source total** | **62 / 104,672** | **63 / 107,490** | **+1 file / +2,818 tokens** |

The exhaustive baseline root also contains 28 workflow files absent from the candidate; its full-root negative delta is not an apples-to-apples package reduction and is not reported as one. The registry metric `ceil(JS UTF-16 length / 4)` is a separate heuristic over top-level `SKILL.md` files only; it excludes workflow bodies and lazy references and is not this tokenizer count, runtime consumption, provider usage, billing, or savings.

#### Boundaries and remaining acceptance

Thirty-five raw runtime-usage fields were observed, but their counter semantics, coverage of all agents, and pricing are unverified. No session total, invoice total, cost, uncached-token total, or savings is claimed. Local CLI file-set/identity and bounded scenario results do not prove all reference bytes were consumed, complete context accounting, general alias/read-first semantics, or host-enforced containment. Public practice and provenance context remains in the [practice crosswalk](../srs/babok-sdlc-skills/practice-crosswalk.md) and [source/reuse register](../srs/babok-sdlc-skills/source-reuse-register.md). Redistribution rights remain unresolved; the private source-derived reference remains inactive and outside public delivery. PR preparation, separate final review, and maintainer human acceptance remain pending; no merge, release, activation, or legal clearance is implied.
