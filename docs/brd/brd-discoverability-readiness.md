# Brief: Discoverability Readiness Before Promotion

slug: discoverability-readiness
operator_profile: technical
lane: direction
snc_tier: medium
model_tier: standard
approval: approved(@HoangNguyen0403, 2026-11-03)
repository_status: approved brief saved; no implementation changes
activation_status: not_required

## Contract

**Outcome:** Establish an evidence-backed, understandable entry journey from search or GitHub to the first useful application of Agent Skills Standard, before investing in promotion. Distinguish source readiness, deployed indexability, and demonstrated adoption rather than labeling all three “good SEO.”

**Sizing:** SNC: S=2 N=1 C=0 total=3 tier=medium. README, landing metadata/content, and repository discovery surfaces span modules; the work modifies existing peripheral surfaces, not runtime or registry behavior.

**Owner / sponsor / validation owner / handoff owner:** @HoangNguyen0403 (assumed default). Next accountable role: maintainer acting as Product Manager. No delivery date or external commitment is authorized.

### You said

- A landing page and GitHub README already exist; assess whether they are ready for SEO and marketing.
- Make the README clearer, provide a short demo, and share in relevant communities to attract stars, contributors, and real users.
- Preserve the supplied PR #285 interaction-polish context rather than rediscovering or redesigning that feature.

### I assumed

- First scope discoverability readiness; demo production and channel distribution are separate subsequent briefs, not discarded requirements.
- Target developers and maintainers using AI coding agents, initially those struggling to keep team standards portable across tools.
- Successful first use matters more than stars alone. No claim of search ranking, current traffic, or conversion is justified by the supplied PR checks.
- Preserve the static-export architecture, existing visual direction, reduced-motion/no-JavaScript behavior, illustrative walkthrough, and production approval gates.

### Slices and boundaries

1. **Discoverability readiness — this brief:** landing technical-SEO evidence, README hierarchy and claim credibility, repository discovery metadata, coherent setup and contribution paths.
2. **Short demo — follow-on intake:** a proposed 30–60-second recorded real setup/use example, with transcript and an explicit distinction from the existing illustrative animation. Duration and format are assumptions, not approved production requirements.
3. **Community distribution — follow-on intake:** choose audiences using observed relevance and current community rules, prepare useful educational posts, assign response ownership, and assess outcomes. No channel, cadence, public posting, or spend approved here.

### Capability inventory and trace seed

| Capability | Candidate requirement | Rationale | Out-of-scope pair |
| --- | --- | --- | --- |
| Identify the product and intended user | REQ-DISC-001 | Make the opening understandable without SDLC jargon knowledge | Rename the product or claim ownership of the Agent Skills specification |
| Verify discovery eligibility | REQ-DISC-002 | Separate build metadata from deployed crawl/index evidence | Provision hosting or enable indexing without owner approval |
| Evaluate evidence and claims | REQ-DISC-003 | Avoid contradictory counts and unsupported savings promises | Re-run the whole registry benchmark/eval program |
| Complete a coherent first-use journey | REQ-DISC-004 | Reduce setup ambiguity and provide an observable success checkpoint | Change CLI behavior or add a live execution backend |
| Find support and contribution paths | REQ-DISC-005 | Convert interest into actionable participation | Launch outreach or promise response SLAs |

### Constraints

- Reuse metadata, robots, sitemap, approved deployment runbook, existing README proof reports, and setup guidance; do not establish parallel conventions.
- Keep global npm + `ags` as the recommended setup presentation agreed in the interaction-polish brief, with npx as an explicit alternative. Check released command behavior during implementation verification; do not equate source examples with smoke proof.
- Preserve previews/local builds as non-indexable. Production indexing remains contingent on explicit origin and release approval.
- GitHub controls its page templates and head metadata. Improve repository About/topics/homepage and README content; do not promise custom GitHub canonical tags or search snippets.
- A missing live origin limits only deployed verification, not README/source work. Record the missing owner-supplied prerequisite rather than claiming a production pass.

### Non-goals

New animation, visual redesign, new framework/registry capability, automated content farms, keyword stuffing, link schemes, paid acquisition, analytics installation, account access, deployment, search-console ownership verification, sitemap submission, public posts, or guaranteed rankings/stars. No merge, publishing, spending, or runtime exposure authority follows from approval of this brief.

### Acceptance criteria

- **AC-DISC-001 → REQ-DISC-001:** README opening states what the project does, who benefits, one concrete use case, and the next action before release-debug detail. Landing and README describe the same product, distinct from the underlying Agent Skills format/specification. Validate the rendered GitHub Markdown and landing surface, not source text alone.
- **AC-DISC-002 → REQ-DISC-002:** Produce a revision/origin-bound readiness matrix covering HTTP status/redirects, title/description, canonical, robots meta and HTTP headers, robots.txt, sitemap, social image retrieval, and meaningful HTML without JavaScript. Include mobile performance/accessibility diagnostics with conditions, not a fabricated score. Local/source evidence and production observations are separate rows. No live-origin pass without actual retrieval; absent origin is explicitly unverified.
- **AC-DISC-003 → REQ-DISC-003:** All promoted counts have a named authoritative release/registry basis or are removed; 335/299/237+ copy contradictions are reconciled. Savings statements are qualified by date, method, comparator, and scope or removed; synthetic skill-size comparisons are not presented as measured user savings. Proof links resolve at the reviewed revision, including replacing or repairing the missing Public Proof destination.
- **AC-DISC-004 → REQ-DISC-004:** README and landing offer the agreed primary install/init/sync path, explicit prerequisites, a clearly secondary npx alternative, and a verifiable first-use checkpoint. Exercise the documented path in an isolated sample repository and distinguish installation, skill loading, and actual task outcome. Existing illustrative walkthrough is not relabeled as live evidence.
- **AC-DISC-005 → REQ-DISC-005:** Readers can directly reach contribution instructions and a working questions/feedback route. Audit repository About grammar, descriptive topics, homepage target, and mutual README/landing links. Recommend metadata changes separately from account mutations; point homepage to the landing only after its canonical public origin is verified and approved.
- **AC-DISC-006 → all requirements:** Record baseline availability, missing evidence, owners, and follow-on demo/distribution handoffs. Do not claim SEO effectiveness from source metadata, PR interaction tests, npm downloads, or GitHub stars alone.

## Why / Value Context

This Direction-lane contract addresses the user's chosen readiness direction, not an approved acquisition strategy. The value hypothesis is that clearer, credible entry surfaces reduce avoidable abandonment before setup. It remains **assumed**, not demonstrated ROI.

**AS-IS:** Useful product explanation and setup exist, but the README combines newcomer content with release/PATH details, contains inconsistent counts, and makes savings claims broader than the inspected benchmark supports. SEO metadata exists in landing source; the public production origin and its indexability are not established by this intake.

**TO-BE:** A consistent, credible first-use journey with a documented distinction between source eligibility, live eligibility, and observed outcomes.

**Proposed validation target, not an approved SMART business metric:** Within 14 days after separately authorized publication, the maintainer reviews first-use feedback from five consenting target developers; at least four can explain the product and complete the documented first-use checkpoint without maintainer intervention. Recruitment, participation, and execution require separate authorization; no participants or baseline success rate are claimed.

Search impressions/clicks, qualified visits, successful first use, returning use, substantive issues/PRs, and stars should be tracked separately if suitable access and consent exist. Baselines, collection method, and growth targets are unknown. Do not infer active users from downloads or causal uplift from before/after stars.

## Options and Recommendation

### Recommend: Repair and verify existing entry surfaces

Reuse existing SEO primitives and interaction-polish work; prioritize README clarity, evidence credibility, link hygiene, repository metadata recommendations, and deployed-readiness evidence when an origin is available. Load-bearing assumption: confusion and credibility gaps are material friction. First failure condition: target users understand the material but still find no relevant value. Worst plausible case: documentation work does not improve adoption. Cost to abandon: localized repository/content changes; no infrastructure migration or spend.

### Defer changes and distribute current material

Useful only if existing assets already communicate value adequately. Negative evidence: contradictory counts, an unresolved proof destination, and unverified deployed indexing remain. First failure condition: newcomers encounter these gaps. Worst plausible case: promotion amplifies confusion. Cost to abandon: editorial rework and lost attention; publishing itself would require separate authorization. Not recommended as the first step.

A new website, SEO platform, or paid campaign is not needed to meet this contract. Structured data and separate search-intent pages are possible later choices, not automatic requirements; neither guarantees ranking.

## Evidence Ledger

Source observations below describe the inspected checkout, not deployed behavior. Remote observations are snapshots retrieved during this intake on 2026-11-03.

| Claim | Status |
| --- | --- |
| Title, description, canonical, Open Graph, Twitter, and robots metadata are already implemented | confirmed(website/src/app/layout.tsx:53-98) |
| Indexing requires production mode, HTTPS, and exact approved-origin match | confirmed(website/src/app/site.ts:43-85) |
| Static robots and one-homepage sitemap exist; sitemap lastModified is fixed at 2026-10-07 | confirmed(website/src/app/robots.ts:4-15; website/src/app/sitemap.ts:4-16) |
| Static export and server-rendered section composition already exist | confirmed(website/next.config.ts:3-8; website/src/landing/LandingPage.tsx:19-48) |
| No approved production origin or live deployment receipt was established; runbook records pending approvals | unknown(live origin); confirmed(website/docs/deployment.md:12-24) |
| README puts release/PATH details near the opening and uses npx as primary setup | confirmed(README.md:8-22,92-108) |
| README contains 335, 299, and 237+ skill counts | confirmed(README.md:12,289,564) |
| README claims 85% fewer tokens and reported 86% savings; inspected benchmark measures synthetic-reference size comparisons, not behavioral savings | confirmed(README.md:12,564,582; benchmark-report.md:3-33) |
| README links docs/public-proof.md; worker direct read and independent filename lookup did not find the destination in this checkout | confirmed(README.md:319; ReadmeDemoEvidence read-only discovery receipt); remote HTTP resolution unknown |
| A long textual walkthrough and illustrative interactive walkthrough exist; short recording was not located in bounded searches | confirmed(README.md:405-497; website/README.md:38-65); unknown(recording availability elsewhere) |
| Contribution instructions and Discussions entry points already exist | confirmed(CONTRIBUTING.md:5-31,60-83; .github/ISSUE_TEMPLATE/config.yml:1-8; website/src/landing/sections/CommunitySection.tsx:23-40) |
| Public repository description contains spelling errors; homepage points to npm; GitHub API reports 582 stars and 163 forks | confirmed(https://api.github.com/repos/HoangNguyen0403/agent-skills-standard/pulls/285, base.repo snapshot); counts are time-sensitive, not adoption baselines |
| PR #285 is open, unmerged; current API head is 8f356928d7edd0bdb1fe224414efbd6b9e8192ac, while supplied review evidence names e59c13d | confirmed(https://api.github.com/repos/HoangNguyen0403/agent-skills-standard/pulls/285); supplied checks must not be attributed automatically to current head |
| Approved related brief already settles motion, setup presentation, illustrative behavior, and coverage scope | confirmed(docs/brd/brd-landing-page-interaction-polish.md:12-43,82-88); see also docs/prd/prd-landing-page-interaction-polish.md |
| No canonical docs/product/<slug>/evidence.json or separate matching growth brief was found in scoped checkout discovery | confirmed(scoped LandingEvidence/ReadmeDemoEvidence discovery; docs/brd and docs/prd filename listing); not proof of absence on all refs or external planning systems |
| Public search query returned the repository alongside unrelated content about the generic Agent Skills standard | confirmed(session web search for agent-skills-standard landing); directional naming ambiguity, not rank or keyword-volume evidence |
| Index eligibility does not guarantee indexing or ranking; useful content and clear titles/link text matter | confirmed(https://developers.google.com/search/docs/fundamentals/seo-starter-guide) |
| Better copy will produce sustained users, contributors, or stars | assumed; unvalidated value hypothesis |
| Current indexing, search impressions, CTR, Core Web Vitals, activation, retention, and channel audience fit | unknown; no production origin, private analytics, or user study inspected |

No canonical product IDs are minted here. REQ-DISC and AC-DISC are brief-local trace seeds, not strategy/OPP/DEC/MET identifiers.

## Delivery Context, Stakeholders, and Risks

- **Maintainer:** scope/claim approval, repository settings, domain/release authorization; proposed owner @HoangNguyen0403.
- **New users:** product understanding and first useful task; participation remains unconfirmed.
- **Contributors:** clear setup and supported contribution paths; no promised review turnaround.
- **Future executor:** bounded README/site work after approved planning and separately settled execution approach. Brief authoring does not authorize implementation.
- **Independent reviewer:** separate from implementation ownership; verifies claim provenance, scope, metadata, and consumer evidence.

| Risk | Mitigation | Proposed owner |
| --- | --- | --- |
| Promotion precedes a crawlable public destination | Keep source and production readiness distinct; use deployment runbook without bypassing approval gates | Maintainer |
| Broad benchmark claims damage trust | Qualify or remove unsupported claims and resolve proof links before promotion | Maintainer + independent reviewer |
| Metadata work mistaken for growth proof | Preserve unknown baselines and run separately authorized bounded validation | Maintainer |
| Duplicate PR285 work or stale verification reused | Carry approved decisions forward; verify changed behavior at the actual delivery revision | Planner + executor |
| Automated outreach harms community trust | Defer posting; later confirm community rules, useful content, and response owner | Maintainer |

**Cost-benefit:** Prefer localized content/evidence work using existing components. Engineering effort, monetary costs, and acquisition return are not estimated or authorized. No new paid tools required by this brief.

**Glossary:** SEO readiness = inspectable discovery eligibility, not ranking success. Activation = a user reaches the documented first-use checkpoint, not an npm download. Illustrative demo = curated behavior visualization, not actual agent execution. Canonical origin = owner-approved public HTTPS origin.

## PM Handoff Checklist

- [x] Preserve user intent and all three slices; scope only the first for this brief.
- [x] Reuse approved PR285-related decisions without reopening visual/interaction design.
- [x] Record source versus deployed evidence and explicit missing data.
- [x] Seed requirements and acceptance criteria; no invented business objective IDs.
- [x] Brief approved by @HoangNguyen0403 on 2026-11-03 via “ok”; approval applies to this brief only.
- [ ] In plan-feature, bind delivery to the actual base/head revision and inspect any newer matching artifacts before creating overlapping plans.
- [ ] Assign implementation and independent review ownership and settle execution approach separately.
- [ ] Continue README/source work even if live-origin verification remains unavailable; maintainer owns origin/approval input for that affected check only.
- [ ] Carry demo and community distribution into separate follow-on intake, not into this implementation scope.
- [ ] Select validate-product if empirical value testing becomes the next authorized task; installed workflow exists, but no experiment execution is approved.

## Approval

**approved(@HoangNguyen0403, 2026-11-03)** — explicit “ok” to the presented brief. Approval does not authorize implementation, spend, recruitment, pilot exposure, analytics, repository settings mutations, posting, merge, deployment, or indexing activation.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-discoverability-readiness-2026-11-03",
  "slug": "discoverability-readiness",
  "workflow": "brainstorm-feature",
  "operator_profile": "technical",
  "lane": "direction",
  "snc_tier": "medium",
  "model_tier": "standard",
  "approval": "approved(@HoangNguyen0403, 2026-11-03)",
  "feature_status": "requirements_ready",
  "started_at": "2026-11-03",
  "completed_at": "2026-11-03",
  "requirement_trace": {
    "brd_objectives": [],
    "requirements": ["REQ-DISC-001", "REQ-DISC-002", "REQ-DISC-003", "REQ-DISC-004", "REQ-DISC-005"],
    "acceptance_criteria": ["AC-DISC-001", "AC-DISC-002", "AC-DISC-003", "AC-DISC-004", "AC-DISC-005", "AC-DISC-006"],
    "srs": []
  },
  "completed_evidence": ["source discovery", "public repository and PR API snapshot", "existing approved scope inspection", "search guidance", "bounded demo and community context lookup"],
  "missing_evidence": ["approved live origin and deployed retrieval", "search-console and adoption baselines", "target-user validation", "short recording availability", "channel-fit evidence"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable"},
  "agent": {"identity": "omp orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

Requirements and slice ordering are approved for planning, not implementation. Dates are day-resolution session metadata; no unavailable clock timestamps are invented.

## Open Questions

- Settled: discoverability readiness first, with demo and community distribution preserved as subsequent slices; approved by the maintainer on 2026-11-03.
- What is the approved public landing origin, if one exists? No origin was discoverable in inspected source/runbook/API context. This is a dependency for later deployed verification, not a blocker to brief approval or README/source work.
- Is the proposed five-developer first-use validation useful? Keep it an unvalidated follow-on proposal unless separately approved; no acquisition target is invented from the 582-star snapshot.

## Next Workflow

After brief approval: **plan-feature**, limited to slice 1. If the maintainer instead selects empirical validation first, use installed **validate-product** to design a bounded test with separate execution authorization. Do not automatically continue implementation or outreach.

## Cost Report

Requested workflow: brainstorm-feature. Host token usage, billing rates, and exact total cost are unavailable; no zero-cost claim or estimate is made. MCP session-cost receipt is obtained at final handoff and may include shared-session tool activity rather than isolated per-worker usage.
