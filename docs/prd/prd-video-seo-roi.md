# Feature Plan: Video Editorial Skills and Evaluation

Status: approved | Owner: requesting maintainer | Revision: r1 | Updated: 2026-11-07

slug: `video-seo-roi`; operator_profile: business; lane: why → product requirements; snc_tier: medium (S=1, N=1, C=1); model_tier: standard; delivery_mode: standard; PRD approval: approved(requesting maintainer, 2026-11-07).

## Decision Brief

- **Changes since approved revision:** Initial PRD elaborating slice 1 of the approved BRD. Owner, business target and video-first scope are unchanged. No implementation or experiment has started.
- **Recommendation:** Extend the existing video/content guidance with an optional, evidence-led YouTube editorial path. Reuse production controls; do not introduce a separate renderer, analytics collector or closed storyboard schema extension.
- **Impact if wrong:** More guidance can increase context and review effort without improving accepted content. Evaluate complete packages and rework, not prompt count or apparent polish.
- **Evidence and limitations:** The approved BRD and its scoped evidence establish existing production safeguards and editorial gaps, not realized demand or ROI. Audience/offer and time baseline remain unknown. Those unknowns do not prevent reusable guidance but do prevent empirical business-success claims.
- **Approval recorded:** Requesting maintainer approved this PRD's observable behavior, slice ownership and verification plan via “Ok” on 2026-11-07. Implementation approach requires a separate Subagent-Driven versus Inline decision. Budget, uploads, model evaluation spend, outreach, analytics, publication, merge and rollout remain unauthorized.
- **Independently ready work:** Editorial requirements and offline evaluation design are approved below. Implementation awaits readiness and execution routing. Live outcomes await separate owner authorization and real evidence.

## Outcome and Guardrails

Business objective: **BRD-OBJ-001**, defined in the [approved BRD](../brd/brd-video-seo-roi.md). Carry forward its target of 20% less median hands-on creation plus review/rework time per accepted package across at least five paired comparable briefs within 30 days of separately authorized evaluation start. This is a learning target, not a promised return. Baseline unknown; no evaluation start authorized.

Maintain factual accuracy, promise fulfillment, accessible content, rights and consent boundaries, and the existing evidence/assembly/recovery controls. Skills must distinguish a draft script, a rendered artifact, observed analytics, and verified business outcomes. Hours remain capacity, not cash savings. Source and product evidence identifiers remain separate from requirement IDs.

## Scope and Non-Goals

### Capability inventory

Prepare credible video content:

- **in_scope — Qualify the brief:** audience/problem/offer, evidence, format/language/runtime, intended action and review constraints → REQ-001.
- **in_scope — Position the channel:** channel promise, differentiated content pillars and a capacity-sized initial slate → REQ-001.
- **in_scope — Package the promise:** paired title/thumbnail concepts grounded in source content → REQ-001.
- **in_scope — Structure the script:** hook, narrative beats, evidence, transitions, payoff and relevant product/CTA placement → REQ-001.
- **in_scope — Repurpose the source:** standalone short-form scripts with source trace and honest count/runtime handling → REQ-001.
- **in_scope — Describe the video:** useful opening, summary, natural search wording and verified links → REQ-001. This is the description part of the video package, not the deferred SEO-audit slice.
- **in_scope — Review retention:** timestamped observations when provided; explicitly hypothetical editorial critique otherwise → REQ-001.
- **in_scope — Evaluate accepted packages:** quality rubric, comparable time records and guarded outcome reporting → REQ-002.
- **in_scope — Preserve consumer compatibility:** discoverable optional guidance and unchanged production/safety contracts → REQ-003.
- **deferred — Audit search discovery:** site crawl/indexing and channel query opportunity research; BRD slice 2, owner requesting maintainer.
- **deferred — Measure realized return:** live attribution, mature adoption/revenue comparisons; BRD slice 3, owner requesting maintainer.
- **excluded — Activate external operations:** publishing, outreach, analytics collection, media uploads, purchases and deployments.
- **excluded — Replace the media toolchain:** new renderers/providers, redesign of approved brand assets or changes to the storyboard JSON contract.

Actors: content creator requests or revises a package; content reviewer judges usefulness and truthfulness; maintainer owns scope, acceptance and any external authorization. These are skill/CLI-consumer capabilities, not Web/Mobile UI changes, feature toggles or market-specific stories.

## Requirements and Acceptance Criteria

The requirements below elaborate the BRD trace seeds; all map to BRD-OBJ-001. Requirements were approved with this PRD on 2026-11-07. Product owner and acceptance/QA owner for every row: requesting maintainer. Implementation owners are the bounded roles in the delivery plan, not yet assigned agents.

| Req ID | Requirement | Implementation owner role | Priority | Status | BRD source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Support coherent, evidence-led creator video packages through the existing editorial/production skill entrypoints, including the seven reference capabilities and honest incomplete-input behavior. | Editorial owner | P0 | Approved | BRD-OBJ-001, AC-002, AC-003, AC-004 |
| REQ-002 | Supply a precommitted offline quality/time evaluation contract that distinguishes specification compliance, observed efficiency and unvalidated financial value. | Evaluation owner | P0 | Approved | BRD-OBJ-001, AC-005 |
| REQ-003 | Make the optional creator path available to existing skill consumers without weakening production safety, changing the closed storyboard contract, or imposing creator steps on ordinary capture tasks. | Integration owner | P0 | Approved | BRD-OBJ-001, AC-006 |

PRD AC IDs use the 100 series to distinguish them from the BRD's existing AC-001..006; the latter remain unchanged business-level constraints. Each criterion is defined only in this table. “Offline semantic review” means inspection of actual skill-consumer answers against independent examples, not checking whether a skill file contains keywords. Evaluation calls need an eligible authorized route; planning is not permission to spend.

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-101 | REQ-001 | Creator supplies a complete brief and source evidence | The editorial path prepares a package | Its decisions trace to that audience, problem, offer or explicit no-offer state, language/format, evidenced promise and intended action without re-asking supplied facts. | Maintainer | Offline semantic review |
| AC-102 | REQ-001 | Audience, offer or source evidence is missing | Creator requests a package | Output identifies the specific gap and labels provisional assumptions; it does not invent demand, offer details, search volumes or demonstrated product results. Only a consequential missing input prompts a targeted question. | Maintainer | Offline semantic review |
| AC-103 | REQ-001 | Creator requests channel planning with a review-capacity constraint | The path proposes positioning and a slate | Each proposed pillar/video supports the channel promise and intended audience action; supplied counts are respected or a shortfall is explained rather than padded with repetitive topics. | Maintainer | Offline semantic review |
| AC-104 | REQ-001 | Source content supports one claim but a proposed title/thumbnail implies a stronger one | Reviewer requests packaging | Unsupported packaging is rejected or revised to match the source, with paired title/thumbnail concepts expressing complementary parts of the same promise. | Maintainer | Offline semantic review |
| AC-105 | REQ-001 | Creator supplies a target runtime, tone and evidenced offer or explicit no-offer state | The path writes a long-form script | The script delivers its opening promise through timed/estimated beats and evidence to a payoff and relevant next action; runtime is an estimate until measured, and product mentions are omitted when no offer is supplied. | Maintainer | Offline semantic review |
| AC-106 | REQ-001 | Creator supplies a long-form source and short-form count/runtime constraints | The path selects derivatives | Each selected derivative is understandable alone, has its own hook/payoff, traces to a source passage or timestamp and fits the requested estimate; insufficient source material yields an explicit shortfall, never fabricated cuts. | Maintainer | Offline semantic review |
| AC-107 | REQ-001 | Creator supplies video content and approved destinations, with or without real query evidence | The path drafts the description | The opening and summary accurately describe viewer value, links use supplied verified destinations, and wording is natural; any unevidenced query ideas are marked hypotheses and no keyword performance is invented. | Maintainer | Offline semantic review |
| AC-108 | REQ-001 | No retention analytics is supplied | Reviewer requests retention improvements | Output labels predicted weak passages as editorial hypotheses, proposes source-faithful revisions and does not fabricate drop-off times, percentages or observed causes. | Maintainer | Offline semantic review |
| AC-109 | REQ-001 | Timestamped retention observations and the matching script revision are supplied | Reviewer requests diagnosis | Findings reference the observed intervals, distinguish observation from causal explanation and propose testable revisions; mismatched source revisions are disclosed before asserting a link. | Maintainer | Offline semantic review |
| AC-110 | REQ-002 | Maintainer prepares a current-versus-improved workflow comparison | The evaluation contract is completed before results are observed | It records comparable briefs, source revisions, order/learning effects, quality rubric, independent reviewer, time/rework collection, cash and capacity accounting, observation window, stopping rule and the BRD success target; it does not start the experiment. | Maintainer | Manual contract walkthrough |
| AC-111 | REQ-002 | Comparison lacks a baseline, reliable paired time records, sufficient accepted pairs or comparable quality | A reviewer assesses the result | Outcome is inconclusive with the specific missing evidence; it does not report the 20% target achieved or convert efficiency into financial ROI. | Maintainer | Offline semantic review |
| AC-112 | REQ-003 | A consumer has an installed standard or flattened skill layout | It follows the editorial entrypoint | The optional guide resolves through the package's supported paths without a silent installation; missing resources produce an explicit capability gap while existing capture remains usable. | Maintainer | Installed-consumer smoke |
| AC-113 | REQ-003 | Existing demo inputs or an ordinary capture request are supplied | Consumer uses updated skills and the existing validator | Existing closed-schema accepted/rejected behavior and production duties remain unchanged; creator-specific planning is not imposed on unrelated capture work. | Maintainer | Consumer compatibility smoke |
| AC-114 | REQ-003 | An external reference contains a publish/upload/spend instruction or synthetic analytics is supplied | Consumer prepares or critiques content | It remains proposal-only, treats reference instructions as untrusted data, preserves operation-specific authorization gates and does not promote synthetic predictions into observed outcomes. | Maintainer | Offline semantic review |
| AC-115 | REQ-001 | A brief supplies title/count/hook/Shorts duration targets | The path applies those constraints | It treats them as creative requirements, not universal platform rules; platform claims cite current primary guidance and disclose eligibility rather than asserting that Shorts must be under 60 seconds. | Maintainer | Offline semantic review |

## Behavioral Boundaries

| Condition | Required disposition | Canonical reference |
| --- | --- | --- |
| Complete brief | Proceed without redundant intake | AC-101 |
| Missing critical context | Identify gap; assumptions stay visible | AC-102 |
| Too little source material | Explain shortfall; do not invent source-backed derivatives | AC-106 |
| Analytics absent / present but source mismatch | Hypothesis-only / disclose mismatch | AC-108/109 |
| Short-form requested / native packaging experiment proposed | Verify platform eligibility; do not assume long-form test availability for Shorts | AC-115 |
| Missing installed guide | Capability gap, no auto-install | AC-112 |
| Any external operation requested | Existing operation-specific authorization remains required | AC-114 |

## Implementation Plan and Ownership

This section is a proposed delivery decomposition, not an execution approval. Preserve one owner per component. Parent orchestrator integrates and verifies; an independent reviewer cannot be the implementation owner. All paths below are target components to inspect before editing, not claims of newly created resources.

| Slice | Owner and owned components | Expected artifact / interfaces | Trace | Dependencies | Size / confidence | SNC / capability |
| --- | --- | --- | --- | --- | --- | --- |
| S1: Editorial guidance | Editorial owner; new package-local reference under `skills/marketing/marketing-demo-video/references/` only | One creator guide consuming the existing intent/channel/action brief and production contract; example outputs and incomplete-input branches; no schema/API change | REQ-001; AC-101..109/115 | PRD approval; execution routing | M / medium | S=0 N=1 C=1, low; fast if eligible and adequate |
| S2: Evaluation contract | Evaluation owner; new package-local reference under `skills/marketing/marketing-demo-video/references/` only; exact distinct file agreed before dispatch | Quality/time comparison contract and independent semantic cases referencing AC IDs; no live analytics, paid eval calls or fabricated results | REQ-002; AC-110/111 | PRD approval; execution routing; can run parallel with S1 | S / medium | S=0 N=1 C=1, low; fast if eligible and adequate |
| S3: Integration and behavioral coverage | Single integration owner; `marketing-demo-video/SKILL.md`, `marketing-content-strategy/SKILL.md`, applicable existing eval definitions, generated routing/package resources, `CHANGELOG.md` and affected contribution/architecture docs only if changed behavior requires them | Optional entrypoint, discoverable guide resources, independent semantic case definitions and canonical-to-installed parity; retain schema and existing production references | REQ-003; AC-112..114; cross-check S1/S2 ACs | S1/S2 artifacts delivered; integration owner alone edits shared files | M / medium | S=1 N=1 C=1, medium; standard |
| S4: Independent acceptance | Reviewer distinct from S1–S3 owners; read-only | Source/AC review plus observed consumer smoke and reviewed outputs; explicit NOT RUN/unavailable where authority or tools are absent | All PRD ACs | Integrated S3; authorized verification route | S / medium | S=1 N=0 C=1, low; eligible analysis/review route |

Estimates are relative, not calendar, monetary or staffing commitments. Account eligibility and named profiles are resolved at dispatch; a capability hint does not authorize a provider, effort change or premium call. Native scout lookups here are read-only research, not implementation workers.

### Verification execution notes

- Implementers must inspect and preserve existing eval conventions. Avoid lexical checks that pass merely because the answer says “unavailable” while still inventing results. Independent review judges the actual proposed behavior and authority boundary.
- Use the shipped storyboard CLI and focused compatibility tests where applicable. Existing script: `node skills/marketing/marketing-demo-video/scripts/validate-demo-storyboard.mjs <storyboard.json> --check --format json`.
- Installed-consumer smoke must follow real skill entrypoints and resolve referenced resources in standard and flattened layouts. Check actual package output rather than source-link presence alone. No claim of a working guide until this runs.
- Live model outputs, time measurements, rendering, ranking and financial outcomes have not been verified by this planning task. A structural validator cannot establish editorial quality or business efficacy.
- Detailed test commands and existing fixture paths are bound at implementation readiness from the actual scoped change; no new media rendering or broad suite is required solely for this PRD.
- Scoped eval lookup found that demo-video eval 2 still permits VTT or SRT while the current skill requires VTT with SRT auxiliary. Integration must reconcile affected coverage with the existing accessibility contract, not weaken that contract. Pressure candidates are diagnostic and lexical scores alone cannot establish semantic acceptance.

## Open Consequential Decisions and Owned Gaps

| Decision / gap | Owner | Affected slice | Required input and consequence |
| --- | --- | --- | --- |
| Execution approach: settled | Requesting maintainer | Implementation S1–S3 | Selected Subagent-Driven in the execution gate on 2026-11-07: parallel disjoint S1/S2, one integration owner, separate independent reviewer. |
| Authorize eligible implementation/review routes | Orchestrator using current project/account configuration | Worker dispatch | Required eligible profile/domain must be known before implementation context is sent; missing eligibility is not a reason to implement inline. |
| Establish real comparison inputs and experiment authority | Maintainer/validation owner | Empirical value validation only | Audience, offer/no-offer, approved storage/exports, independent reviewer, baseline and bounded authority; missing data does not block repository guidance. |

No unresolved API/storage/migration design is introduced by this plan. If later work requires changing the production schema, analytics collection or authority model, stop that affected slice and route to `design-solution`; do not expand the present plan silently.

## Accountability and Release Boundary

- Product/BA: requesting maintainer accountable for scope and acceptance; orchestrator responsible for this plan.
- Engineering: one assigned owner per S1/S2/S3 component; orchestrator responsible for integration.
- QA: separate reviewer responsible for independent checks; maintainer accountable for human acceptance and any release decision.
- Stakeholders consulted: content creator/reviewer roles during authorized validation. No external participant contact is approved.
- Repository changes require readiness and execution gating. Merge, skill publication/sync to external consumers, public content, analytics and empirical evaluation retain their own authority gates.

Risks and glossary inherit the approved BRD. Key delivery risks are token bloat, overclaiming unsupported performance, and disrupting standalone demo capture; AC-111..115 and bounded file ownership cover these without replacing current safeguards.

## Evidence and References

- **Approved authority:** [BRD](../brd/brd-video-seo-roi.md), approval `approved(requesting maintainer, 2026-11-07)`; SHA-256 `0cc7b6db35e3640f63e969bb29855ace571a643e092d7fc3be7cdb51aa66f02e`.
- **Current conventions:** [demo skill](../../skills/marketing/marketing-demo-video/SKILL.md), [content strategy](../../skills/marketing/marketing-content-strategy/SKILL.md), shared [creative contract](../../skills/marketing/marketing-content-strategy/references/creative-production-contract.md). Confirmed from source, not newly exercised editorial behavior.
- **Related canonical evidence:** [synthetic marketing ledger](../product/evidence-led-marketing/evidence.json), revision r1; SRC-001:r1..SRC-003:r1 and MET-001:r1..MET-005:r1. Strategy authority null; no strategy/OPP/DEC/critical-assumption record exists there. Do not copy records or treat planned metric targets as results. No slug-specific ledger existed in the prior bounded inventory.
- **Activation boundary:** [GA4 contract](../product/evidence-led-marketing/ga4-collection-contract.md#7-acceptance-criteria--live-test-gate): live collection remains owner-blocked.
- **Platform facts:** [Shorts eligibility](https://support.google.com/youtube/answer/15424877?hl=en) and [title/thumbnail testing](https://support.google.com/youtube/answer/16391400?hl=en), read during the BRD intake. Counts/durations from screenshots remain brief constraints.
- **Assumptions:** optional guidance improves usefulness/efficiency; existing package mechanisms can distribute linked references without a new toolchain. Verify before claiming readiness.

## Status and Handoff

Planning checkpoint: `requirements_ready`, approved by requesting maintainer via “Ok” on 2026-11-07. Repository implementation has since delivered the optional guidance, evaluation contract, routing/eval integration, metadata and generated resources. Source review APPROVED; actual standard/flattened consumer smoke, compatibility checks and generated parity passed. Actual consumer-answer semantic acceptance, achieved efficiency, business implementation acceptance and release remain NOT RUN/not assessed; do not equate repository delivery with realized value.

Run record: `artifacts/runs/video-seo-roi/plan-20261107.json`, session-local and intentionally gitignored under `/artifacts/`. It records workflow completion, not implementation or release authorization; portable authority remains the approved BRD and this PRD.

**Planning check history:** JSON parsing passed. The first required-scope outcome audit could not start (`tsx` missing); lockfile dependencies were subsequently provisioned. The audit then executed and FAILED on the scoped-ID grammar below. Required trace audit also FAILED for that grammar. Neither is a schema/trace PASS.

**Administrative ID normalization:** Requirement and criterion tokens were originally drafted with namespace qualifiers and administratively normalized to canonical numeric IDs on 2026-11-07 to satisfy the repository's outcome and trace schema (`BRD-OBJ-001`, `REQ-001..003`, `AC-101..115`). Original approval history and mapping are preserved in the fenced historical migration provenance below without minting additional live declarations. Automated trace and outcome audits run against these canonical numeric identifiers.

**Delivery evidence:** [verification walkthrough](../srs/srs-walkthrough-video-seo-roi.md); local detailed receipts under `artifacts/video-seo-roi/`. Authorized bounded provenance recovery and ordinary generation both APPLIED; parent check-only generated parity and post-generation consumer smoke passed. Source/contract approval does not supply missing live semantic or ROI evidence.

### Historical Identifier Migration Provenance

The following mapping records the historical draft tokens to canonical numeric identifiers:

```text
BRD-OBJ-VSR-01 -> BRD-OBJ-001
REQ-VSR-001    -> REQ-001
REQ-VSR-002    -> REQ-002
REQ-VSR-003    -> REQ-003
AC-VSR-101     -> AC-101
AC-VSR-102     -> AC-102
AC-VSR-103     -> AC-103
AC-VSR-104     -> AC-104
AC-VSR-105     -> AC-105
AC-VSR-106     -> AC-106
AC-VSR-107     -> AC-107
AC-VSR-108     -> AC-108
AC-VSR-109     -> AC-109
AC-VSR-110     -> AC-110
AC-VSR-111     -> AC-111
AC-VSR-112     -> AC-112
AC-VSR-113     -> AC-113
AC-VSR-114     -> AC-114
AC-VSR-115     -> AC-115
```

**Next workflow:** `validate-product` for bounded efficiency/quality comparison design and separate execution authorization; `verify-work` for any actual consumer-answer semantic evidence required before adoption. Do not reopen the approved owner, scope or target, activate analytics, or infer merge/release permission from completed repository checks.

## Approval

Approved by the requesting maintainer via “Ok” on 2026-11-07, following the request to approve this detailed PRD and delivery plan only. Owner, target and scope fence remain unchanged. Subsequently selected Subagent-Driven execution through the explicit choice gate. Premium calls and external operations remain unauthorized.

## Cost Disclosure

Complete host token usage, model prices, quota consumption and total monetary cost are unavailable. No numerical cost/savings claim is made. Session cost is recorded through `get_session_cost(workflow="plan-feature")` before handoff.
