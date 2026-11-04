# Brief: Evidence-led marketing for Agent Skills Standard

Status (historical local checkpoint, 2026-10-26): T01–T07 and T09–T10 were reported locally delivered; T08 GA4 consent-first application checks were reported at the fake-SDK/raw-command boundary, with live collection blocked by owner decision; the one-off browser probe was not a committed test. T11 stopped after 2/246 attempts; 244 were unlaunched and pair comparability remained unverified. AC-016 describes a historical candidate SHA check, not current PR checks. T12/G3/G4 remained open at that checkpoint. PR #263 description summarizes historical outcomes and embeds historical screenshots; detailed/raw receipts were removed and are not retained. These are not current CI results.
Slug: evidence-led-marketing; operator_profile: hybrid; lane: both
SNC: S=2 N=2 C=1 total=5 tier=high; model_tier: strong
Scope now spans the marketing registry, measurement contracts, landing instrumentation and campaign preparation. Privacy/data-flow design and human review precede implementation; deployment and paid execution remain unauthorized.
Sponsor, validation owner and handoff owner: Hoang Nguyen (proposed).
Historical repository status (2026-10-26): local checks and candidate-consumer verification were reported for the then-current candidate; these results do not describe current PR checks or CI. GA4 live collection remained blocked by owner decision. T11 consumed 2 of 246 attempts; 244 remained unlaunched, pair comparability was unverified, and no retries or replacements were made. PR #263 description summarizes historical outcomes and embeds historical screenshots; detailed/raw receipts were removed and are not retained. Pilot, real-data collection, spending, deployment, and release remained unauthorized.

## You said / I assumed

You said: improve genuine user interest and repository reputation; learn from two community marketing skill collections; create our own skills and use them first for this landing page; inspect localhost; consider video production cost; deploy to a new domain later.

Assumed for approval: initial audience is developers and small-team technical leads already using coding agents; English-first; organic distribution; no new paid services; no automated public posting; reputation means useful adoption and credible recommendations, not purchased stars. Existing audience, traffic, repeat usage, available weekly maintainer time and final domain are unknown.

## Why: outcome and scope

Earn informed trials and repeat usage by explaining one concrete problem, demonstrating a real supported workflow, and visibly responding to user feedback. A prettier page or larger skill catalog alone is not evidence of demand.

- **Objective ID**: BRD-OBJ-001
- **Objective Statement**: By day 30 after an explicitly approved pilot starts, obtain 10 distinct external developers who complete setup and one useful supported task; at least 5 report a second useful session on a separate day within 14 days of activation. Proposed learning targets, not forecasts. Owner: Hoang Nguyen.
- **Objective ID**: BRD-OBJ-002
- **Objective Statement**: During that pilot, record at least 5 substantive feedback reports and publish responses or resolutions with permission. Owner: Hoang Nguyen. Do not require positive feedback.
- **Objective ID**: BRD-OBJ-003
- **Objective Statement**: Every public factual capability, comparison and performance claim has a dated source and scope qualification; no fabricated proof, purchased engagement or unapproved spending. Owner: Hoang Nguyen.

| Objective ID | Objective | Proposed SMART metric | Baseline | Accountable role |
| --- | --- | --- | --- | --- |
| BRD-OBJ-001 | Earn informed trials and repeat usage | By day 30 after an explicitly approved pilot starts, obtain 10 distinct external developers who complete setup and one useful supported task; at least 5 report a second useful session on a separate day within 14 days of activation | Unknown; assess at pilot intake | Hoang Nguyen |
| BRD-OBJ-002 | Capture substantive developer feedback | During that pilot, record at least 5 substantive feedback reports and publish responses or resolutions with permission; do not require positive feedback | Unknown; assess at pilot intake | Hoang Nguyen |
| BRD-OBJ-003 | Establish evidence, trust, and spend safeguards | Every public factual capability, comparison and performance claim has a dated source and scope qualification; no fabricated proof, purchased engagement or unapproved spending | Unknown; assess at pilot intake | Hoang Nguyen |
- Baselines: unknown, not zero. Record available GitHub traffic/referrals, stars, community activity and consented pilot participation before launch; retain comparable windows.
- In scope: audience research, positioning, proof inventory, landing recommendations, reusable skill contracts, an initial demo/content campaign, measurement and cost gates.
- Out of scope: deployment/domain purchase, paid advertising, email scraping/cold-outreach automation, bought engagement, blanket SEO page generation, or claims of guaranteed growth. Per owner decision in ga4-collection-contract.md (owner selected GA4 and approved consent-first GA4 implementation; superseding historical Plausible contract) and explicit owner decision ("Keep live collection blocked"), consent-first GA4 collection is approved for implementation with session-only cookies (cookie_expires: 0), direct Google tag, in-memory basic opt-in/withdrawal, fixed URL/title, and advertising disabled, but live collection is deliberately blocked by owner boundary (default off; no account registration, purchase, production deployment, or event transmission authorized; T08 remains open until authorized G-* Measurement ID, fixed HTTPS test URL, and bounded test approval are provided; new GA4 runtime evidence pending; prior Plausible default gates and 10-case/37-assertion browser intercepted acceptance are preserved as historical records; enabled AC-029, AC-030, AC-032 remain open; disabled AC-031 must be re-verified for GA4); production collection and private cohort processing remain unauthorized.

Stakeholders: maintainer approves claims/publication/budget; pilot developers validate utility and supply optional feedback; contributors review accuracy and improve standards. No agent can approve on their behalf.

## Current experience: observed versus inferred

Confirmed at http://localhost:3000/: desktop and 390px mobile renders inspected; hero reads “Your coding agent. Your engineering standards.” Main Get started action navigated to visible #quick-start. The page has agent compatibility caveats, an explicitly illustrative routing animation, source links, two setup commands, customization guidance and evidence limitations.

Inference: the page communicates the mechanism more clearly than a specific first useful result. Its existing visual identity is coherent; prioritize message, proof and first-use path before a redesign. Mobile header consumes substantial first-screen space. Neither observation establishes conversion loss: no traffic study or user test was conducted.

Confirmed: the page links evaluation revision 73422bdeff746281177d55ccb7d2169471eb475a, whose report says catalog/outcome/activation readiness NOT READY. That is the linked report's status, not a fresh evaluation of today's code. Do not remove qualifications or imply universal readiness. Illustrative routing is not execution proof.

## Reference assessment

Read actual skills, not just repository slogans. Findings describe instructions, not measured effectiveness. Upstream main branches are mutable; pin reviewed commits before copying content.

| Reference | Adopt conceptually | Do not import by default |
| --- | --- | --- |
| [Corey marketing skills](https://github.com/coreyhaines31/marketingskills) | Shared versioned product context; sourced customer language; evidence-aware copy; member-first community participation; precommitted experiment interpretation | SaaS revenue assumptions, unverified uplift statistics, broad tool installs, arbitrary style prohibitions |
| [James marketing skills](https://github.com/realjaymes/marketingagentskills) | Metric definition/source/owner/decision register; source-dated competitive intelligence; effort-aware prioritization | Fixed content quotas, invented social proof, commercial outbound infrastructure, assumptions that every referenced skill is installed |

Recommendation: Corey is the better conceptual foundation for this OSS adoption objective; James supplies complementary measurement patterns. No campaign benchmark proves either produces better business outcomes. Both top-level licenses are MIT; retain notices for substantial copied portions and check third-party assets separately. Write task-specific original skills rather than bulk vendoring either collection.

## Direction: reusable capabilities and contracts

The twelve skills and optional workflow were reported integrated for local consumers at the historical checkpoint. Installed-consumer scenarios and remote candidate SHA sync were reported passed for candidate `703f750b`; these are historical candidate results, not current PR checks. PR #263 description retains historical evidence. Keep campaign content separate from reusable instructions; reuse existing product-evidence, research, metrics and investment capabilities.

| Proposed skill | Inputs and outputs | Distinct quality boundary |
| --- | --- | --- |
| marketing-audience-research | Sourced customer language and alternatives -> audience problems, motivations and adoption barriers | No invented interviews or representative-sample claims |
| marketing-positioning | Product facts, real user language, alternatives -> audience, problem, promise, objections, non-audience, voice and assumptions | No fabricated interviews; compare against DIY rules and doing nothing, not only other products |
| marketing-proof | Source revision, capabilities, evals and demos -> claim/evidence/limitations register | Reject unsupported superiority, guaranteed compliance and benchmark-to-runtime savings extrapolation |
| marketing-strategy | Objectives, evidence and constraints -> channel choices, priorities, resource bounds and non-goals | A strategy is a hypothesis, not an authorization to spend or publish |
| marketing-content-strategy | Audience intent and strategy -> content themes, editorial sequence and distribution plan | No keyword-volume fabrication or bulk low-value publishing |
| marketing-copywriting | Approved positioning and claim register -> page, post, announcement and script copy | Every factual claim retains evidence and qualifications |
| marketing-landing | Approved positioning and proof + actual page -> prioritized copy/CTA/proof recommendations | Label conversion hypotheses; preserve qualifications; one primary useful action |
| marketing-search-discovery | Public content and deployed-site evidence -> technical/search-intent discovery recommendations | Unknown domain/indexing state remains unknown; no guaranteed rankings or AI citations |
| marketing-community | Approved campaign + channel rules -> useful tutorial, tailored posts and response plan | Human publication approval; no spam, fake identities, vote rings or manufactured advocacy |
| marketing-launch | Approved assets, channels and capacity -> launch readiness, sequencing and response plan | Readiness does not grant publication authority |
| marketing-demo-video | Verified capture, audience, storyboard, rights and budget -> captions, transcript, shot plan and reviewed export | Real output, scrubbed data, readable UI, rights clearance and cost cap; no paid calls without approval |
| marketing-measurement | Goal, baseline, exposure and consented feedback -> metric register, pilot report, continue/change/stop decision | Separate clicks from activation, downloads from users, stars from retention, association from causation |

Workflow: define measurement -> research audience -> position and verify proof -> select bounded strategy -> prepare content/landing/demo -> human publication gate -> measure -> revise. Outputs carry source dates, assumptions and approval state. Compact skills reference detailed examples on demand; marketing analysis never implies publishing authorization.

Implementation acceptance criteria:
1. Each skill has explicit triggers/non-triggers, prerequisites, output contract, missing-evidence behavior and relevant budget/publication boundaries.
2. The first dogfood run produces a coherent campaign for this repo, not generic marketing advice; all assets reference the same approved audience and proof.
3. Evaluation compares baseline versus with-skill outputs on realistic cases, including sparse evidence, NOT READY reports, low traffic, fake testimonials, misleading competitor claims and exhausted video budget. Report observed results; no effectiveness claim from Markdown structure alone.
4. Demo claims are independently reproducible on a named revision, task and agent configuration; failures and limitations retained. No result cherry-picking disguised as representative evidence.
5. Registry integration, mirrors and docs follow existing repository gates in the later implementation plan. This brief does not authorize generators or implementation.

Candidate PRD trace: REQ-001 positioning/proof -> BRD-OBJ-003; REQ-002 landing/demo/community -> BRD-OBJ-001, BRD-OBJ-002; REQ-003 measurement -> BRD-OBJ-001, BRD-OBJ-002; REQ-004 authoring/evaluation/cost controls -> BRD-OBJ-001, BRD-OBJ-002, BRD-OBJ-003.

## First campaign: “Keep your agent. Stop rebuilding your standards.”

This is a proposed message hypothesis, not validated customer language. Core story: move recurring engineering guidance out of repeated prompts into inspectable, versioned project standards; show what loads and what still depends on the agent.

- Preparation: interview or observe five willing target developers; ask how they currently share rules, what drifts, and what would make switching worth it. Test comprehension with page/demo, not leading praise questions.
- Proof asset: choose one supported task after checking evidence; record real setup, matching guidance and inspectable result. Include exact version and limits. Do not promise a five-minute install until measured.
- Landing hypothesis: lead with the recurring problem and concrete outcome; place a captioned 30–45-second real demo near the first action; primary CTA “Try it in a demo repo” only when that runnable artifact exists. Keep source, compatibility and evaluation caveats.
- Pilot week 1: recruit up to 20 willing developers from existing relationships or communities that permit it; seek 10 verified activations, investigate all failed attempts.
- Pilot week 2: one useful tutorial and two native channel-specific derivatives, rather than identical cross-posts. Initial channels: GitHub README/Discussions plus one relevant developer community; maintainer chooses based on existing access and rules.
- Pilot weeks 3–4: follow up with consent for repeat-use evidence; close the feedback loop; publish a candid “what worked / what did not” report. Treat earned references as secondary reputation evidence.
- Wider launch: only once the product can be tried and maintainer can answer questions. [Show HN rules](https://news.ycombinator.com/showhn.html) reject landing-page-only submissions and vote solicitation. No need to wait for a new domain to learn privately from a runnable repository.

At day 30: meeting targets supports another bounded campaign, not proof of causal lift. If setup fails, improve onboarding; if people complete setup but do not reuse it, revisit value/use case; if qualified exposure is insufficient, report inconclusive rather than declare the product rejected. Low traffic favors interviews and cohort observation over an underpowered A/B test.

## Video references and budget

| Reference | Fit and boundary |
| --- | --- |
| [product-launch-motion](https://github.com/AbubakrChan/product-launch-motion) | Deterministic HTML/Playwright/FFmpeg motion; useful restrained captions/intro. Local dependencies and authoring effort still cost resources; some technique references point to author-local tooling. MIT instructions, but sample films/frames explicitly excluded by NOTICE. |
| [ai-product-video](https://github.com/dlazy-ai/ai-product-video) | Screenshot-based Remotion workflow and richer components; optional dLazy generated assets/voice. Apache-2.0 with NOTICE obligations; unresolved bundled SFX provenance must be excluded. Remotion license is separate. |
| [ad-video-skills](https://github.com/iart-ai/ad-video-skills) | Remotion-based ads/launch/testimonial guidance and templates, useful later for proven message variants. Not evidence of conversion improvement; real permissioned quotes only. MIT repo, separate dependency/media terms. |
| [Awesome-Video-Promotion-Platform](https://github.com/ishandutta2007/Awesome-Video-Promotion-Platform) | Discovery directory, not a generator or runnable marketing skill. Do not inherit its provider pricing or blanket compliance claims; reject engagement exchange. |

Recommended first video: local real terminal/editor recording, captions and transcript; no synthetic B-roll, bought music or paid TTS. Zero incremental media-provider spend is possible with existing hardware/tools, not zero labor, compute or agent cost. Start one aspect ratio, one script, one draft; review stills before expensive rerenders.

Provider checks: [Remotion pricing](https://www.remotion.dev/docs/license/pricing) and [license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) require checking entity eligibility and installed version. [dLazy annual pricing](https://dlazy.com/en-US/pricing?interval=year) lists Basic $228/year and Pro $540/year; Pro advertises API access. These are not per-video prices or verified entitlement for cheaper tiers. Per-operation credit rates, retry charges and workflow total remain unknown. Do not buy based on these headline prices. Price observations are time-sensitive.

Future paid-generation gate: exact provider/model, commercial rights, source-data handling, unit price, maximum clips × seconds × attempts, ancillary audio/render/storage costs, hard total cap, and human approval before calls. No premium authoring model is required merely because an upstream README recommends it.

## Measurement and risks

| Measure | Definition/source | Decision |
| --- | --- | --- |
| Verified activation | Distinct consented external participant confirms setup plus one named useful task, with evidence they choose to share | Identify onboarding failures; do not count CTA clicks as installs |
| Repeat value | Activated participant reports another useful session on a separate day within 14 days; follow-up cohort, deduplicated | Continue campaign versus revisit product value |
| Substantive feedback | Reproducible issue, concrete use-case report or actionable confusion; GitHub or consented private notes | Prioritize fixes/content and close loop |
| Reach and interest | Aggregate available referrals, tutorial visits, GitHub visits, organic stars; baseline and window recorded | Diagnose distribution, never substitute for adoption |
| Trust/cost guardrails | Unsupported claims, unsolicited-post complaints, unapproved spend, privacy/rights violations | Pause affected asset/channel and correct |

No covert CLI telemetry or claim of precise cross-device attribution. Keep minimal consented data; agree retention before recruitment. A setup-command copy is intent, npm downloads include automation, and GitHub stars do not prove use.

Risks and owners: weak value hypothesis (maintainer: interview/pilot); unsupported claims (maintainer: source review); sparse traffic (maintainer: cohort analysis); tool/license cost (maintainer: local-first and explicit caps); maintainer overload (maintainer: two channels maximum); privacy/asset rights (maintainer: sanitized capture and consent).

## Evidence ledger and limits

- confirmed: localhost rendered page, desktop/mobile screenshots, primary CTA navigation; no conversion study or complete accessibility audit.
- confirmed: [linked eval report](https://github.com/HoangNguyen0403/agent-skills-standard/blob/73422bdeff746281177d55ccb7d2169471eb475a/evals-report.md) says NOT READY; no fresh eval run performed.
- confirmed: [Corey context](https://github.com/coreyhaines31/marketingskills/blob/main/skills/product-marketing/SKILL.md), [research](https://github.com/coreyhaines31/marketingskills/blob/main/skills/customer-research/SKILL.md), [copy](https://github.com/coreyhaines31/marketingskills/blob/main/skills/copywriting/SKILL.md), [experiments](https://github.com/coreyhaines31/marketingskills/blob/main/skills/ab-testing/SKILL.md), [James metrics](https://github.com/realjaymes/marketingagentskills/blob/main/skills/product-marketing-metrics/SKILL.md), [intelligence](https://github.com/realjaymes/marketingagentskills/blob/main/skills/competitive-intelligence/SKILL.md) contain assessed patterns; not execution benchmarks.
- confirmed: four video reference workflows/directory and dependency/license notices inspected; no production pipeline run or video generated.
- confirmed: T09 campaign media is accepted locally after independent review and parent `ffprobe`/actual-frame inspection (H.264/AAC/subtitles, 56.000000s, 884,035 bytes, digest `b129cb71…c32f`); the first encoded original was rejected for fabricated captured output and was not integrated.
- confirmed: T10 landing/player behavior and historical local tests were reported accepted at the time; the one-off Plausible and GA4 browser probes were not committed tests. PR #263 description summarizes historical outcomes and embeds historical screenshots; detailed/raw receipts were removed and are not retained. Local mock-boundary checks do not establish provider receipt or live collection.
- confirmed: historical installed-consumer scenarios and remote candidate SHA checks were reported passed for candidate `703f750b`; this is not evidence of current PR checks. Formal release tags, human UAT, and live skill efficacy remained open.
- assumed: audience/channel fit, campaign message, target attainability and owner capacity remain hypotheses; measurement-first planning direction accepted.
- unknown: baseline audience, current production conversion, costs per generated clip, conversion lift and available maintainer capacity.

## Approval and handoff

User accepted the measurement-first recommendation and requested an implementation plan for review. The plan preserves the expanded twelve-skill scope, distinguishes skill quality from campaign value, and separates cash from capacity and financial ROI from adoption efficiency. Numerical pilot targets remain proposed learning thresholds, not forecasts or budget authority.

Next workflow: review PR #263 and its historical evidence links; use current PR checks for current status. Any further T11 evaluation requires separate authorization and a supported host operator entry point. Publication, deployment, pilot activation and evaluator continuation remain separately gated.

Outcome: the plan and local implementation were reported accepted at the historical checkpoint; no production deployment or version-tag release was claimed. Candidate commit `703f750b` is a historical candidate identity, separate from current PR checks. The owner selected GA4 and consent-first implementation, while deciding to keep live collection blocked. Local mock-boundary checks do not prove real Google SDK execution, provider wire receipt, or live collection. T11 stopped at 2/246 attempts, with 244 unlaunched and comparability unverified; no retries or replacements were made. T12 remained open; no pilot, public posting, production collection, spend, or deployment was authorized.
