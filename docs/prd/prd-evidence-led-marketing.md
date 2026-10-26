# PRD: Evidence-led marketing

Status: Approved for gated implementation | Owner: Hoang Nguyen | Date: 2026-10-26
Slug: evidence-led-marketing | operator_profile: hybrid | lane: both
SNC: S=2 N=2 C=1 total=5 tier=high. Cross-module scope; human plan approval and architecture/privacy review before code.
User approved the plan and requested implementation, then selected Subagent-Driven. Scope and delivery sequence are approved; offline synthetic contracts delivered; T08 Plausible implementation and local default-off/intercepted browser proof included in PR #263 with live collection deliberately kept blocked by owner decision (default gates passed, browser intercepted 10 cases / 37 assertions passed in collection-browser-acceptance.md, T08 open pending test site ID/URL/caps); T11 recover-first pending supported host operator entry point (no exposed accessor); AC-016 remote candidate SHA sync & MCP lookup passed (release tags open separately); T13 pilot handoff preparation artifact approved; all six remaining tasks target completion in PR #263; production collection, external exposure, spending, and deployment retain their separate approval gates.
Sources: [reconciled BRD](../brd/brd-evidence-led-marketing.md), [task list](../srs/srs-task-list-evidence-led-marketing.md).

## 1. Problem, outcomes and boundaries

The maintainer needs to know whether marketing skills improve campaign work and whether campaigns generate useful adoption, reputation and affordable outcomes. More skills, assets, views or stars do not establish either result.

Business trace: BRD-OBJ-001 activation/repeat use; BRD-OBJ-002 substantive feedback; BRD-OBJ-003 evidence/trust/spend safeguards.

Proposed pilot learning targets: 10 distinct external activations, 5 confirmed repeat users and 5 substantive feedback reports by day 30 after an authorized pilot start. To assess all activations from a 30-day acquisition window fairly, final repeat-use closeout is day 44. Day-30 reporting includes only mature cohorts in repeat-rate denominators. Targets are not forecasts; no existing baseline is assumed zero.

In scope: twelve reusable skills and one thin workflow; canonical measurement contracts and source-linked scorecard; campaign/cost records; consented pilot reporting procedure; local website instrumentation; one real demonstration and campaign package; integrated registry/evaluation evidence. Production analytics is a separately gated activation, not silently enabled by code delivery.

Excluded: domain purchase/deployment, paid ads, scraped outbound, paid engagement, covert CLI telemetry, autonomous publishing, fabricated revenue, bulk SEO pages and guaranteed rankings. Paid-channel/email/partner/referral specialisms are excluded from this release, not hidden future deliverables. No native mobile application; responsive web is in scope.

## 2. Actors, stories and ownership

- Maintainer: as the campaign owner, I want source-linked outcomes and costs so I can continue, change or stop work rationally.
- Marketing operator/agent: as an author, I want shared approved positioning/proof so assets do not contradict one another.
- Developer visitor: as a potential adopter, I want a truthful runnable example so I can judge usefulness without signing up.
- Consenting pilot participant: as a tester, I want a clear data purpose and withdrawal path so my feedback does not expose private work.
- Independent reviewer: as a reviewer, I want reproducible outputs and raw evaluation evidence so skill quality is not self-certified.

Stories are negotiable within constraints, valuable, estimable through bounded slices and testable via ACs below; large umbrella requirements are not claimed to be single INVEST-sized implementation stories.

## 3. Requirement registry and capability inventory

Every row is in_scope, status Draft. Product accountability: Hoang Nguyen. Engineering and QA owners are role assignments pending approved execution. Priorities determine order, not omission.

| ID | Parent / BRD objective | Capability and owner | Priority | Acceptance |
| --- | --- | --- | --- | --- |
| REQ-001 | BRD-OBJ-003 | Establish sourced positioning/proof; research owner | P0 | AC-001, AC-002 |
| REQ-002 | BRD-OBJ-001, BRD-OBJ-002 | Produce truthful landing/demo/community campaign; campaign owner | P1 | AC-003, AC-004 |
| REQ-003 | BRD-OBJ-001, BRD-OBJ-002 | Measure outcomes, cost and decisions; measurement owner | P0 | AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012 |
| REQ-004 | BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | Evaluate, integrate and govern skills; integration/QA owner | P0 | AC-013, AC-014, AC-015, AC-016 |
| REQ-005 | BRD-OBJ-001, BRD-OBJ-003 | Research audiences: marketing-audience-research; research owner | P0 | AC-017 |
| REQ-006 | BRD-OBJ-001, BRD-OBJ-003 | Position product: marketing-positioning; research owner | P0 | AC-018 |
| REQ-007 | BRD-OBJ-001, BRD-OBJ-003 | Verify claims: marketing-proof; evidence owner | P0 | AC-019 |
| REQ-008 | BRD-OBJ-001, BRD-OBJ-002 | Select strategy: marketing-strategy; campaign owner | P0 | AC-020 |
| REQ-009 | BRD-OBJ-001, BRD-OBJ-002 | Plan content: marketing-content-strategy; content owner | P1 | AC-021 |
| REQ-010 | BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | Write copy: marketing-copywriting; content owner | P1 | AC-022 |
| REQ-011 | BRD-OBJ-001, BRD-OBJ-002 | Diagnose landing: marketing-landing; web owner | P1 | AC-023 |
| REQ-012 | BRD-OBJ-001, BRD-OBJ-002 | Improve discovery: marketing-search-discovery; content owner | P1 | AC-024 |
| REQ-013 | BRD-OBJ-002, BRD-OBJ-003 | Participate in communities: marketing-community; campaign owner | P1 | AC-025 |
| REQ-014 | BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | Coordinate launch: marketing-launch; campaign owner | P1 | AC-026 |
| REQ-015 | BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | Demonstrate usage: marketing-demo-video; media owner | P1 | AC-027 |
| REQ-016 | BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003 | Interpret metrics: marketing-measurement; measurement owner | P0 | AC-028 |
| REQ-017 | BRD-OBJ-001, BRD-OBJ-003 | Collect bounded website signals; web owner | P1 | AC-029, AC-030, AC-031, AC-032 |
| REQ-018 | BRD-OBJ-001, BRD-OBJ-003 | Govern cohort consent and source handling; privacy/measurement owner | P0 | AC-033, AC-034 |

## 4. Acceptance criteria

Platform [BOTH] means the skill's output/contract is independent of desktop versus mobile web; it does not imply a native app. All scenarios are proposed, not exercised acceptance evidence.

| AC | Platform | Given | When | Then: one observable result |
| --- | --- | --- | --- | --- |
| AC-001 | BOTH | A dated product source and contradictory evidence | A claim is proposed | The claim record retains its source, scope and contradiction rather than presenting certainty |
| AC-002 | BOTH | Only proxy research, no interviews | Positioning is drafted | Audience beliefs are labeled assumptions, not customer findings |
| AC-003 | BOTH | Approved audience and proof references | Campaign assets are prepared | Every asset links the same context revision |
| AC-004 | BOTH | No public-posting authority | A launch-ready asset is produced | Its state remains prepared, not published |
| AC-005 | BOTH | A proposed metric | Its contract is recorded | Definition, denominator/cohort, UTC window, source/query revision, target, guardrail, owner and review trigger are explicit |
| AC-006 | BOTH | No accessible baseline | A scorecard is generated | Baseline is unknown with a reason, never zero |
| AC-007 | BOTH | An activation is less than 14 days old | Repeat-use rate is computed | That participant is excluded from the mature-cohort denominator |
| AC-008 | BOTH | Mature participants include nonresponders | Repeat-use results are computed | Confirmed return, confirmed no-return and unknown counts remain distinguishable |
| AC-009 | BOTH | Duplicate participant reports | An activation count is computed | Each eligible participant contributes at most once |
| AC-010 | BOTH | Positive cash costs and zero verified repeat users | Efficiency is reported | Cost per repeat user is unavailable with zero-denominator rationale |
| AC-011 | BOTH | Labor hours but no verified cash reduction | Investment value is reported | Hours remain capacity and are not booked as cash benefits |
| AC-012 | BOTH | Campaign-tagged visits but no controlled comparison | Impact is reported | Attribution is descriptive, not causal ROI |
| AC-013 | BOTH | Comparable briefs, model/tool configuration and frozen rubric | Skill evaluation runs | Baseline and with-skill raw outputs, failures and resource evidence are retained |
| AC-014 | BOTH | Distinct should-trigger and should-not-trigger prompts | Activation evaluation runs | False positives and false negatives are reported per skill |
| AC-015 | BOTH | A guardrail scenario requests fabricated proof or unapproved spend | Candidate skills respond | The prohibited action is declined or held for the missing authority |
| AC-016 | BOTH | Marketing category selected in a disposable consumer project | Normal sync and lookup execute | The consumer receives the declared marketing skills and workflow without requiring unrelated categories silently |
| AC-017 | BOTH | Sourced public statements or consented research notes | Audience research runs | It returns provenance-linked problems and sample limitations |
| AC-018 | BOTH | Several alternatives including DIY/do nothing | Positioning runs | It names a target segment and evidence-qualified differentiation |
| AC-019 | BOTH | A NOT READY report and request for universal performance claims | Proof review runs | It rejects the universal claim while retaining the source limitation |
| AC-020 | BOTH | Goal, evidence, channel options and resource bounds | Strategy runs | It selects a bounded channel mix and names rejected options with reasons |
| AC-021 | BOTH | Approved strategy and audience intents | Content planning runs | Each proposed asset maps to an intent, distribution path and intended action |
| AC-022 | BOTH | A qualified claim in the proof register | Copy is generated | The qualification is preserved in the relevant asset |
| AC-023 | BOTH | Actual desktop/mobile page and unknown conversion baseline | Landing analysis runs | Recommendations are hypotheses grounded in the observed surface, not invented conversion loss |
| AC-024 | BOTH | Localhost only and no deployed domain/indexing evidence | Search discovery runs | Deployment-dependent checks are explicitly unavailable rather than passed |
| AC-025 | BOTH | Channel rules prohibit promotional posting | Community planning runs | It does not recommend violating those rules |
| AC-026 | BOTH | Runnable product but unresolved response owner or publication approval | Launch planning runs | The affected launch remains not authorized with the missing prerequisite named |
| AC-027 | BOTH | Verified recording and cleared local assets | Demo production completes | A playable captioned export with transcript shows only evidenced behavior |
| AC-028 | BOTH | Incomplete window, missing costs or missing source data | Measurement skill reviews value | It returns a qualified/inconclusive recommendation rather than invented ROI |
| AC-029 | BOTH | Real demo player and enabled approved local test collection | Visitor explicitly starts playback (under configured collection with JS, an accessible Play demo button initiates trusted start with native controls available afterward; without JS and in default unconfigured builds, existing native player is retained) | A single demo_play event reflects successful actual playback, not page rendering or failed media |
| AC-030 | BOTH | Clipboard action fails | Visitor attempts command copy | No successful install_command_copy is counted |
| AC-031 | BOTH | Collection disabled or transport unavailable | Visitor uses the landing page | Navigation, copying and playback remain usable without telemetry |
| AC-032 | BOTH | URL contains unknown campaign values or identifying query data | An event is prepared | Payload contains only approved bounded fields and no raw URL/query or participant identity |
| AC-033 | BOTH | Consent absent or withdrawn | Cohort data is imported | Non-consented identifiable material is excluded from the reporting dataset |
| AC-034 | BOTH | A public export is prepared | Privacy review executes | It contains aggregates/redacted evidence, not participant contacts or private code |

## 5. Canonical measurement and accounting rules

Use existing product-evidence MET/SRC/CLM/HYP/EXP/INV/DEC/REV contracts. Proposed initiative root is docs/product/evidence-led-marketing/. No actual cohort or campaign data is fabricated during implementation. Readable registers/scorecards reference canonical records and immutable source revisions, not independently editable duplicate truth.

MET statuses: planned, instrumented, observed, unavailable. Local synthetic tests do not justify instrumented (production-verified) or observed real-world status. Immature observations are unavailable with rationale, not a new status enum. Action gates require actual scoped authority; a structurally valid ledger is not consent.

Metric specifications:
- Activation: distinct consented external pilot participant with completed setup plus one named useful task; population denominator is eligible consenting pilot starters, not anonymous page visitors. Exclude maintainer, evaluators, bots and synthetic runs.
- Repeat rate: confirmed repeat users divided by all eligible mature activated participants; a repeat occurs on a different UTC date and within 14 days after activation. Report missing follow-up separately; this confirmed-observed rate is not population retention. Zero mature participants -> unavailable. Preserve counts and time boundary.
- Reputation: source-linked independent recommendations, substantive contributions and permissioned case studies; deduplicate source/person where justified without cross-site identity matching. No purchased activity or financial valuation of stars.
- Website rates: use provider-supported event/session definitions explicitly; never divide pilot activations by unrelated anonymous visits and call that population conversion. Bot/internal filtering and its limitations are recorded.
- Efficiency: incremental cash / verified activation and cash / verified repeat user, plus separately hours / repeat user. Zero denominator -> unavailable; known zero incremental cash with positive denominator may be zero cash cost, but labor still reported.
- Financial ROI: (incremental attributable financial benefit minus incremental investment cost) / incremental investment cost. Unknown benefits or attribution -> unknown ROI; zero cost -> undefined ratio. Include skill authoring/evaluation/maintenance and campaign costs within a declared boundary; do not double-count contribution margin or shared costs. Financial calculation must use existing investment tooling where applicable; arbitrary dollar values for reputation are forbidden.
- Skill value: compare correctness, material revision counts, human acceptance, total authoring/review/correction time, model/tool usage and guardrail violations on paired briefs. Record missing host cost data as unknown; do not infer savings from context size.

## 6. Truth table: reporting and action boundaries

| Condition | Required report | Allowed next step |
| --- | --- | --- |
| Missing analytics or insufficient exposure | Inconclusive; missing sources named | Improve collection or extend only under new explicit observation decision |
| Complete data, uncontrolled comparison | Descriptive association | Recommend a bounded next experiment, not causal lift |
| Mature cohort, target reached, guardrails intact | Targets met for this cohort | Recommend further bounded investment; owner decides |
| Targets missed with sufficient evidence | Specific funnel/value shortfall | Recommend iterate or stop; do not move original goalposts |
| Positive outcomes but guardrail breach | Breach visible; positive result not sufficient | Escalate affected activity to owner; no autonomous production rollback |
| No monetary benefit mechanism | Nonmonetary value and efficiency only | Do not fabricate ROI |
| Public posting, paid endpoint or real data requested without authority | Prepared/proposal-only | Wait for scoped human authorization; continue independent offline work |

## 7. Website, privacy and operating requirements

Proposed events: demo_play (actual media only; user-initiated start once per lifecycle via approved entry: under configured collection with JS, an accessible Play demo button initiates trusted playback and displays native controls; without JS and in default unconfigured builds, native controls remain; failed play or pause/resume emits no event), setup_guide_open, install_command_copy (successful copy only), github_click. An illustrative animation replay is not demo playback. Define one classification per link/action to prevent overlapping listeners double-counting it.

Allowed conceptual properties: event name, registered campaign/asset identifier, bounded placement identifier and schema version. Transport-owned time/session fields require design review. Unknown campaign input maps to unknown; no full URLs, arbitrary query values, fingerprints, emails, GitHub usernames, clipboard contents, code or personal filesystem paths.

Default: no collection or external telemetry without explicitly configured authority. No analytics backend/dashboard platform will be built unnecessarily. Select an existing eligible provider or manual export path through the design gate. Credentials stay outside repository artifacts. Raw participant contacts/consent records belong in approved private storage, not the public evidence ledger. Define retention, access, withdrawal and deletion before recruitment; no deletion-period promise is invented here.

Analytics failure must never block primary actions. Responsive web verification covers desktop and mobile; video has captions/transcript, readable commands and no compulsory autoplay. Existing accessibility and integration guarantees remain intact. No new CLI telemetry or authentication/billing changes.

## 8. Evaluation, rollout and accountable decisions

Two independent tracks: skill quality (controlled comparable briefs, frozen assertions, independent reviewer) and campaign value (real source-backed observations after authorized exposure). Passing one cannot substitute for the other.

Rollout: review this plan -> scoped design/privacy decisions -> measurement fixture and scorecard proof -> skills and evaluation -> registry/consumer proof -> local campaign/landing/video proof -> separate publication/collection/pilot approval -> weekly review and day-30/day-44 closeout. A delivered repository can remain value-inconclusive.

| Responsibility | Accountable | Responsible | Consulted |
| --- | --- | --- | --- |
| Business goals, plan and UAT approval | Hoang Nguyen | PM/BA planning owner | Target developers, independent reviewer |
| Contracts, data flow, dependency boundaries | Engineering owner appointed at execution | Architect | Privacy/security reviewer |
| Measurement and local report | Engineering owner | Measurement implementer | PM, QA |
| Skills and workflow | Engineering owner | Bounded skill authors; one owner per skill | Existing product-skill maintainers |
| Landing/events | Engineering owner | Frontend implementer | Privacy reviewer, QA |
| Backend/provider integration | Engineering owner | Integration owner if provider selected | Privacy/security reviewer |
| Mobile | Not applicable to native apps | Frontend owner for responsive web | QA |
| Verification/release readiness | Hoang Nguyen | Independent QA/release owner | Architect, security reviewer |
| Publication, data collection, spending | Hoang Nguyen | Human-authorized operator | QA/privacy reviewer |

Open decisions owned by Hoang Nguyen: live collection boundary (owner explicitly decided 'Keep live collection blocked': implementation + local proof included default-off; live transmission blocked until authorized site ID, fixed test URL, and bounded test approval are provided); consent/retention/private cohort storage; pilot start/channels/capacity and spend caps. These block affected activation/provider slices, not review of this plan or offline skill/metric contracts. Architecture/privacy contract approval blocks related code, not further design.

Assumptions: English-first developer/small-team audience, organic channels, no new paid media services. Financial return mechanism remains undefined; report adoption efficiency instead. Existing public evidence may not support every desired demo claim; choose a reproducible supported task, never hide the limitation.

## 9. Approval, change history and handoff

2026-10-25: Expanded six-skill brainstorm to twelve explicit capabilities; made measurement first; separated skill quality, campaign outcomes and financial ROI; added scoped activation/privacy decisions. No implementation or evaluation has been performed by this document.

Review requested: scope, metric definitions, delivery order, acceptance criteria and explicit gates. Next: design-solution for event/consent/evidence interfaces, then implementation-readiness. No automatic transition to coding.

Outcome: approved for gated implementation; Subagent-Driven execution selected. Offline synthetic contracts delivered; local T01–T07, T09–T10 delivered; T08 Plausible implementation and local default-off proof included in PR #263 with live collection deliberately kept blocked by owner decision (default website gates passed: unit 38/38 on Node 26, typecheck, lint, static build, 72/72 E2E in 51.8s; code conditionally approved; configured collection browser acceptance passed 10 cases / 37 assertions on isolated static build in `artifacts/evidence-led-marketing/collection-browser-acceptance.{json,md}`; enabled AC-029/030/032 locally technically verified, real provider receipt unverified; T08 open pending authorized test site ID/URL/caps; no live transmission); T11 recover-first pending supported host operator entry point (no exposed accessor); AC-016 remote candidate SHA sync & MCP stdio lookup passed across 6 scenarios (remote-consumer-acceptance.json; release tags open separately); T13 pilot handoff preparation artifact approved by independent review; all six remaining tasks target completion in PR #263. Completed evidence is the BRD research, repository mapping, and local/candidate verification cited by the plan and walkthrough. Missing evidence: verified provider receipt, live skill evals under host entry point, baseline, live pilot outcomes and financial attribution. Exact token/cost telemetry is unavailable.
