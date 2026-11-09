# Feature Plan: Project Verification Readiness

Status: Implemented at repository source; independent source and package review APPROVE; business acceptance and release not assessed | Product owner: repository maintainer | Updated: 2026-11-05

slug: pstack-verification-readiness; operator_profile: technical; lane: direction; snc_tier: high; delivery_mode: extended; approval: approved(operator, 2026-11-05)

## Decision Brief

- **Changes since approved brief:** no scope expansion. Preserve REQ-001–003 and AC-01–07. Decompose bundled proof/safety obligations into AC-08–14 without renumbering the approved IDs. This approved PRD is the canonical detailed requirement/AC definition; the BRD remains the approved outcome/scope baseline.
- **Recommendation:** implement optional portable project-verification guidance and project-owned journey maps; reference them from existing readiness and verification gates. No new daily ags runtime, parallel driver framework, requirements database or universal app harness.
- **Impact if wrong:** stale recipes may misidentify a product defect as documentation drift or drive an unsafe shared instance. Preserve explicit authority, freshness and failure classification.
- **Evidence:** confirmed(approved BRD, its E1–E15 ledger; .agents/workflows/implementation-readiness.md:9–35; .agents/workflows/verify-work.md:9–25; ARCHITECTURE.md §3/ADR-005). These are source contracts, not live proof or measured efficacy.
- **Approval recorded:** operator approved the detailed requirements, AC decomposition and dependency plan on 2026-11-05 by replying “ok”. Subsequently, operator explicitly approved design + subagent-driven implementation on 2026-11-05. This authorizes bounded repository implementation; it does not authorize pilot execution, publication/export, merge, deployment, spend or scheduled work.
- **Independently ready work:** technical design and subagent-driven implementation approach approved. Slices K/G/T bounded for repository implementation; V consumer verification pending target authorization.
- **Design handoff:** portable kit placement/discovery, affected-journey freshness/coverage semantics, and formal AC compatibility resolved in design-solution (srs-pstack-verification-readiness.md).

**BRD objective:** BRD-OBJ-001. Agents should reuse project-specific operational knowledge instead of rediscovering how to launch, navigate, prove and clean up a real application on every task.

**Success metric:** carry the approved BRD SMART target: within 14 days of a separately authorized pilot start, two isolated fresh-agent runs complete the same selected journey without maintainer-provided launch/navigation instructions, preserve evidence and leave no owned process residue. Capture pre-change discovery time and human interventions before making comparative claims. Owner: independent validation owner designated by the maintainer. Baseline and causal benefit remain unknown.

**Guardrails:** existing authority lanes, platform-specific evidence requirements and driver ladders remain intact. An installation-health doctor is not app-business readiness. No source check, schema audit, map entry or passing process health check constitutes behavioral proof. Missing prerequisites block affected work only. All platforms are in the guidance's applicability domain; supported target-platform proof must use that platform's real consumer surface, not a web substitute for native behavior.

## Scope And Capability Inventory

One containment parent per leaf; each committed leaf references its canonical requirement below.

- **Enable project verification**
  - Discover existing kits — in_scope, REQ-001.
  - Describe launch and instance health — in_scope, REQ-001.
  - Drive real journeys and retain proof — in_scope, REQ-001.
  - Maintain journey navigation and coverage — in_scope, REQ-002.
  - Classify map/harness/product divergence — in_scope, REQ-002.
  - Consume kit references at existing gates — in_scope, REQ-003.
  - Demonstrate safety and negative outcomes — in_scope, REQ-003.
  - Compare disposable engineering prototypes — deferred to separate intake under BRD Comparative Inventory.
  - Reconstruct multi-source historical context — deferred to separate intake under BRD Comparative Inventory.
  - Replace SDLC or invent ADLC — excluded.
  - Operate a general app-control runtime, auto-merge, schedule daily upkeep, create cloud fleets or collect extra telemetry — excluded.

Project-owned commands/selectors must come from inspected source and actual observations. Reuse existing drivers and documented development entrypoints. Helpers are permitted only where an existing harness cannot express the required behavior; exact helper interfaces require technical design, not a universal CLI added here. Maintenance may correct its owned kit/map/harness only, not application behavior or approved criteria.

## Canonical Requirements And Acceptance Criteria

All requirements map to BRD-OBJ-001 and are approved under this plan's approval. Product owner is the maintainer for all three; the table names the single delivery-accountable role. Independent QA/verification ownership is specified in RACI.

| Req ID | Requirement | Delivery owner | Priority | Status | Objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Provide reusable project-specific verification instructions grounded in existing tools and source, with an executable real-journey proof and explicit resource/evidence ownership. | Kit maintainer | P1 | Approved | BRD-OBJ-001 |
| REQ-002 | Provide a bounded journey map referencing canonical criteria and a maintenance process that distinguishes operational drift from product failure without weakening expected behavior. | Kit maintainer | P1 | Approved | BRD-OBJ-001 |
| REQ-003 | Consume the kit through existing readiness and verify-work contracts, retaining scoped prerequisites, evidence freshness, independent review and separate acceptance/release authority. | Lifecycle maintainer | P1 | Approved | BRD-OBJ-001 |

These are platform-neutral standards criteria, not web/mobile user stories or claims of platform proof. Each row owns one observable result; necessary evidence/preconditions may be compound. AC-01–07 preserve the approved brief's intent; AC-08–14 isolate its previously bundled boundary obligations. Later tables reference IDs rather than redefining them.

| AC ID | Req ID | Given | When | Then | Owner | Single verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | REQ-001 | An accessible project already has an equivalent verification kit | A delivery agent starts kit discovery | It reuses the equivalent rather than creating a competing source of instructions. | Kit maintainer | Consumer-smoke |
| AC-02 | REQ-001 | Source and a usable isolated target are available | A kit is prepared for handoff | Its instructions identify source-derived launch/readiness, read-only doctor, real drive, evidence location, cleanup, data/auth/reset prerequisites, resource ownership and any executable helper invocation; unproven instructions are marked draft. | Kit maintainer | Independent review |
| AC-03 | REQ-002 | User-facing journeys are identifiable from source | The initial map is delivered | An index covers three representative journeys or all if fewer exist, declaring its coverage boundary and linking canonical ACs, entry paths, preconditions, stable handles, results and limitations without duplicating editable criteria. | Kit maintainer | Independent review |
| AC-04 | REQ-001 | A mapped journey is safe to execute | An agent follows the kit at a recorded source/build identity | A real consumer-entrypoint action produces the expected observable state and applicable side effects, with action/result evidence. | Verification engineer | Consumer-smoke |
| AC-05 | REQ-002 | Source/live behavior exposes a map error, a non-working driver or a product defect | Maintenance reconciles the discrepancy | The report classifies the observed discrepancy as documentation drift, harness failure or product regression with supporting evidence. | Verification engineer | Consumer-smoke |
| AC-06 | REQ-003 | A scoped task supplies a kit reference and separate authority records | Readiness and verify-work consume it | Each preserves its existing prerequisite/verdict role and technical/acceptance/release separation; the kit cannot supply missing human authority. | Lifecycle maintainer | Consumer-smoke |
| AC-07 | REQ-003 | A product regression contradicts an approved criterion | A map-maintenance run encounters it | It reports the product failure without changing application code or weakening that criterion to make maintenance succeed. | Verification engineer | Consumer-smoke |
| AC-08 | REQ-001 | Required environment, data, authority or driver is unavailable for one journey | Discovery or execution reaches that prerequisite | It names the exact gap, accountable owner and affected journey/slice without inventing usable commands or blocking unrelated approved work. | Verification engineer | Consumer-smoke |
| AC-09 | REQ-001 | An execution attempt has captured proof | Its cleanup completes, including after a failed drive | The named proof artifacts remain accessible. | Verification engineer | Consumer-smoke |
| AC-10 | REQ-002 | Some mapped journeys have not been exercised or cannot be reached | Maintenance produces its outcome | Its clean/changed/blocked report discloses per-journey source/live coverage and unreachable prerequisites; incomplete required coverage cannot be clean. | Verification engineer | Consumer-smoke |
| AC-11 | REQ-001 | Verification shares an instance or creates isolated resources | Driving or teardown occurs | Only the assigned owner drives shared state, and cleanup removes only run-owned resources, leaving no owned process residue and not disturbing unrelated instances. | Verification engineer | Consumer-smoke |
| AC-12 | REQ-003 | A change invalidates proof for an identified journey | A gate evaluates evidence freshness | Affected proof is marked stale/requires reproof while unrelated applicable evidence is retained; stale evidence cannot produce PASS. | Lifecycle maintainer | Consumer-smoke |
| AC-13 | REQ-002 | Maintenance corrects its own map or harness | It claims a changed outcome | Each claimed correction is re-driven live and backed by retained proof; unreachable or unexecuted corrections remain unresolved, not verified. | Verification engineer | Consumer-smoke |
| AC-14 | REQ-001 | An instance answers a port but has the wrong build, missing app prerequisites or unhealthy state | The kit's doctor runs | The read-only check refuses to treat that instance as usable and does not mutate it as a health-check side effect. | Verification engineer | Consumer-smoke |

## Behavioral Decisions And Failure Boundaries

The following table is a routing truth table referencing the canonical criteria, not a second verification matrix. It preserves the existing lifecycle contracts rather than introducing new authorization states.

| Condition | Expected route / evidence treatment | Ref |
| --- | --- | --- |
| Equivalent accessible kit found | Reuse it; reconcile a demonstrated deficiency within approved scope | AC-01 |
| Required prerequisite unavailable | Affected work blocked; independent approved work remains eligible for assessment | AC-08 |
| Wrong/unhealthy instance | Do not drive; diagnose/reset only under separate owned execution instructions | AC-14 |
| Application satisfies criteria, map is wrong | Documentation drift; re-drive any correction before claiming verification | AC-05, AC-13 |
| Harness cannot reach a working application path | Harness failure; no product PASS inferred from source alone | AC-05, AC-10 |
| Application violates approved criterion | Product failure; route remediation separately, preserving criterion | AC-07 |
| Journey/source identity changed | Invalidate affected proof and re-run its lane | AC-12 |
| All required coverage completed, no correction | Maintenance outcome clean; verify-work still owns technical verdict | AC-06, AC-10 |
| Proven corrections and complete required coverage | Maintenance outcome changed; no automatic publication/merge | AC-10, AC-13 |
| Required coverage cannot finish | Maintenance outcome blocked with exact limitation | AC-08, AC-10 |

## Ownership And Authority

Roles inherit the approved BRD's maintainer ownership; personal assignment is required before execution, not invented here. The implementer must not provide its own independent-review approval.

| Decision/activity | Product owner / maintainer | Component owner | Independent QA/reviewer | Project owner / host |
| --- | --- | --- | --- | --- |
| Requirements and plan approval | A/R | C | C | I |
| Technical design | A | R | C | C |
| Kit and map implementation | A | R: kit maintainer | C | C |
| Workflow integration | A | R: lifecycle maintainer | C | C |
| Technical proof and independent review | A | C | R | C |
| Target data/runtime authorization | C | I | C | A/R |
| Merge/publication/release | A only within explicitly granted role | C | C | A when host/project authority is required |

No actor receives permission merely by appearing in this table. Plan approval does not authorize credentials, additional accounts, spend, external mutation or release.

## Implementation Plan And Dependency Slices

This is a proposed work breakdown, not an execution grant. Estimates are relative t-shirt sizes, not time/cost commitments. Interfaces between slices are references to the one kit contract and canonical ACs; no competing owner edits another slice's files. Execution approach remains unset: offer Subagent-Driven (recommended) versus a genuinely justified Inline exception before implementation, following installed subagent-driven-development and eligible host profiles.

| Slice | Owner / component boundary | Req/AC refs | Expected artifact / dependency | Size; confidence | Per-slice routing |
| --- | --- | --- | --- | --- | --- |
| D: settle technical contracts | Engineering design owner; proposed docs/srs/srs-pstack-verification-readiness.md | REQ-001–003; AC-01–14 | Portable discovery/placement, ownership, evidence linkage and affected-freshness design; precedes implementation | S; medium | SNC S=2 N=1 C=2 high; strong analysis, effort per eligible configured profile; no premium implied |
| K: author reusable kit/map guidance | Kit maintainer; skills/common guidance and its owned references, exact placement from D | REQ-001–002; AC-01–05,07–11,13–14 | One reusable contract, map/maintenance recipe and smallest necessary existing-harness references; after D/plan/design approval and readiness | M; medium | SNC S=1 N=2 C=1 medium; standard implementation capability; preserve configured effort |
| G: integrate lifecycle consumption | Lifecycle maintainer; .agents/workflows/implementation-readiness.md and verify-work.md | REQ-003; AC-06,08,12 | Concise kit references preserving existing gates; consume D's frozen contract; may run in parallel with K after D | S; medium | SNC S=2 N=1 C=2 high; strong adequacy and independent gate review; standard authorized execution route if adequate |
| V: prove and review integrated behavior | Independent verification owner; existing harness/eval lanes and named scratch project resources | REQ-001–003; AC-01–14 | Real consumer proof and negative-path evidence; after K/G integration and target authority | M; low until target selected | SNC S=2 N=1 C=2 high; independent architecture/test-gap review and security review where trust/permissions apply |

Integration owner: orchestrator. K and G have disjoint editable ownership; V is not owned by either implementer. Generated/exported assets, indices and consumer parity are updated only through existing generation paths if D identifies them as affected. Future permanent changes also update relevant ARCHITECTURE.md, CONTRIBUTING.md, quick reference and changelog through the integration owner; no documentation/publication changes beyond this PRD and run receipt are made by this planning step.

Verification planning: use the lanes specified only in the canonical AC table. Reuse the repository's focused generation/workflow/outcome checks where applicable; they validate contracts, not actual app execution. For consumer proof, use an isolated target's documented real entrypoint and normal/stale-map/missing-driver/regression/cleanup cases. Select exact target commands and evidence location in D/V; do not present unknown commands as executable today. Any new permanent test must catch a distinct observable regression; textual keyword checks alone cannot certify agent compliance or application behavior.

## Open Consequential Decisions And Owned Gaps

| Decision / gap | Owner | Affected slice | Required input and consequence |
| --- | --- | --- | --- |
| D1: portable kit ownership/discovery/placement | Engineering design owner | K, G | Resolved in ADR-VER-001/LLD-001: portable common guidance, project-owned kits under `docs/verification/<app>/`, equivalent reuse, host-neutral lookup |
| D2: source/build/coverage linkage and freshness | Engineering design owner | K, G, V | Resolved in ADR-VER-001/LLD-002: per-journey proof rows in the existing report, dependency-scoped freshness, no second evidence database |
| D3: isolated target and data authority | Project owner | V only | Still open: explicit scoped runtime/data permission and actual harness entrypoint before consumer journey execution; no public pilot implied. Repository-local disposable consumer install/discovery was exercised instead and is not a substitute |
| D4: AC trace serialization compatibility | Tooling maintainer | Persisted automated AC trace only | Resolved in ADR-VER-001/LLD-003 and delivered: formal AC grammar is `/^AC-\d{2,}$/`; source IDs preserved, no renumbering, no aliases, other namespaces unchanged |
| D5: execution approach | Operator | K, G, V implementation | Resolved: operator selected Subagent-Driven implementation on 2026-11-05 |

D1/D2 are technical-design outputs, not requests for the operator to choose repository conventions. D3 does not block repository-only design. D4 does not block requirement review: the linked PRD retains complete trace, while the run record discloses the unrepresented AC IDs. No universal readiness claim is made.

## Risk, Transition And Rollout Boundaries

- **Source-of-truth drift:** PRD is the detailed canonical AC source after approval; map entries link it. Earlier approved BRD wording is retained as historical scope, not independently edited criteria. Owner: product owner.
- **Unsafe execution or evidence leakage:** target owner approves data/runtime boundary; use owned test state, read-only doctor, resource isolation and appropriate artifact privacy. Owner: project owner.
- **False proof:** unexecuted/stand-in-only paths remain explicitly unverified; no schema/source/eval wording result substitutes for live consumer evidence. Owner: independent reviewer.
- **Scope creep:** prototype/context/ADLC expansion remains deferred/excluded, not a follow-up implementation obligation. Owner: product owner.
- **Temporary transition need:** where an equivalent project kit already exists, reconcile its references without creating a second authority; retire a superseded recipe only after the consuming entrypoint is re-proven and its owner approves. D defines any actual migration; no migration is presumed necessary.
- **Activation:** this step writes planning artifacts only. Repository implementation, consumer export/discovery proof and project runtime activation are separately authorized. Preserve the registry-not-runtime architecture. No mandatory schedule or external platform rollout.
- **Value uncertainty:** the operational target is testable, but the underlying benefit remains assumed until a separately authorized validation measures a baseline and runs. Owner: validation owner.

## Evidence, Assumptions And References

- **Authoritative brief:** ../brd/brd-pstack-verification-readiness.md, approved(operator, 2026-11-04), SHA256 `1a71f5b650f0c9675e893a97c43e59f1ed9c60f55f216117793655809c8bec37` observed at planning start. Its glossary, E1–E15 ledger, upstream revision, alternatives and limits are inherited rather than duplicated.
- **Current gate sources:** confirmed(.agents/workflows/implementation-readiness.md:9–35; .agents/workflows/verify-work.md:9–25); readiness and verification remain distinct authority consumers.
- **Registry source and routing:** confirmed(ARCHITECTURE.md §3/ADR-005; skills/common/_INDEX.md generated-source header). Exact new guidance placement is D1, not an established convention claimed by this PRD.
- **Outcome schema:** confirmed(scripts/outcome/schema.ts:51–109; scripts/outcome/index.ts:57–85). Scope/schema validity cannot prove approval, full trace, behavior or freshness.
- **Existing artifacts:** current direct reads found no docs/prd, docs/srs, matching product ledger or matching run directory. This is checkout-local evidence, not absence across all authorized refs; no existing product IDs were minted or duplicated.
- **Assumptions:** maintainer retains product accountability; guidance helps rediscovery; no new universal driver is necessary. Material contrary evidence reopens only affected slices.
- **Unknown:** authoritative ADLC definition, target-specific startup/prerequisites and real value baseline. No new ADLC parity claim.
- Two bounded research workers failed with provider request-abort/retry errors and returned no findings; no evidence is attributed to them. Required current gate/schema facts were read directly; prior approved discovery is reused.

## Status And Receipt

feature_status: partially_implemented (approved requirements; repository source implemented; independent whole-result review, generated exports and acceptance not complete).

- Brief approval: approved(operator, 2026-11-04).
- PRD/plan approval: approved(operator, 2026-11-05).
- Design and execution approval: approved(operator, 2026-11-05) for the technical design plus Subagent-Driven implementation of slices K, G and T.
- delivery_mode: extended; snc_tier: high; model_tier: strong capability hint only.
- repository_status: approved PRD, delivered reusable guidance and lifecycle references, acceptance-criteria identifier compatibility change; activation_status: not_required.
- Run records: ../../artifacts/runs/pstack-verification-readiness/20261105T065407Z-plan-feature.json (planning), ../../artifacts/runs/pstack-verification-readiness/20261105T072631Z-design-solution.json (design), ../../artifacts/runs/pstack-verification-readiness/20261105T145617Z-implement-feature.json (integration record with the complete AC-01–14 trace).
- Machine AC trace: the planning record's `acceptance_criteria` array is empty because the then-current schema rejected two-digit IDs; that historical limitation is retained, not relabeled. Following the approved compatibility change, the design and integration records carry the exact AC-01–14 tokens, and their audits are reported separately from this requirements document.
- Planning verification (historical): receipt JSON parsed successfully with Node; the scoped `pnpm audit:outcome --records --required` attempt could not start because `tsx` was unavailable and node_modules was missing, so schema/scope validation was NOT RUN for that step.
- Implementation verification: recorded in ../../docs/srs/srs-walkthrough-pstack-verification-readiness.md and the integration run record; actual journey driving against a real project kit remains unexecuted, so no behavioral or value claim is made here.

## Next Workflow And Approval

**verify-work / independent review**: source implementation is frozen for review. Operator explicitly approved design and selected Subagent-Driven implementation on 2026-11-05. Component source reviews for K, G and T are APPROVE, the generation contract suite passes 87/87, and the integration record audit passes. Generation is complete at the workflow level: the plain apply and bounded recovery were refused (historical), a human-authorized rehearsal proved the pinned-base producer reproduces the current bytes, and the released in-place adoption published 31 paths total: 30 generated outputs plus the ownership manifest, followed by a passing check. Independent source and package review are APPROVE; business acceptance and release are not assessed. D3 (real target runtime driving) remains a separate project-owner gate; no pilot/runtime exposure, spending, publication, merge or deployment consent is conferred.

Approval evidence: operator approved PRD on 2026-11-05 ("ok") and subsequently granted explicit design and execution approval ("approve design + subagent-driven implementation"). Historical planning-time schema validation remains NOT RUN as recorded in its run record.
