# Task List / Implementation Plan: Evidence-led marketing

Status: Plan approved; local T01–T07 and T09–T10 delivered and accepted; T08 deferred by user decision; T11 stopped at 2/246 by explicit user host-boundary decision; T12/T13 open | Owner: Hoang Nguyen | Date: 2026-10-25
PRD: [requirements and atomic acceptance criteria](../prd/prd-evidence-led-marketing.md)
BRD: [business objective and reference research](../brd/brd-evidence-led-marketing.md)
SNC: S=2 N=2 C=1 total=5 tier=high | operator_profile: hybrid
User approved the plan and requested implementation, then explicitly selected Subagent-Driven. Measurement-first scope and twelve-skill coverage are approved for implementation subject to this plan's scoped contract gates. T01 architecture/privacy design review is complete for the approved offline synthetic scope; independent whole-change review (T12/G3/G4) is still open. Production collection, external exposure, spending and deployment are not authorized.

## 1. Review summary

Build a measurable marketing capability, not twelve disconnected prompt files. Deliver in this order:
1. Freeze measurement, campaign, cost, privacy and skill-evaluation contracts.
2. Prove a local scorecard on clearly synthetic records, including missing and immature data.
3. Author all twelve skills, composing existing product-management capabilities.
4. Integrate opt-in routing/workflow/resources and prove installed-consumer behavior.
5. Use the skills to prepare a real demo, landing improvements and a campaign package.
6. Verify actual provider collection only after provider/privacy approval; keep public deployment separately gated.
7. After separate human campaign approval, observe outcomes and issue advisory weekly/day-30/day-44 value reviews.

Delivery and business value remain separate: passing tests or shipping assets does not establish retention, causal lift or ROI. All twelve skills remain in scope; staged delivery is not a six-skill substitute.

## 2. Confirmed repository baseline

| Evidence | Planning consequence |
| --- | --- |
| website/src/app/page.tsx and website/src/landing/LandingPage.tsx compose a static-export Next app; website/next.config.ts | Preserve static hosting, server-rendered structure and small client islands; do not introduce an analytics server casually |
| website/src/landing/CopyCommand.client.tsx has success/failure/stale-operation logic; website/tests/e2e/landing.spec.ts tests clipboard and no-JS behavior | Emit copy success only from the existing confirmed success path; retain manual recovery |
| website/src/landing/RoutingFigure.client.tsx is an illustrative replay, not video/execution | No demo_play event until an actual media player exists |
| website/scripts/generate-headers.mjs uses connect-src self; website/docs/deployment.md:107-135 requires real provider/privacy approval | Provider/data-flow/CSP design is a real dependency; disabled or mock telemetry cannot close activation |
| No analytics SDK/collector/consent state found in searched website scope | Instrumentation is new work, not configuration of an existing backend; externally hosted settings remain unknown |
| skills/product-management/product-evidence, product-metrics, product-investment and product-experimentation already exist | Reuse their record types, authority boundaries, calculations and experiment contracts |
| No existing docs/product ledger found | Create a proposal-state initiative ledger during implementation; do not invent recorded approvals or observed results |
| .skillsrc currently includes only PM foundation packages | Required advanced packages must be explicitly selected at reviewed refs; source availability does not prove consumer availability |
| cli/src/services/IndexGeneratorServiceImpl.ts has explicit keyword category rows | New category needs conditional routing and exclusion tests, not only generated indexes |
| scripts/generate-indices.ts invokes SyncService.writeSkills; cleanupOldFolders currently removes legacy .agent | Generate in isolated staging with evidence preservation, not the active evidence tree |
| package.json separates root test and mcp:test; website tests are separate | Integrated verification must name all affected lanes rather than assume one root command covers everything |

Existing benchmark/eval limitations from the BRD remain applicable. Reference repos supply design ideas, not proven marketing results. Before substantial copying, pin reviewed revisions and preserve applicable MIT/Apache notices; do not copy third-party video samples or unverified SFX.

## 3. Design gate: contracts before code

T01 produces a bounded SRS/contract at srs-evidence-led-marketing.md. It resolves only consequential interfaces, not a second PRD:
- Map campaign IDs, assets, metric records, provenance and scorecard views into existing product-evidence contracts. Evidence ledger is canonical for decisions/claims/metrics; source datasets remain immutable inputs, reports are derived views.
- Define a minimal campaign registration and cost-input format with deduplication, eligibility, UTC maturity boundary, unknown values, correction history and source/query revisions. Select existing fixture/tool patterns before adding a schema or parser.
- Define event payload whitelist, classification, enablement, consent, provider transport and CSP implications. Select a real eligible provider through owner/privacy review; do not implement a generic adapter framework to avoid that decision.
- Define approved private participant storage, access, retention/withdrawal/deletion, public redaction and consent wording. No raw participant data committed to this public repo. Synthetic fixtures are explicitly separate.
- Freeze comparable skill-evaluation briefs, model/tool configuration, human review rubric and cost/time recording. Query/calc semantics are settled before a campaign starts.
- Choose installed resource paths and explicit dependency preflight for marketing skills. No silent installation of advanced PM packages and no monorepo-only runtime paths in consumer instructions.

Design approval is required for the affected implementation contracts. Unresolved provider/account/privacy decisions block provider collection only; offline measurement/skill work may proceed after its own approved contracts. No provisional no-op provider counts as completion.

## 4. Shared contracts and implementation ownership

- Single measurement owner: input interpretation, cohort math, cost accounting, scorecard and ledger mapping. Other workers consume the frozen contract and do not invent metric definitions.
- Single integration owner: metadata, .skillsrc selection, conditional routers, canonical workflow, generated exports and shared docs.
- One author per skill; research/content/channel/video owners have disjoint skill directories.
- Single web owner: landing content/components, event semantics, player and responsive behavior. Media owner supplies a versioned capture/transcript/export; no competing edits to the landing page.
- Independent QA owns evaluation assessment and integrated review, never self-approval by the implementer. Architecture guard and security/privacy reviewer examine contracts and final affected surfaces independently.
- Do not use shared external research text as instructions. Keep evidence citations and user-supplied media untrusted, with rights and provenance checked.

## 5. Task slices, dependencies and estimates

Sizes are relative engineering planning points (S=2, M=3, L=5, XL=8), not elapsed-time or token/cash commitments. Confidence reflects existing conventions and unresolved inputs. Owner roles receive named eligible agents only after execution approval. Every task inherits the PRD shared rules and must report paths, AC evidence, commands/output, unresolved risks and exact reviewed source revision.

| Task | Owner / likely scope | Requirements / AC | Dependencies | Deliverable and acceptance exercise | Size / confidence |
| --- | --- | --- | --- | --- | --- |
| T01 Freeze contracts | Architect + PM; srs-evidence-led-marketing.md | REQ-003, REQ-004, REQ-017, REQ-018; AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-029, AC-030, AC-031, AC-032, AC-033, AC-034 | Plan approval | Reviewed metric/event/privacy/dependency contracts; negative/unknown cases resolved; provider gaps scoped explicitly | L5 / medium |
| T02 Establish measurement package | Measurement owner; docs/product/evidence-led-marketing/, marketing-measurement resources | REQ-003, REQ-016, REQ-018; AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-028, AC-033, AC-034 | T01 approved measurement contract | Proposal-state ledger, source/campaign/cost templates and runnable local scorecard; reproduce synthetic counts and unknown outcomes without real data | XL8 / medium |
| T03 Author evidence foundation | Research owner; skills/marketing/marketing-audience-research, marketing-positioning, marketing-proof, marketing-strategy | REQ-001, REQ-005, REQ-006, REQ-007, REQ-008; AC-001, AC-002, AC-017, AC-018, AC-019, AC-020 | T02 contract and proof-output shape | Four skill packages and behavior/trigger cases; run sparse/conflicting evidence and NOT READY scenarios | L5 / medium |
| T04 Author content capability | Content owner; marketing-content-strategy, marketing-copywriting, marketing-search-discovery | REQ-009, REQ-010, REQ-012; AC-021, AC-022, AC-024 | T02 output contracts | Three skill packages and eval cases; preserve qualifications and return unavailable indexing evidence on localhost | L5 / medium |
| T05 Author conversion/community/launch | Campaign owner; marketing-landing, marketing-community, marketing-launch | REQ-011, REQ-013, REQ-014; AC-023, AC-025, AC-026 | T02 output contracts | Three skills and eval cases; inspect a real page, reject prohibited channel promotion and retain launch approval gate | L5 / medium |
| T06 Author demo-video capability | Media owner; marketing-demo-video resources | REQ-015; AC-015, AC-027 | T02 proof/cost contracts | Skill and local capture/edit recipe; rights, transcript/caption and spend-pressure cases; no mandatory paid video API | M3 / medium |
| T07 Integrate category and workflow | Integration owner; paths in section 7 | REQ-004 plus all skill leaves; AC-014, AC-015, AC-016 | T03..06 and T02 skill package | Optional marketing category and marketing-campaign workflow available through actual selected consumer exports; omitted category stays omitted | XL8 / medium |
| T08 Implement approved website collection | Web owner; existing landing clients/links, approved transport and header configuration | REQ-017, REQ-018; AC-029, AC-030, AC-031, AC-032, AC-033, AC-034 | T01 provider/privacy selection; T02 event/campaign contract | Intentionally deferred per user decision (Keep collection disabled); no analytics script, network requests, SDK, account or purchase; enabled collection AC-029, AC-030, AC-032 unproven and not done; disabled behavior AC-031 verified on the accepted local landing surface (`artifacts/evidence-led-marketing/evidence/task-10-parent-acceptance.md`). Not delivered. | L5 / low |
| T09 Build first campaign assets | Campaign owner with media handoff; docs/product/evidence-led-marketing/campaigns/standards-demo-01/ | REQ-001, REQ-002 and leaves REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015; AC-001, AC-002, AC-003, AC-004, AC-017, AC-018, AC-019, AC-020, AC-021, AC-022, AC-023, AC-024, AC-025, AC-026, AC-027 | T03..07 | Real runnable demo recipe at named revision, recorded evidence, one tutorial, two channel-tailored drafts, captioned video/transcript and source-linked claim review. Accepted locally after independent review and parent `ffprobe`/frame inspection; not publication. | L5 / medium |
| T10 Apply validated landing changes | Web owner; website/src/landing/content.ts and affected sections/player | REQ-002, REQ-011, REQ-015, REQ-017; AC-003, AC-023, AC-027, AC-029, AC-030, AC-031, AC-032 | T09; T08 event interface if available | Desktop/mobile page shows truthful demo and usable action; preserve caveats, no-JS fallback, keyboard navigation and actual copy semantics. Accepted locally; parent actual Chromium at 1280×800/390×844 exercised playback, captions, clipboard, keyboard and trusted native fullscreen. | L5 / medium |
| T11 Evaluate skills independently | QA/eval owner; per-skill evals and canonical run artifacts | REQ-004; AC-013, AC-014, AC-015, AC-016 | Frozen T02..07 packages | All twelve evaluated for outcomes and triggering; preserve baseline, failures, cost unknowns, independent human-quality review; failures return to owning task. Stopped by explicit user host-boundary decision at exactly 2/246 attempts; pair comparability unverified, 244 unlaunched, no efficacy delta claimed. | XL8 / medium |
| T12 Verify integrated release candidate | Integration + independent QA; shared docs/changelog and final receipts | All requirements; AC-001 through AC-034 | T07..11; affected provider slice must settle before claiming analytics complete | Installed-consumer smoke, real static website/browser smoke, measurement fixture walkthrough, integration checks and independent architecture/security review. Partial: consumer, security and selected covering checks accepted; whole T12 blocked on full T11 and retained original failures. | L5 / medium |
| T13 Prepare pilot handoff | PM/measurement owner; campaign runbook and source-linked review templates | REQ-003, REQ-016, REQ-018; AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-028, AC-033, AC-034 | T12 | Human-reviewable weekly/day-30/day-44 scorecard procedures, budgets and sources; no actual recruitment or publishing. Not complete; the pilot-readiness matrix prepares handoff only. | S2 / high |

Rollup: 69 planning points, not a delivery-date promise. Live observation is a separate 30-day acquisition window plus up to 14 days for late-cohort maturity; it is not included as coding effort. Provider approval, baseline access, eval funding and reviewer capacity can change elapsed time. No numerical model-cost estimate without token/pricing evidence.

Parallel delivery after prerequisites: T03/T04/T05/T06 own disjoint skill packages and can run together; T08 is intentionally deferred per user decision (Keep collection disabled; no provider/account purchase/SDK). T11 started on frozen packages alongside T09 and stopped at 2/246 by user host-boundary decision. T10 verified disabled collection on the accepted local surface after accepted assets. T12 integrates only settled outputs. Do not serialize independent slices or delegate the overall plan.

## 6. Measurement-first demonstrator and review decisions

Before content production, T02 must run a synthetic example end-to-end:
- Distinct activated, repeated, confirmed non-returning, unknown and immature participants.
- Duplicate reports and timestamps on either side of the 14-day boundary.
- Missing baseline, missing costs, zero denominators and zero incremental cash with nonzero labor.
- Independent campaign/source records; unknown/direct source retained; no anonymous-to-participant identity stitching.
- Scorecard links each number to input revision and calculation revision; unsupported monetary benefit produces unknown ROI.

Expected review interface: campaign -> relevant interest -> verified activations -> mature repeat counts/rate with unknowns -> incremental cash -> maintainer hours -> reputation evidence -> limitations -> recommendation. A Markdown report plus machine-readable input/output is sufficient initially; no dashboard service is required. Records/queries must be reusable for real authorized observations, not hard-coded fixture answers.

Predeclared recommendations: scale (advisory only), iterate, stop, inconclusive. Report funnel failures specifically. Keep exposure insufficiency separate from product rejection; do not shift stopping rules to obtain a favorable result. Promotion to paid activity or larger distribution requires a new owner decision.

Live pilot not executed by this implementation plan: maintainer confirms audience/channel, consenting recruitment, bounded participant count, cash/time cap and baseline or exact scoped exception. Default production telemetry and external media spend remain disabled. The first campaign uses the repo plus one permitted community. Initial targets remain proposed; approval must freeze them before exposure.

## 7. Exact integration surfaces and reuse

Canonical additions:
- skills/marketing/<each of the twelve names in the PRD>/SKILL.md, references/, evals/evals.json; executable/schema companions only where required by T01 contracts.
- .agents/workflows/marketing-campaign.md: thin optional measurement-first orchestration, under existing workflow budget; not part of DEFAULT_WORKFLOWS.
- skills/metadata.json: category/version/ownership and workflow release metadata. Preserve unrelated current work; do not normalize adjacent versions blindly.
- .skillsrc: deliberately select reviewed marketing and required advanced PM refs/workflow when generating selected native mirrors. An unpublished category tag is not a usable ref.
- cli/src/services/IndexGeneratorServiceImpl.ts and its __tests__/IndexGeneratorService.spec.ts: marketing keyword-only conditional routing and absence/exclusion regression.
- mcp/test/SkillIndex.spec.ts: qualified marketing triggering and engineering/product negative cases.
- scripts/audit-sdlc.ts and appropriate existing workflow audit tests: explicit optional-workflow coverage.
- CONTRIBUTING.md, ARCHITECTURE.md, CHANGELOG.md: opt-in package/dependency guide, workflow boundary, measurement versus evidence claims and tested status.

Reuse PM research/customer-discovery/strategy/evidence/metrics/investment/experimentation. Do not copy their ledger schema or financial calculator into marketing. Compose marketing-specific outputs and demonstrate installed dependency availability. Runtime resources must ship inside supported skill resources; eval directories and monorepo scripts are not consumer runtime dependencies.

Generated surfaces: skills/index.json, category _INDEX.md/catalog, selected .github/.agents/.codex/.claude native mirrors and workflow exports according to current configuration. Source workflow .agents/workflows remains canonical. No hand editing generated copies. Other host output shapes must follow actual capability metadata; do not promise untested cross-host parity.

Generator safety: preserve hashes/counts of SDD artifacts outside the affected tree; use disposable staging excluding .agent, explicit generated-output allowlist, destination hash checks and file-level copyback. Do not copy staging ownership locks into active workspace. Inspect warnings; successful process exit alone does not establish generated parity. No generator runs during this planning session.

## 8. Verification lanes and commands

Commands below are discovered repository entrypoints, planned only. Workers use bounded focused verification after their mutation batch; integration owner runs covering checks once after integration and only reruns evidence affected by fixes. Do not use blanket runs as a substitute for actual behavior.

### Measurement and investment
- Run the new package-local scorecard against declared synthetic fixtures and independently calculate expected counts/boundaries. The exact new command is defined by T01/T02, not presented here as already installed.
- rtk pnpm test:product-evidence
- Existing validator form: rtk proxy node skills/product-management/product-evidence/scripts/validate-product-evidence.mjs docs/product/evidence-led-marketing/evidence.json --authority-root <absolute-approved-initiative-root> --as-of <actual-UTC-instant> --gate structural
- The placeholders above are invocation parameters to resolve before execution, never fabricated validation inputs. Structural success does not close experiment/commit/release authority gates.
- Financial scenarios, if monetary inputs are actually available: existing product-investment/scripts/evaluate-investment.mjs with its companion schema and approved source inputs. Do not call it to manufacture cash value from reputation.

### Registry, workflow and routing
- rtk pnpm validate:all
- rtk pnpm audit:sdlc
- rtk pnpm audit:keywords
- rtk pnpm check-alignment:strict
- rtk pnpm test
- rtk pnpm mcp:test
- rtk pnpm build
- rtk pnpm evals:audit
- In isolated staging only: rtk pnpm calculate-tokens and rtk pnpm generate-indices; inspect artifact parity and preserved evidence afterward.
- Disposable installed-consumer smoke: select marketing + exact required dependencies; exercise native routing, MCP lookup where available, optional workflow discovery and companion resource execution. Also exercise omitted/excluded category and missing-dependency cases. Use existing narrow registry fixture primitives, not real global config.

### Skill behavior
Freeze all twelve packages and representative held-out briefs. Run baseline/with-skill and positive/negative activation using the existing evals-run workflow, within separately approved model/account and resource cap; estimate before live provider calls. Preserve immutable inputs/transcripts and source identity. Applicable CONTRIBUTING release thresholds currently include per-skill case pass >85%, assertion pass >=85%, nonnegative outcome delta and trigger recall/specificity >=90%; recheck exact policy at execution, do not replace it with an aggregate average. A quality-gate failure remains a failure, not grounds to remove hard cases.

Required scenario families: sparse/contradictory sources; NOT READY evidence; fictitious testimonials; unsupported superiority; low traffic; incomplete retention windows; missing/zero cost; unapproved posting/spend; rights-restricted media; localhost indexing; missing optional dependencies. Verify useful artifact quality beyond mere required-word matching. Human acceptance, material revisions and authoring/review effort are measured separately from assertion scores.

### Website and actual surface
- rtk pnpm website:typecheck
- rtk pnpm website:lint (non-mutating root wrapper)
- rtk pnpm --filter @ags/website test
- rtk pnpm website:build
- rtk pnpm --filter @ags/website test:e2e (built static export first; serial Chromium desktop/mobile/tablet)
- rtk pnpm --filter @ags/website performance
- Launch actual static output and exercise native CTA, clipboard success/failure, keyboard/mobile/no-JS behavior, real video playback/captions and failed/disabled telemetry. Inspect actual network payloads, duplicate events, CSP errors and console.
- Authorized selected-provider test: verify real event receipt and actual consent/withdrawal/data handling. A local test sink is useful development evidence but not provider completion or production telemetry evidence.
- Existing website/docs/deployment.md gates remain unchanged: developer comprehension UAT (at least 4/5 after 30 seconds), real-origin social preview, privacy/analytics approval, domain/account/HTTPS approval and first-launch recovery plan. No preview/production activation is authorized here.

## 9. Release, risk and approval gates

| Gate | Evidence needed | Owner decision |
| --- | --- | --- |
| G0 Plan | This plan + PRD coverage reviewed | Approve/revise plan and select execution approach |
| G1 Contract | T01 data/event/privacy/dependency design, architecture/security review | Approve affected implementation contracts |
| G2 Measurement | T02 synthetic end-to-end report, unknown/edge behavior, traceable calculations | Accept measurement foundation before campaign production |
| G3 Skills | All 12 implemented, fresh evals, routing/consumer smoke | Accept release candidate; failures remain open |
| G4 Local campaign | Actual demo/video/page, rights/proof review, full covering verification | Accept prepared assets, not publication |
| G5 Activation | Real provider verification, consent/storage/retention, baseline or scoped exception, audience/channel/caps, deployment-specific gates | Separate permission for exact collection/publication/exposure/deployment |
| G6 Value review | Mature observed cohort, cost sources, limitations and guardrails | Choose continued investment, changes or stop; never automatic |

Risks: provider collection deferred (T08 deferred per user decision; collection kept disabled; enabled AC-029, AC-030, AC-032 unproven); consent/storage unknown (blocks live cohort, owner Hoang); no validated customer demand (pilot hypothesis, not implementation success); limited traffic (qualitative/cohort evidence, not fake A/B certainty); optional dependency gaps (preflight and installed-consumer tests); generator evidence loss (isolated regeneration); sample/media rights (own captures and cleared assets); paid eval variability (approved resource cap); stale public claims (source revision and re-review); maintainer support load (track hours and bound channels).

Publishing tags, package releases, PR/merge and deployments require the applicable separate authorization. In particular release-all-skills is a bulk tag/push command and must not be used as a routine marketing verification step. No production environment state changes, account creation or purchases during plan preparation.

Current gate status (2026-10-25, status only; gate definitions above are unchanged): G0 approved; G1 approved for the offline synthetic scope; G2 accepted on synthetic fixtures; G3 not passed because T11 stopped at 2/246 with pair comparability unverified; G4 not passed because the page/assets are accepted locally but covering initiative verification is open; G5 and G6 not attempted. Known original failures (two database-hana audit errors, four strict-alignment skills including a lexical false negative in `marketing-search-discovery`) remain retained and were not gamed or rerun; the formal numeric evidence bridge remains open.

## 10. Alternatives and why this plan

- Build focused original marketing packages while reusing PM evidence/contracts: recommended; gives repo-specific truthfulness and measurable adoption without duplicating governance.
- Buy/use upstream collections unchanged: lowers initial authoring but does not establish our required metrics, privacy, consumer dependencies or truthful demo workflow; retain as references, not assumed ready solution.
- Partner with a human developer advocate: valuable for later independent feedback; no commitment or outreach authorized.
- Defer the entire package and run a manual campaign: valid cheapest learning alternative if capacity is insufficient; would require explicit scope revision, not silent replacement of the requested twelve skills.
- Do nothing: avoids implementation cost, leaves current adoption uncertainty unchanged.

## 11. Review request and outcome

Review the twelve-skill coverage, measurement definitions and gates first. Next step is owner review of the local walkthrough and an explicit decision on any further bounded evaluation; `verify-work` covers the remaining T12 evidence when authorized. Execution used Subagent-Driven bounded owners with independent review; inline was not used for this cross-module scope. Profile/account routing follows current configured eligibility; no premium escalation was authorized by complexity alone.

Planning deliverables: reconciled BRD, PRD, dependency/ownership plan, grounded verification commands and explicit approval boundaries. At plan time no implementation tests, skill evals, provider calls, video production or real pilot had been run; repository lookups were evidence of integration seams, not runtime proof. Executed local outcomes are recorded in section 5, the line below and `srs-walkthrough-evidence-led-marketing.md`.

Outcome: plan approved and executed under Subagent-Driven mode for local T01–T07 and T09–T10, with T08 explicitly deferred; the offline synthetic contract is accepted, twelve skills and the optional workflow are integrated locally, and five installed-consumer scenarios passed (`consumer-final-record.json`, snapshot `ee18d7f5…`, 1,412 files). T09 campaign assets and the final T10 landing/player (`a39ab7ff…cd68b`) are accepted locally with parent actual browser checks; nothing is deployed or published. T11 stopped by explicit user host-boundary decision: exactly 2/246 attempts were consumed and bundled under the recorded audit contract, source profile/prelude/source title matched with empty recall, system-prompt digests differ (`eeac7618…` vs `94bfb0be…`) and historical prompts were not recovered, so pair comparability is unverified and 244 attempts were not launched. No retry, replacement evaluator, host hook, debugger, restart or configuration change was made during recovery. Per user decision collection is disabled (T08 deferred; AC-029, AC-030, AC-032 unproven and not done; AC-031 verified on the accepted local surface). T12 and T13 are not complete. Live pilot, developer recruitment, public posting, production telemetry collection, spending, deployment and releases remain unauthorized. Delivered ROI and causal lift are not claimed. Missing evidence: live outcomes, verified paired efficacy, human quality acceptance, formal numeric bridge and remote AC-016. Financial ROI remains unknown until a legitimate monetary return mechanism and attribution evidence exist. Exact host cost is unavailable (`task-10-cost-audit.md`); no zero-cost assertion is made.
