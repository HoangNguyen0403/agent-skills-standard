# Implementation Plan: SEO Readiness And Cost-Aware Agent Routing

Status: Partially implemented (scoped authority: Tasks 1–3 and runtime-source enforcement; full plan, deployment, and paid-eval approvals pending)
Owner / Product Manager / validation owner: @HoangNguyen0403
Engineering owner: assigned implementers for Tasks 1–3; host integration unassigned
QA owner: integration verifier; independent reviewer must not own implementation
Release owner: @HoangNguyen0403; release is not authorized by this plan
slug: discoverability-readiness
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
brief_approval: approved(@HoangNguyen0403, 2026-11-03)
plan_approval: scoped_approved (repository Tasks 1–3 and runtime-source enforcement; full plan/H2 design pending)
execution_approval: scoped_granted (Tasks 1–3 repository implementation and runtime-source enforcement; no deployment, publishing, or paid evals)
repository_status: partially_implemented (Tasks 1–3 source candidate implemented; generation bounded adoption APPLIED with follow-up check PASS; host enforcement still blocked)
traceability_status: PASS — runtime-verified document links, independently closed for the trace task (project CLI exit 0 at 2026-11-03T06:08:45.140Z; 9 REQ / 33 AC; nine intentional unlinked-req warnings; execution evidence not evaluated; T1–T4 closed by independent review; whole-branch review still pending)
activation_status: not_authorized; production activation, deployment, and machine-level routing changes require separate authority

## Decision Brief

- **Changes since approved brief:** The maintainer requested one implementation plan combining SEO readiness with the session's routing improvements. REQ-001 through REQ-005 and AC-001 through AC-024 retain their SEO identities. REQ-006 through REQ-009 and AC-025 through AC-033 cover the routing addition; the original SEO brief approval does not approve these detailed additions.
- **Recommendation:** One coordinated plan with two repository tracks (SEO and portable routing/evaluations), plus an explicitly bounded OMP host-integration track. Use existing metadata and routing guidance; do not build a new website, agent framework, or telemetry service.
- **Impact if wrong:** SEO work may not improve adoption; routing prose may still be ignored; an unchecked session override can launch an expensive or ineligible worker. Account/approval-boundary mistakes require host-owned prevention, not a stronger promise in marketing copy.
- **Evidence:** Reuse the approved [brief's evidence ledger](../brd/brd-discoverability-readiness.md#evidence-ledger). Base source observed during planning: `8f356928d7edd0bdb1fe224414efbd6b9e8192ac`. Approved brief SHA-256: `6be30ff975253d0f5c5984b6e086dfa8479397e08f7653d0f4cc512e995e40fd`. The brief is a workspace artifact; do not imply that it is already committed at that base revision.
- **Limitations:** No approved public landing origin, deployed inspection, Search Console access, user-activation baseline, or real-use recording has been established. Source observations and past PR checks are not new runtime verification.
- **Unresolved dependencies:** Maintainer supplies approved public origin/inspection authority for D and approved OMP configuration scope for H1; host owner supplies adapter source/workspace and guard-design approval for H2. Missing host inputs do not stop repository-only SEO/routing work and never count as enforced prevention.
- **Approval sought:** Approve this PRD, criterion decomposition, scope fence, ownership roles, and sequencing for readiness review. This is not implementation, deployment, publishing, spending, analytics, recruitment, or outreach approval. Execution approach remains a separate choice; recommend bounded Subagent-Driven work after readiness, using eligible profiles and no default premium scouting.
- **Independently ready for readiness review:** A (README/content), B (website/local verification), and R1 (portable routing/evaluations), with verified dispatch preconditions before implementation fan-out. C follows A/B; I integrates repository outputs; D and H1/H2 retain their separately authorized inputs.

**Combined sizing:** SNC: S=2 N=1 C=2 total=5 tier=high for the combined contract because host-side account/model enforcement concerns a trust/authorization boundary. The SEO track remains medium; routing documentation/evidence collection is not automatically high-capability work. `model_tier: strong` is a design/review hint for the consequential boundary, never authority to use expensive or premium models for lookup slices. Human plan approval and host-owned technical-design approval precede the corresponding implementation. No premium consultation is authorized.

**Routing authority:** The user requested this combined plan, not immediate configuration changes. Repository routing changes can be prepared independently of host enforcement; actual host settings/hooks remain subject to reviewed scope, authorized workspace and rollback approval.

## Outcome And Guardrails

Visitors should understand what this project does, see credible supporting evidence, and reach a verified first-use checkpoint through consistent setup instructions. The technical outcome is an honest readiness record, not an SEO score or growth guarantee.

The approved Direction brief intentionally has no BRD business-objective IDs or approved acquisition KPI. Preserve that distinction: completion means observable acceptance, not inferred ROI. The five-developer validation proposal remains unvalidated and unauthorized; do not silently turn it into this delivery's success metric.

Guardrails: static export, established dark/lime visual direction, native anchor/history behavior, complete clipboard strings, keyboard usability, no-JavaScript readability, reduced motion, bounded walkthrough animation, and curated—not live-execution—examples. Preview/local builds stay non-indexable. Do not alter CLI binaries, registry semantics, default skill selection, consent boundaries, package publishing, or deployment controls.

Routing outcome: prevent unchecked economical-worker dispatch, distinguish role labels from actual model/account selection, and prove policy behavior without claiming prompt guidance is deterministic enforcement. Preserve explicit profile settings, account eligibility, host consent and premium gates; do not silently rewrite them to make a cheaper route available.

## Scope And Non-Goals

### In Scope

```text
Deliver SEO readiness and cost-aware routing
  Explain product identity — in_scope, REQ-001
  Verify discovery eligibility — in_scope, REQ-002
  Reconcile promotional evidence — in_scope, REQ-003
  Prove first-use journey — in_scope, REQ-004
  Expose participation routes — in_scope, REQ-005
  Record readiness limits — in_scope, AC-023 across all requirements
  Select adequate worker routes — in_scope, REQ-006
  Evaluate routing and trigger decisions — in_scope, REQ-007
  Configure and verify OMP discovery routing — in_scope, REQ-008; activation gated
  Validate task-adapter contracts — in_scope, REQ-009; host implementation dependency
```

Actors are developers evaluating AI-agent standards, potential contributors, the maintainer approving public claims, and the verifier observing the documented journey. Triggers and outcomes are defined in the AC table; there is no authenticated customer role or new market/feature-toggle policy.

### Deferred

Produce a short real-use demo and choose/run community distribution: retained as subsequent intake slices in the [approved brief](../brd/brd-discoverability-readiness.md#slices-and-boundaries). No external ticket exists in the supplied context; do not invent one. Value testing may later use installed validate-product, with separate recruitment and execution approval.

### Out Of Scope

New visual design/motion, live agent backend, product renaming, claim of ownership of the Agent Skills specification, new registry capabilities, mass-generated SEO pages, schema markup added merely for a score, purchased links, paid promotion, telemetry installation, accounts/credentials, deployment/indexing activation, sitemap submission, public posts, repository-settings mutations, and guaranteed ranking/star targets.

The routing addition does not authorize global account changes, premium access, new agents for their own sake, automatic user-home writes, custom OMP implementation inside the AGS CLI, or a keyword-router redesign. Existing skill metadata/evaluation improvements are in scope. A host-native pre-dispatch guard and adapter correction are retained as external dependency slices, not silently omitted or represented as repository-only fixes.

## Requirements And Acceptance Criteria

### Identity and trace rules

Numeric IDs below are formal aliases of the approved brief seeds — not replacement product decisions and **not a scanner-compatibility fix**. `REQ-001..005` correspond respectively to `REQ-DISC-001..005`; the Source column carries the exact approved identity. Atomic ACs refine the approved groups; the source-group column records complete coverage. The BRD remains historical approval evidence; this table is the canonical detailed PRD definition. Do not maintain a second editable copy of these detailed criteria.

**Trace status: PASS — runtime-verified document links, trace task independently closed.** The post-T4 project audit exits 0 at `2026-11-03T06:08:45.140Z` (`evidence/trace-project-post-t4-receipt.json` + `.json`): `ok: true`, `assurance_kind: document_links`, `execution_evidence: not_evaluated`, 9 REQ / 33 AC recognized, nine intentional `unlinked-req` warnings, parser `9e64168d7b1ae8693e30af9556608997d46a72217141fd4e6eeda6db490141cb`, and the approved BRD hash unchanged. Focused trace suite **57/57 PASS**; independent production-CLI matrix **29/29 PASS** with the T4 negative at 0 REQ / 0 AC and the legacy exact-cell positive at 1 REQ / 2 AC. Full root `pnpm test` exits 0 at `2026-11-03T06:12:12.696Z` (`evidence/root-post-t4.json`): 1543 CLI tests / 71 files, 447 eval tests, 57 trace tests and the remaining root suites, with all six reviewed trace hashes unchanged. Independent bounded review of seven-file package `0203f2bb8324` closes T1–T4 and the missing-target oracle with **no open trace-implementation findings**. That is trace-task closure; whole-branch review, consumer, host, model and release gates remain separate.

**Dated history (not current proof):** the pre-repair `runner-trace-after.log` `malformed-id` failure; the failing T4 baseline in `evidence/trace-t4-before.json` (28/29, unrelated prose table wrongly declared 1 REQ / 2 AC); the earlier 20-case / 48-test snapshot (project `05:09:04.292Z`, root `05:09:49.278Z`); and the 54-trace root PASS at `06:03:31.192Z`. All remain honest historical observations and are not final proof.

### Approved Bounded Trace Repair Addendum
- **Authority & Scope:** Maintainer selected `Authorize bounded trace repair` under Subagent-Driven execution. SNC tier is medium: bounded internal trace tooling (`scripts/trace/`) with source-role and alias compatibility; no runtime model, provider, or trust boundary changes.
- **Contract & Interfaces:** Full-token capture (never truncating at internal hyphens), namespace-qualified historical source-group identities represented distinctly from canonical numeric formal requirements, explicit source-to-formal relationship resolution from existing PRD table columns (`Req ID | Source` and `AC ID | Source group | Req ID`), one-to-many refinement support, compatible endpoint kinds, and fail-closed validation for malformed, dangling, duplicate, or mismatched references.
- **Formal Definitions:** Exactly 9 REQ IDs (`REQ-001..009`) and 33 AC IDs (`AC-001..033`) remain canonically defined. The approved BRD remains immutable with exact SHA-256 `6be30ff975253d0f5c5984b6e086dfa8479397e08f7653d0f4cc512e995e40fd`.
- **Verification Boundary:** Trace-task closure is recorded from the independent review of package `0203f2bb8324` and the bound runtime receipts above. The final cumulative whole-branch review remains pending, and consumer recovery, host runtime enforcement, model routing/paired evaluations, deployed-origin inspection and release remain separate open gates. No model, provider, or trust-boundary behavior changed.

Orphan/coverage classification: the trace CLI's `--required` check requires declared `REQ`/`AC` rows, not an SRS artifact, and its orphan-AC heuristic only looks for any valid reference-role occurrence. The SEO Direction therefore does not lack an SRS — it expressly needs none — and a missing SRS is never the explanation for an orphan diagnosis. The current run reports zero `duplicate-id`, zero `orphan-ac` and zero `malformed-id`; only the nine intentional `unlinked-req` warnings remain, because the Direction brief owns no `BRD-OBJ` IDs. The earlier `malformed-id` errors are dated pre-repair history. No SRS, business objective, or rule waiver was manufactured. H2 still genuinely requires an authorized source-bound technical design (blocked) rather than an invented SRS or claimed missing external access.

PO means @HoangNguyen0403, accountable for every requirement. Engineering role is the implementation owner below; QA role is the separate integration verifier. Priorities are proposed for plan approval: P0 protects credibility/indexing boundaries, P1 improves the entry journey. Requirement status is scoped direction approved / detailed plan pending, not implemented.

| Req ID | Source | Requirement | Engineering owner | Product / QA owners | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | REQ-DISC-001 | Explain the project's purpose, target developer, concrete use, and distinction from the underlying skill format consistently across README and landing. | A content implementer | PO / integration verifier | P1 | Plan pending |
| REQ-002 | REQ-DISC-002 | Verify existing discovery eligibility with revision/origin-bound evidence; repair confirmed in-scope defects without bypassing activation gates. | B website implementer | PO / integration verifier | P0 | Plan pending; deployed checks conditional |
| REQ-003 | REQ-DISC-003 | Reconcile promoted counts, quantitative claims, and proof destinations against explicit evidence. | A content implementer; B owns website application | PO / independent claim reviewer | P0 | Plan pending |
| REQ-004 | REQ-DISC-004 | Present a consistent setup journey and prove installation, loading, and first useful application separately. | A content implementer; C integration verifier owns smoke | PO / integration verifier | P1 | Plan pending |
| REQ-005 | REQ-DISC-005 | Make support and contribution routes discoverable and record safe repository-metadata recommendations. | A content implementer; C owns recommendation record | PO / integration verifier | P1 | Plan pending |
| REQ-006 | Maintainer's combined-plan request; observed session routing failure | Classify each delegated slice, reuse existing evidence, resolve eligible actual model/account/effort before dispatch, and stop on unverified routing rather than silently falling back after invalid arguments. | R1 routing implementer | PO / independent routing reviewer | P0 | Plan pending |
| REQ-007 | Retrospective findings; common-task-complexity-routing | Verify routing decisions with adversarial/positive cases and eliminate confirmed irrelevant framework activations from generic planning language using existing trigger mechanisms. | R1 routing implementer | PO / routing verifier | P1 | Plan pending |
| REQ-008 | Recorded OMP scout smol-to-Sol resolution; host configuration contract | Provide explicit scoped OMP worker mapping and real resolution evidence; for an enforced cost/account boundary, require a host-owned pre-request check rather than relying on AGS prose. | H host integrator | PO / host control reviewer | P0 | Plan pending; live changes gated |
| REQ-009 | Task model-argument rejection and documented seance-only semantics | Make the adapter's supported dispatch contract and actual selection provenance unambiguous; rejected arguments cannot authorize an unchecked route or count as quota exhaustion. | H host adapter maintainer; R1 documents recovery | PO / host contract reviewer | P0 | Plan pending; adapter source prerequisite |

AC owner below is the accountable verification role. Each row has one verification lane; supporting commands do not turn a check into a second lane. `[WEB]` includes browser-rendered README and mobile/desktop landing; `[CLI]` denotes an isolated terminal scenario, not mobile-app parity.

| AC ID | Source group | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-001 | AC-DISC-001 | REQ-001 | [WEB] A developer first opens rendered README | They read the opening before release/debug details | Purpose, intended developer, one concrete use case, and one next action are visible in that order of priority without requiring SDLC acronym knowledge. | Integration verifier | Rendered-document review |
| AC-002 | AC-DISC-001 | REQ-001 | [WEB] README and landing describe the project | Their product explanations are compared | Both communicate portable standards/workflows for existing coding agents and do not present this repository as the owner of the underlying Agent Skills specification or a replacement runtime. | Independent claim reviewer | Cross-surface editorial review |
| AC-003 | AC-DISC-002 | REQ-002 | [WEB] A static build is served on its recorded origin | Its actual HTML head is inspected | Title/description identify the content and the canonical resolves to that build's intended root origin, with no accidental localhost/preview reference in a production artifact. | Integration verifier | HTTP/HTML inspection |
| AC-004 | AC-DISC-002 | REQ-002 | [WEB] The existing local/preview/production configuration cases in the decision table are exercised in isolated builds | Meta robots and robots.txt are inspected | Both match the existing approval predicate; a sitemap reference never overrides a disallow/noindex result. Invalid configurations fail rather than silently choosing a production origin. | Integration verifier | Isolated configuration scenario |
| AC-005 | AC-DISC-002 | REQ-002 | [WEB] The static sitemap is retrieved | Its entries are compared with actual canonical routes | The homepage entry uses the same intended origin and a real route; lastModified, if retained, has a defensible content-change basis rather than an invented current date. | Integration verifier | Sitemap inspection |
| AC-006 | AC-DISC-002 | REQ-002 | [WEB] The served build has OG/Twitter metadata | Referenced social assets are requested | Metadata uses the intended origin and assets return the expected image content, dimensions, and MIME type; no actual social-platform preview is claimed without observing it. | Integration verifier | Social-asset HTTP inspection |
| AC-007 | AC-DISC-002 | REQ-002 | [WEB] JavaScript is disabled | A developer opens the landing | Product narrative, meaningful coverage, complete commands, and usable setup/contribution links remain available without running the illustrative animation. | Integration verifier | No-JavaScript browser scenario |
| AC-008 | AC-DISC-002 | REQ-002 | [WEB] The static site is served at a recorded origin | Homepage and an unknown path are requested | Homepage returns 200, the unknown path returns genuine 404 rather than a soft-404 shell, and observed redirects and indexing-relevant headers are recorded. | Integration verifier | HTTP route scenario |
| AC-009 | AC-DISC-002 | REQ-002 | [WEB] The unchanged configured mobile-performance harness can inspect the static build | Its existing three-run audit completes | Existing performance/LCP/CLS thresholds pass, with raw run conditions retained; lab results are not described as real-user Core Web Vitals or INP evidence. Infrastructure failures remain unverified, not passing. | Integration verifier | Existing mobile lab audit |
| AC-010 | AC-DISC-002 | REQ-002 | [WEB] The reviewed landing is open in the supported browser | Existing accessibility checks and keyboard navigation are exercised | No serious/critical Axe findings occur and setup/contribution destinations remain operable by keyboard; observed browser/device limits are stated. | Integration verifier | Accessibility browser scenario |
| AC-011 | AC-DISC-002 | REQ-002 | [WEB] Maintainer supplies an approved public origin and authorizes read-only deployed inspection | The actual public destination is retrieved without changing deployment | A separate production evidence record captures final URL, status/redirect chain, canonical, meta/header indexing policy, robots, sitemap and social assets; without those prerequisites the record explicitly remains unverified, never inferred from local builds. | Integration verifier | Deployed-origin read-only inspection |
| AC-012 | AC-DISC-003 | REQ-003 | [WEB] Promoted skill/coverage counts exist | Each occurrence is reviewed against its named registry/release snapshot | Contradictory counts are replaced by a consistent sourced snapshot or omitted; current checkout totals are not labeled as released/default-installed totals. | Independent claim reviewer | Claim-provenance audit |
| AC-013 | AC-DISC-003 | REQ-003 | [WEB] Any savings/effectiveness statement is retained | Its nearby qualification and linked proof are examined | Date, method, comparator and population/scope are clear; unsupported universal/team-reported claims are removed and synthetic size evidence is not represented as measured user savings or executable task quality. | Independent claim reviewer | Claim-provenance audit |
| AC-014 | AC-DISC-003 | REQ-003 | [WEB] Public proof is linked from either entry surface | A developer follows each changed proof link | The exact reviewed destination resolves with its limitations, including repair or replacement of the missing Public Proof link; no absent evidence is replaced by a fabricated report. | Integration verifier | Rendered-link traversal |
| AC-015 | AC-DISC-004 | REQ-004 | [WEB] Developer chooses the recommended setup on README or landing | They compare the primary and alternative paths | Both recommend npm global install plus ags init/sync, with a clearly secondary npx equivalent; complete semantic/clipboard strings stay available during motion. | Integration verifier | Cross-surface setup scenario |
| AC-016 | AC-DISC-004 | REQ-004 | [WEB] A developer reads setup prerequisites | They select a supported runtime/tool path | Prerequisites are explicit and grounded in the tested package/toolchain, distinguishing consumer CLI from contributor/website build requirements; unsupported environments are not promised. | Integration verifier | Documentation/runtime evidence review |
| AC-017 | AC-DISC-004 | REQ-004 | [CLI] An isolated sample repo and temporary npm prefix are used with the recorded published package version | The documented install/init/sync path completes | The documented config and selected native assets exist in the sample repo, with package/runtime/version and non-secret command output recorded; no writes escape the selected sample/prefix or opt into user-home integration. | Integration verifier | Isolated consumer CLI smoke |
| AC-018 | AC-DISC-004 | REQ-004 | [CLI] The sample repo has synced assets and one explicitly supported existing host | The host is asked to apply a relevant rule | Real file reads or existing MCP receipts identify the matched skill and source; mere asset existence or a narrated example is not accepted as loading proof. | Integration verifier | Native-host loading scenario |
| AC-019 | AC-DISC-004 | REQ-004 | [CLI] One sample task, applicable existing rule, and independent expected outcome are recorded before execution | The existing host performs the task within the sample repo | Observed artifact/output meets that rule-specific outcome; distinguish this one-task proof from general benchmark efficacy. No new live-execution website feature, paid model call, or permission bypass is introduced to obtain proof. | Integration verifier | Bounded real-task scenario |
| AC-020 | AC-DISC-005 | REQ-005 | [WEB] A newcomer has a question | They follow the direct questions/feedback route from README or landing | The destination exists and supports the advertised action; a configured URL alone is not treated as evidence of activity or response SLA. | Integration verifier | Support-link traversal |
| AC-021 | AC-DISC-005 | REQ-005 | [WEB] A developer wants to contribute | They follow the visible contribution route | Actual contribution instructions and applicable prerequisites are reached directly, with no architecture-only detour replacing onboarding. | Integration verifier | Contribution-link traversal |
| AC-022 | AC-DISC-005 | REQ-005 | [WEB] Current repository About/topics/homepage and README/landing relationships are inspected | Recommendations are recorded in existing website notes | Corrected descriptive copy, relevant proposed topics, and the conditional homepage target are explicit; no account setting is mutated and no unknown landing origin is invented. | Integration verifier | Repository-metadata recommendation review |
| AC-023 | AC-DISC-006 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005 | The delivery evidence is reconciled | Maintainer reviews readiness | Each missing baseline/proof has an owner and consequence; source/local/deployed/adoption statuses are distinct; demo and distribution follow-ons remain named without claiming stars/downloads prove activation or SEO efficacy. | Maintainer | Evidence reconciliation |
| AC-024 | Approved guardrails | REQ-002, REQ-004 | [WEB] Any landing content or metadata code changed | Affected existing interaction scenarios run at that revision | Existing keyboard, reduced-motion, mobile containment, copy/recovery and illustrative-walkthrough contracts remain intact; no test is weakened or whole-site redesign introduced. | Integration verifier | Affected browser-regression scenarios |
| AC-025 | Combined routing scope | REQ-006 | A medium/high parent task contains deterministic lookup and bounded evidence slices | A worker route is chosen | Each slice is assessed independently; existing tools/evidence are used where sufficient and an expensive parent analysis profile is not inherited merely because the parent work is complex. | Routing verifier | Held-out routing evaluation |
| AC-026 | Combined routing scope | REQ-006, REQ-009 | A named role/profile is supplied only in prompt text, the tool rejects a model parameter, or the resolved route is unknown | Dispatch recovery is considered | No unchecked worker is launched; the agent uses a supported already-authorized route or reports the exact resolution gap, without treating invalid arguments as provider exhaustion. | Routing verifier | Held-out routing evaluation |
| AC-027 | Combined routing scope | REQ-007 | Approved discovery evidence is sufficient, or the question genuinely requires open-ended analysis | Planning chooses its next action | Reuse is selected in the first case; an eligible adequately capable analysis route remains available in the second. Evaluations reject both unnecessary repeated scouting and indiscriminate always-cheapest routing. | Routing verifier | Fixed-model paired evaluation |
| AC-028 | Combined routing scope | REQ-007 | Stack-neutral SEO/planning prompts and stack-qualified positive controls are provided | Existing keyword/skill matching runs | Generic feature/readiness wording does not load unrelated Flutter/Laravel/React Native guidance, while genuinely relevant framework prompts retain their intended matches. | Routing verifier | Trigger-routing regression scenario |
| AC-029 | Combined routing scope | REQ-008 | An eligible discovery provider/model and project scope are explicitly approved | OMP mapping is prepared and inspected | Bundled scout has a direct agent override to the approved discovery role, unrelated reviewer/task routes remain unchanged, and no custom scout definition or global default change is required. No mapping is activated without scope approval. | Host integrator | Scoped configuration inspection |
| AC-030 | Combined routing scope | REQ-008 | The approved mapping is active in an isolated authorized host session with a more expensive parent model | One bounded read-only discovery probe is separately authorized and launched | The actual spawn receipt/child metadata identifies the approved provider/model/effort and selection source; a config file, role name or profile sentence alone is not accepted as execution proof. | Host integrator | Authorized native-dispatch smoke |
| AC-031 | Combined routing scope | REQ-008 | The host-owned guard sees an unresolved role, an ineligible account, an unexpected expensive resolved model, or an unauthorized escalation | Dispatch reaches the pre-request boundary | The guard prevents the first worker model request and records the mismatch; permitted routes remain usable. Missing/unsupported enforcement is explicitly not-enforced, never marketed as guaranteed prevention. | Host control reviewer | Host-policy integration scenario |
| AC-032 | Combined routing scope | REQ-009 | The actual task adapter contract is exercised for normal scout and seance dispatch | Supported and invalid argument shapes are checked | Model selection support matches the exposed schema/docs, unsupported scout model arguments fail actionably without hidden spawn, and actual role/model/provenance remains observable through existing receipts. | Host contract reviewer | Adapter contract scenario |
| AC-033 | Combined routing scope | REQ-006, REQ-007, REQ-008, REQ-009 | Repository and host work are reconciled | Maintainer reviews the combined delivery | SEO, portable routing guidance, evaluation outcomes, host mapping and host enforcement have distinct statuses; all failed/cancelled attempts remain in cost coverage and no exact savings or never-again guarantee is invented. | Maintainer | Combined evidence reconciliation |

## Existing Indexing Decision Table

This specifies verification of current behavior from `website/src/app/site.ts`, not a policy change. Any disagreement with it reopens only REQ-002 for maintainer decision.

| Build input case | Existing outcome | Relevant criterion |
| --- | --- | --- |
| Missing/invalid SITE_URL, invalid deployment mode, or malformed APPROVED_SITE_URL | Build/config error, not invented fallback | AC-004 |
| Valid local or preview mode, even with a matching approved HTTPS origin | Noindex/nofollow; robots disallow root | AC-004 |
| Production on HTTP or without approved origin | Noindex/nofollow; robots disallow root | AC-004 |
| Production HTTPS with valid but different approved origin | Noindex/nofollow; robots disallow root | AC-004 |
| Production HTTPS with exact approved-origin match | Index/follow; robots allow root | AC-004 |

Use isolated local artifacts for configuration probes. A matching hypothetical HTTPS input in a test does not authorize deployment, ownership, or search submission. Do not enable indexing on a real origin as part of verification.

## Implementation Plan, Task Slices And Verification Plan

### Ownership and scheduling

Estimates are relative t-shirt sizes, not dates or budgets. They include scoped verification; confidence depends on unresolved prerequisites. Only one implementer writes each component. The orchestrator integrates and verifies, never accepts a worker's success claim without evidence.

| Slice | Owner role / owned components | Requirements / AC refs | Expected artifact | Dependencies | Estimate / confidence |
| --- | --- | --- | --- | --- | --- |
| A — Clarify README and evidence | Content implementer: README.md; CONTRIBUTING.md only for directly conflicting prerequisites; inspect benchmark/eval/capability docs but do not regenerate evidence | REQ-001,003,004,005; AC-001,002,012–016,020,021 | Renderable revised README, consistent sourced claims, direct proof/support/contribution routes and first-use checkpoint | Plan/readiness/execution approval | M / high on content, medium on runtime prerequisite evidence |
| B — Verify landing discovery behavior | Website implementer: website source/tests; website/README.md and existing deployment runbook; minimal metadata/content fixes only when confirmed necessary | REQ-001–005 website surfaces; AC-002–010,012–016,020,021,024 | Existing SEO behavior verified, narrowly scoped defects repaired, source/local evidence in existing website notes | Same gates; may run concurrently with A; reads shared claim rules from this PRD, not A's in-flight edits | M / medium; browser/runtime availability unverified |
| C — Reconcile first-use and readiness | Integration verifier: isolated sample/prefix and integration evidence; website/README.md only after B releases ownership; independent reviewer separately assesses claim provenance | REQ-001–005; AC-014–023 and affected cross-surface checks | Real first-use receipts, repository-metadata recommendations, source/local/deployed/adoption readiness statuses and follow-on handoff | A and B; supported host for AC-018/019 | M / medium; no new paid model invocation authorized |
| D — Observe approved deployed origin | Integration verifier: read-only HTTP/browser inspection, evidence update in existing website notes after C or with explicit serialized ownership | REQ-002; AC-011 | Deployed-origin observations, or explicit unverified status with maintainer-owned missing inputs | Origin and explicit inspection authorization; no provisioning or activation | S / low until origin is available |

**Cross-slice interface:** The recommended setup is fixed by the approved brief. Quantitative claims share a named snapshot or are omitted; no worker supplies an unsourced alternative total. A does not edit website files; B does not edit README/CONTRIBUTING. C owns integration changes only after A/B hand back files. If a scope or public claim decision cannot be resolved from approved evidence, report it to the maintainer without inventing policy.

### Combined execution order and additional slices

One plan, not two independent feature launches. Preserve A–D above; add the following ownership areas and scheduling.

| Slice | Owner / exact boundary | Requirements / AC refs | Deliverable and verification | Dependency | Estimate / confidence |
| --- | --- | --- | --- | --- | --- |
| R0 — Establish dispatch preconditions | Orchestrator + maintainer; read-only runtime/profile inspection before any implementation fan-out | REQ-006,008; AC-025,029 | Confirm whether each selected tool can honor the eligible profile/model/account; reuse known facts and do not launch another expensive scout to discover the cheap route | Plan approval; no configuration mutation | S / high |
| R1 — Improve portable routing and evaluations | One routing implementer: skills/common/common-task-complexity-routing/SKILL.md, references/routing-table.md, evals/evals.json; existing canonical brainstorm-feature/plan-feature workflow sources reference that procedure instead of copying it | REQ-006,007,009; AC-025–028 | Slice classification, tool-first/evidence reuse, role-versus-model distinction, unsupported-argument recovery and existing-receipt provenance; add failure/positive evals. Narrow confirmed overbroad metadata in existing Flutter/Laravel/React Native skills with matching negative/positive evals; no matching-engine rewrite | R0; authorized fixed-model evaluation run | M / medium |
| H1 — Prepare and validate scoped OMP mapping | Host integrator; owner-approved project/session overlay only, outside automatic AGS sync; initial candidate described below | REQ-008; AC-029,030 | Minimal mapping, original scoped settings backup, actual resolution smoke and restoration evidence; no changes to unrelated agent routes or accounts | Explicit configuration scope and one bounded probe authorization | S / medium; mapping mechanism documented, actual route not yet tested |
| H2 — Enforce host dispatch and repair adapter contract | Host runtime/adapter maintainer; actual OMP/integration source, not invented files in this AGS checkout | REQ-008,009; AC-031,032 | Reviewed pre-request guard using host-owned policy and existing before_subagent_spawn surface; actionable schema/provenance behavior. Rejecting fixtures and real host integration proof precede any enforced claim | Authorized host source/workspace, technical design and human approval; exact integration ownership not yet available | M / low until source boundary is supplied |
| I — Integrate and independently review | Orchestrator + independent reviewer; serialized generation and acceptance evidence | All requirements; AC-023,024,033 | Regenerated canonical exports, source-to-host resource parity, no unsupported OMP integration claims, combined verification and readiness boundaries | A, B, R1; C follows A/B; host results recorded independently | M / medium |

**Schedule:** R0 first. After execution approval, A, B and R1 can run in parallel with separate file ownership. H1/H2 can run independently only after their own authority/prerequisites exist. C follows A/B; I follows repository slices and serializes generated-output ownership; D waits only for its live-origin input. Do not block safe SEO/content changes on missing host source. Do not claim the entire routing-prevention goal complete while H2 is unverified.

**Routing/bootstrap rule:** Do not use the route being repaired as an unchecked bootstrap. Use a supported explicitly configured eligible worker route. If native scout resolution cannot be verified before launch, do not invoke it; use known-file deterministic checks or an authorized profile-aware host surface consistent with current tool policy. A role label or a sentence naming a profile is not configuration.

**Generation ownership:** Edit canonical registry/workflow sources, not installed .codex copies. One integration owner runs existing generation tooling and reconciles generated exports after R1; A/B do not edit generated capability tables. Canonical workflow paths and declared export targets must be confirmed through existing generation manifests at readiness. No new OMP adapter/CLI target is invented by this plan.

### OMP configuration decision

**Decision: use AGS rules plus explicit host routing.** AGS owns portable policy and evaluations. OMP owns executable model/account/effort resolution. Custom `.omp/agents/scout.md` is unnecessary when only the bundled scout's model changes; use the existing `task.agentModelOverrides.scout` and a role mapping instead. This does not automatically configure sonic, task, reviewer or advisors.

Candidate mapping for this personal project, **not applied and not yet dispatch-tested**:

```yaml
modelRoles:
  discovery: google-antigravity/gemini-3.8-flash:medium
task:
  agentModelOverrides:
    scout: "@discovery"
```

The model/effort must match an eligible available configuration at activation; this example is grounded in the inspected Personal - Cheap profile, not authorization to use that account for every project. Configure the smallest owner-approved project/session overlay, not the user-global default. Do not commit personal account identifiers or let `ags sync` modify user-home settings automatically. If the current bridge does not honor that scope, record the mismatch and resolve it with the host owner rather than changing unrelated settings.

**Observed baseline:** `omp config get modelRoles --json` returned only default Gemini Flash; `omp config get task.agentModelOverrides --json` returned an empty object. Actual bundled scout records nevertheless show role smol resolving to Codex Sol at medium effort. No project/user native scout definition was found in the inspected locations. The live overlay responsible for that difference was not established. A cheaper global default therefore is insufficient evidence of cheaper scout execution.

**Enforcement boundary:** Explicit mapping selects a route; it does not prove prevention under every session override or retry. For the stronger goal, H2 checks the final resolved provider/model/account and escalation authority before the first model request. The documented before_subagent_spawn hook is an integration surface, not proof that a matching guard is installed. Keep runtime approval controls host-owned; AGS must neither self-authorize nor silently replace them.

**Support boundary:** The generated docs/agent-capabilities.md table currently has no OMP entry. This session's OMP tooling is not proof that AGS supports OMP CLI sync, native-agent exports, or hooks. Host setup guidance must state that distinction. Adding first-class OMP serialization, an automatic configuration command, or a new capability row requires its own verified adapter scope; none is silently introduced here.

### Routing verification entrypoints and cases

- Reuse existing routing evals and the installed evals-run protocol. Fix model/tools across current-versus-candidate comparisons; include this session's failed argument recovery, expensive-parent/simple-child case, absent role mapping, observed exhaustion versus invalid arguments, sufficient evidence reuse, and legitimate analysis positive controls. Obtain bounded evaluation authorization rather than creating unrestricted billable runs.
- Exercise existing skill keyword matching with the stack-neutral/qualified corpus for AC-028. Preserve valid activations; do not merely add output anchors or weaken assertions.
- Existing repository checks, after dependencies are provisioned: `rtk pnpm audit:skills`, `rtk pnpm audit:sdlc`, `rtk pnpm generate-indices --check`, and affected existing eval/generation test targets. Reuse configured scripts; no successful result is claimed at planning time.
- H1 first inspects scoped OMP settings with read-only configuration tools. Its one authorized native probe must expose actual resolved metadata; default-model inspection alone is not sufficient.
- H2 uses negative control fixtures that reject a forbidden resolved model before any provider call, plus an allowed-route control. Inspect retry/fallback and session-override paths, not just the initial nominal configuration.
- The schema mismatch belongs to the host task adapter: current documentation allows task-item model only for seance. Fix exposed conditional schema/help there, or document the correct supported route; never circumvent it by removing configuration and spawning unchecked.

### Configured verification entrypoints

These are planned commands, **NOT RUN for this feature**. Prefix shell invocations with rtk. Use package/runtime prerequisites from source and readiness checks; do not install tools or start paid hosts merely to make a receipt green.

- `rtk pnpm website:typecheck` and `rtk pnpm website:lint` — existing non-mutating type/lint gates. Do not use website package `lint`, which invokes `--fix`, as a read-only verification substitute.
- `rtk pnpm --filter @ags/website test` — existing single-run website tests. Add permanent tests only for plausible metadata/indexing defects or uncertain boundaries; no source-string copy tests or blanket new test suite.
- `SITE_URL=http://127.0.0.1:4321 DEPLOYMENT_ENV=local rtk pnpm website:build` — static build; environment-case probes use separate build outputs, not a running server's mutable directory.
- `rtk pnpm website:serve` — existing static server at 127.0.0.1:4321. Manage as an owned service, observe readiness, stop on completion; verify actual unknown-route behavior.
- `rtk pnpm --filter @ags/website test:e2e --retries=0` — existing browser contract suite when website behavior changed; choose existing focused scenarios for affected checks first, retain meaningful assertions, record actual runner membership/results rather than claiming a full pass from unrelated old receipts.
- `rtk pnpm --filter @ags/website performance` — existing mobile Lighthouse harness at default local origin. Source currently requires three consistent runs with median performance >=90, LCP <=2500ms and CLS <=0.1. These are pre-existing harness gates, not newly invented business SLAs or field metrics. Chrome and a ready server are prerequisites.
- README/proof-link checks use actual rendered Markdown and destination traversal. Do not assume `pnpm docs:scan` is a broken-link checker: its root script targets scripts/server code, not README link resolution.
- First-use consumer sequence: use temporary PATH/npm prefix and sample repository, record the resolved published version for `npm install -g agent-skills-standard@latest`, then `ags init` and `ags sync`. Inspect the actual CLI help/prompts at execution time rather than guessing noninteractive flags. Select project-only or disabled MCP integration; never opt into user-home scope. Test the documented npx alternative if its text changes.
- For AC-018/019, use a supported already authorized host and one existing rule. Record a rule-specific expected result before execution and observe the changed sample artifact. Unavailable host access blocks these checks only; do not relabel sync as actual use or call a premium model to fill the gap.

The root package declares pnpm 10 and Node >=20; website runbook requires Node22 for builds. cli/package.json exposes both `ags` and `agent-skills-standard`, but declares no engines field. Dependencies and tested release behavior must be checked before writing a definitive CLI minimum. Do not copy contributor or website prerequisites into a consumer claim without evidence.

### Evidence and completion rules

Reuse existing website notes for delivery receipts. Each relevant observation includes source revision plus changed-file identity, origin/runtime/browser, actual command/scenario, result and limitations. Preserve raw evidence where configured; a planning receipt is not technical proof.

Record repository acceptance and production readiness separately. If D lacks inputs, repository delivery may be independently acceptable after A–C, but the approved production-verification criterion remains unverified, not waived and not a full end-to-end SEO-ready claim. If C lacks a supported host, distinguish content/local completion from missing first-use proof. No silent scope reduction.

Render proposed README without publishing it solely for verification; a local renderer is acceptable only with a stated GitHub-parity limit. When no real destination can be retrieved, report the precise missing proof rather than mock success. No external analytics/Search Console access is required to finish source work, and no before/after growth attribution is promised.

## Open Consequential Decisions

| Decision / dependency | Owner | Affected slice | Consequence / required input |
| --- | --- | --- | --- |
| Approve detailed PRD and criterion decomposition | Maintainer | All | Pending explicit approval of this plan; brief approval alone did not authorize implementation |
| Select execution approach and eligible implementation profiles | Maintainer / orchestrator | A–C, R1, I; H under its host scope | Recommend bounded Subagent-Driven execution; discover/configure eligible profiles explicitly and avoid expensive runtime-default scouting; no premium authorization |
| Supply canonical public origin and authorize deployed inspection | Maintainer | D only | Without it AC-011 remains unverified; domain/account/deployment activation remain separate |
| Confirm available authorized native host for actual first-use proof | Integration verifier; maintainer if access is missing | C, AC-018/019 | Establish at readiness; no invented invocation, premium fallback, or permission bypass |
| Approve combined routing scope and elevated host-boundary review | Maintainer | R0, R1, H1, H2, I | User requested a combined plan; detailed criteria, account boundaries and implementation remain pending approval |
| Authorize scoped OMP mapping and one economical resolution probe | Maintainer / host owner | H1 | Confirm project/session scope, eligible provider/account/effort and restoration target; no global setting change assumed |
| Supply host adapter source/workspace and approve guard design | Host runtime owner | H2 | This checkout is AGS, not demonstrated OMP runtime source; unavailable source blocks H2 only, not repository work |

Quantitative claim handling does not need a new business decision: the approved brief already permits qualification or removal. Default to removing unsubstantiated percentages and undated aggregate counts rather than commissioning new evaluation runs.

## RACI, Risks, And Authority

- **Maintainer / PO:** accountable for requirements, claim approval, human acceptance, and any later external authority.
- **Orchestrator:** responsible for plan integration, file ownership, evidence reconciliation and cost-aware routing.
- **A/B/R1 implementers:** responsible for their owned repository changes after separately approved execution; no policy/model substitutions or external mutations. **Host integrator/runtime maintainer:** responsible for H1/H2 only within separately authorized host scope.
- **Integration verifier:** responsible for observing ACs and preserving partial-readiness boundaries.
- **Independent reviewer:** responsible for independent contract/claim review, not self-approval or release authorization.

Risks and glossary carry forward from the approved brief. Additional planning risks: runtime-default scouting can incur unjustified cost; mitigate by deterministic tools or explicitly eligible configured workers, not model-tier labels. A current registry snapshot may differ from the published package; mitigate with separate identities. Local static server headers can differ from the host/CDN; mitigate by AC-011, not assumptions.

No database/API/storage migration is introduced. The original SEO direction needs no separate SRS. The newly included host-control boundary requires a scoped technical design before H2 implementation, bound to the actual authorized host adapter source. Keep that design linked to this single plan; do not fake implementation in AGS files or claim host enforcement from skill prose.

## Status And Receipt

feature_status: partially_implemented
traceability_status: PASS — runtime-verified document links, trace task independently closed (parser `9e64168d…`; project CLI exit 0; 9 REQ / 33 AC; nine intentional warnings); whole-branch review pending
generation_adoption: APPLIED (attempt-2026-11-03T03-42-56-430Z-91f5fa; `receipt.json` status APPLIED, `adoption/proof.json` 18 historical proof entries; 19 files copied back including `.skills-lock.json`, 0 retired; follow-up `generate-indices --check` PASS with 2229 declared files and 0 copied — no per-file verified count claimed; non-metric authored metadata unchanged and intended `common` 2.9.4 / `flutter` 1.8.4 / `laravel` 1.4.2 / `react-native` 1.5.3 / `workflows` 2.1.1 preserved; no default machine/model/account policy change and no recovery override)
plan_approval: scoped_approved (repository Tasks 1–3 and runtime-source enforcement; full plan, H2 design, deployment, and paid evals pending)
execution_approval: scoped_granted (Maintainer authorized Subagent-Driven repository Tasks 1–3 and runtime-source enforcement; no system-prompt/global mapping changes, publishing, deployments, premium or paid eval runs authorized)
next_workflow: independent-review; implementation-readiness / design-solution for H2 after maintainer supplies authorized host source path

Historical planning status: Initial planning records noted `feature_status: requirements_ready`, `plan_approval: pending`, and `execution_approval: not_granted`. Historical run records: [20261102T200820Z-plan-feature.json](../../artifacts/runs/discoverability-readiness/20261102T200820Z-plan-feature.json) (combined 9 REQ / 33 AC trace) and [20261102T195113Z-plan-feature.json](../../artifacts/runs/discoverability-readiness/20261102T195113Z-plan-feature.json) (historical SEO-only). Present execution reflects scoped authority granted by the maintainer for Tasks 1–3 (SEO readiness, README/contracts, and portable routing/evaluations) and runtime-source enforcement.

Scope & sizing fences: All 9 REQ IDs (`REQ-001` through `REQ-009`) and all 33 AC IDs (`AC-001` through `AC-033`) are strictly preserved as canonically defined in this document. SNC high sizing, `model_tier: strong`, and `delivery_mode: extended` remain in force. Standalone H1 OMP model mapping was not selected, system prompt remains unchanged, and H2 host enforcement awaits an authorized OMP runtime source path and reviewed technical design. No full plan approval, deployment, publishing, or paid evaluation run has been granted.

### Current Progress and Gaps by Scope Area (2026-11-03)

| Scope Area / Track | Referenced Criteria | Status | Summary Evidence & Gaps |
| --- | --- | --- | --- |
| README & Entry Clarity | AC-001, AC-002 | PASS | Local marked GFM render in Chromium; opening purpose, intended developer, use case, and next action visible without SDLC acronyms; portable standards explained without claiming specification ownership. Landing copy is corrected and render-verified under AC-013, whose independent claim/render closure completed in the original 43-file package. |
| Metadata & Canonical Invariants | AC-003, AC-006 | PASS | Static build metadataBase and canonical `/` anchored to siteUrl; no localhost/preview leaks in production artifacts; OG PNG 1200x630 returns status 200 with `/og/agent-skills-standard.png` card metadata. |
| Indexing Decision Enforcement | AC-004 | PASS | All 6 isolated static build cases completed and verified (preview, prod HTTP, missing approved origin, and mismatched approved origin strictly emit `noindex, nofollow` and `Disallow: /`; matching approved production HTTPS emits `index, follow` and `Allow: /`; missing `SITE_URL` exits 1 with expected error). Local isolated artifact proof only; strictly separate from unapproved deployed state (no public origin claim). |
| Robots & Sitemap Behavior | AC-005 | PASS | Robots serves `Disallow: /` on non-indexing builds; sitemap omits unsupported `lastModified` to avoid fake freshness. |
| Resilience & Route Scenarios | AC-007, AC-008 | PASS | Smoke verified with JavaScript disabled at 375px and 1440px viewports; static root returns 200 and unknown path returns genuine 404; local HTTP server does not enforce `_headers` (no edge CSP claim). |
| Performance & Accessibility | AC-009, AC-010 | PASS | Accessibility clean (0 serious/critical axe findings; keyboard navigation intact across viewports). **Current** post-F1/post-generation 3-run mobile Lighthouse 13.6.0 audit PASS: median score 100, LCP 1055.0604 ms, CLS 0.0004523810058988496, 3/3 runs complete with consistency true (timestamp `2026-11-03T03:54:47.081Z`; 375×667 DPR 2, 150 ms RTT, 1638.4 Kbps down, 750 Kbps up, 4× CPU, Node v26.0.0; raw archive `evidence/lighthouse-summary-post-f1.json`; lab evidence only, no field INP). The prior run (100 / 1054.4064 ms / 0) is retained as history, not cherry-picked or reused as current. |
| Public Deployed Origin Inspection | AC-011 | UNVERIFIED | No approved public landing origin or read-only inspection authority; no deployment or search indexing performed. |
| Sourced Claims & Proof Traversal | AC-012, AC-014 | PASS | Skill counts reconciled against explicit release snapshot; universal savings claims removed or qualified; 5 proof links exist and resolve 200 on public develop raw destinations. |
| Landing Claim Integrity (review F1) | AC-013 | **PASS (claim/render closure complete)** | `content.ts` / `EvidenceSection.tsx` state baseline-with-skill **transcript-assertion pass rates**, explicitly "not executable task verification or guaranteed rule adherence"; unsupported isolated copy removed. Rendered card verified at 375/1440 with no overflow (`evidence-card-smoke.json`, PNGs); immutable evals pin `73422bdeff746281177d55ccb7d2169471eb475a` resolved; post-generation typecheck/lint/unit 50/6/build PASS; post-F1 E2E 78/78 retries 0; post-F1 Lighthouse 100 / 1055.0604 ms / 0.0004523810058988496. **Independent claim/render closure was completed in the original 43-file package**, not left pending. |
| Consumer Setup & Prerequisites | AC-015, AC-016 | PASS | Primary npm global install + `ags init`/`ags sync` recommended; npx secondary with verified isolated `--version` check (PASS 2.6.6); prerequisites distinguish consumer CLI from contributor/website Node requirements. |
| Consumer First-Use Verification | AC-017 | FAIL | Substeps pass (isolated npm install of published 2.6.6 PASS, isolated `ags init` PASS), but actual `ags sync` still fails. Root cause confirmed against the retained 2.6.6 executable: discovery reads the public repository's mutable **default branch** (`develop`), whose metadata advertises `common-v2.9.3` / `quality-engineering-v1.6.2` as if already published; `init` persists those pins without checking availability, and `sync` then refuses incomplete assembly. No repository-only prevention code was selected, no native assets or lock exist, and native use (AC-018/019) stays BLOCKED. See `consumer-root-cause.md` and `consumer-release-recovery.md`. |
| Generation & Host Export Parity | Slice I; `rootChecks.generation` | **APPLIED (bounded adoption)** | Attempt `2026-11-03T03-42-56-430Z-91f5fa`: 18 historical proof entries (14 declared host routing/workflow exports + 4 canonical index/metadata entries), 19 files copied back including `.skills-lock.json`, 0 retired. Follow-up `generate-indices --check` PASS (check-only, 2229 declared files, 0 copied; no per-file verified count claimed — `evidence/generation-check-receipt.json`). Independent non-metric comparison PASS (`evidence/generation-integrity.json`): authored metadata non-metric fields unchanged, intended `common` 2.9.4 / `flutter` 1.8.4 / `laravel` 1.4.2 / `react-native` 1.5.3 / `workflows` 2.1.1 preserved. The earlier ordinary run's refusal of 4 unowned outputs is retained as a historical event, not as evidence of only 4 proof entries. No account/model/policy change, publishing, deployment, or recovery override. |
| Native Host Loading & Real Task | AC-018, AC-019 | BLOCKED | Native host loading proof blocked behind failed sync and unassigned supported-host invocation; real-task scenario blocked behind failed sync and no authorized host invocation or paid model call; asset existence is not proof. |
| Questions, Support & Contribution | AC-020, AC-021 | PASS | Direct questions/support route points to GitHub issues (reader resolved); GitHub Discussions page exists with discussion #13, but exhibits logged-out dynamic loading errors on categories/filter; route existence confirmed without assuming response SLA or active posting. Contribution route points directly to `CONTRIBUTING.md`. |
| Repository Metadata & Readiness Reconciliation | AC-022, AC-023 | PASS | Repository About, homepage, and topics observed and concrete recommendations recorded in website notes (settings recommendations only, no account mutations, no invented origin). Readiness reconciled with explicit distinction among source, local, deployed, and adoption statuses; follow-on slices named. |
| Landing Interaction Regressions | AC-024 | PASS | Landing interaction contracts verified; final full run 78/78 Chromium tests passed with retries 0; no tests weakened. |
| Portable Routing Guidance & Dispatch Recovery | AC-025, AC-026 | SOURCE-READY / UNVERIFIED | Slice classification, evidence-first reuse, dispatch recovery, and unsupported argument handling codified in canonical routing skill; live held-out routing model evaluation NOT RUN (52 controls validate deterministic grader only, not live model routing decisions). |
| Fixed-Model Paired Evaluations | AC-027 | NOT RUN | No authorized fixed-model paired live evaluation; deterministic controls do not prove model effectiveness. |
| Trigger Matching & Grader Controls | AC-028 | PASS | 36 candidate SkillIndex trigger controls PASS after 5 aliases restored; 52 deterministic grader controls PASS. |
| Scoped OMP Mapping & Probe | AC-029, AC-030 | NOT SELECTED / NOT RUN | Standalone OMP agentModelOverrides mapping not selected by user authority; system prompt unchanged; no OMP mapping activated; bounded native probe not authorized. |
| Host Runtime Enforcement & Adapter Contract | AC-031, AC-032 | BLOCKED | Host-owned pre-request guard blocked; installed OMP is compiled binary; awaits maintainer-supplied runtime source path and reviewed design; task adapter contract scenario awaits host runtime source. |
| Combined Evidence & Delivery Reconciliation | AC-033 | PASS | Evidence and delivery boundaries reconciled in integration docs and PRD; no fake savings or never-again guarantee. |
| Traceability Audit (scoped) | Plan artifacts; REQ/AC identity grammar | **PASS (document links; trace task independently closed)** | Post-T4 project audit exit 0 at `2026-11-03T06:08:45.140Z` (`evidence/trace-project-post-t4.json` + receipt): `ok:true`, `document_links`, `execution_evidence:not_evaluated`, 9 REQ / 33 AC, nine intentional `unlinked-req` warnings, zero duplicate/orphan/malformed, parser `9e64168d…`, BRD hash unchanged. Focused 57/57 and independent real-CLI 29/29 PASS (T4 negative 0 REQ/0 AC; legacy positive 1 REQ/2 AC). Independent review of package `0203f2bb8324` closes T1–T4 plus the missing-target oracle with no open trace-implementation findings. Whole-branch review remains pending. |

### Consumer First-Use Verification Record (Published 2.6.6 vs Source)

- **Published Package Install (`npm install -g agent-skills-standard@latest`)**: **PASS**. Tested in temporary npm prefix resolving published version `2.6.6` under Node 26.0.0. Provisioning used npm cache; not fully filesystem-contained proof.
- **Isolated Initialization (`ags init`)**: **PASS**. Initialized sample Next.js/Codex configuration with public registry default; MCP explicitly disabled, scope disabled; no host integration enabled.
- **Package Synchronization (`ags sync`)**: **FAIL**. Actual `ags sync` with `HOME`/cache redirected into ignored fixture failed because selected `common-v2.9.3` and `quality-engineering-v1.6.2` could not be fetched. Both exact public Git ref API URLs returned HTTP 404.
- **Outcome**: No successful native assets or lock installed; sample repo remains `package.json` + `.skillsrc`. No native use proof (AC-018 and AC-019 remain blocked). No launch or SEO-ready guarantee, and no suggestion to drop capabilities, pin substitutes, or force unreleased refs without separate release scope.
- **Version Boundary**: README separates source target `2.7.0` from npm badge/CLI version and notes that source-only `ags skills` is absent in observed npm `2.6.6`.

### Release Preflight (C1) — NO-GO, preflight only

User authorized C1 three active historical-release preflight only; **no publication** occurred. C1 is the immutable base `8f356928d7edd0bdb1fe224414efbd6b9e8192ac`, kept separate from the current uncommitted diff; an earlier no-new-findings diff review does not certify the old C1 payload.

- **Manifests / binding**: three candidate scopes verified complete — `common` 280, `quality-engineering` 88, `specialists` 43 (411 payload files) plus `skills/metadata.json`; parent Git-blob binding of 412 files PASS and manifest path/digest PASS (`release-preflight-8f356928d/evidence/parent-manifest-integrity.json`).
- **Static source review**: full coverage 411/411; verdict **NO-GO** with **8 MAJOR, 2 MODERATE, 1 LOW**. Condensed categories: (a) distributed instructions require resources not shipped to consumers; (b) Appium preflight/permission-state contracts contradict declared readiness (Node floor, auto-grant/overlay templates); (c) an unqualified credential-bearing continuous-pentest template; (d) eval/golden/oracle integrity defects (unsupported release-confidence formula, reversed toggle precondition, malformed golden edges, presence-only visual oracle, client-render-as-authz-proof); (e) unsupported universal optimization/cost claims; (f) a sample modal whose focus trap is not implemented.
- **R1**: a separate MAJOR **NEEDS VALIDATION**; no Node 20 failure was observed.
- **Runtime qualification**: Node 20.x was not found in the checked host managers and the local Docker daemon was inactive, so the CI Node 20 job was not reproduced. Comparative runs: Node 26.0.0 for all three manifest sets (280/88/43), Node 22.22.3 for `common` only, with 8 tests executed on both runtimes — comparative evidence, not CI Node 20 qualification.
- **Pending maintainer disposition**: source disposition for the eight MAJOR, two MODERATE, one LOW and R1; exact Node 20 qualification; and a separate publication authorization. No tags, pushes, GitHub Releases, attestations, npm publishes, or global setting changes were made, and publishing these scopes would not by itself satisfy AC-017 or prove installed-skill usability.

### Repository Build, Validation & Evaluation Checks

- **CLI Source Build**: **PASS** (`pnpm build`).
- **Final Post-Alias Skills Validation**: **PASS** (`pnpm validate:all`: 339 skills, 0 fail, 60 description/readability warnings).
- **Scorer Calibration & Eval Suite**: **PASS** (`rtk pnpm test:evals`: 447 tests, 447 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo, exit 0 in 1.35 seconds). Includes 5 new routing calibration controls with 89 additional node test memberships over the prior 358-test baseline; actual permanent suite total is 447 tests (distinct from the 52 throwaway grader controls). Live held-out routing model evaluations (AC-025, AC-026) remain source-ready / unverified, and AC-027 remains not run.
- **Root post-T4 verification (current)**: **PASS** — full root `pnpm test` exit 0, started `2026-11-03T06:09:10.437Z`, completed `2026-11-03T06:12:12.696Z`; 1543 CLI tests / 71 files, 447 eval tests, 57 trace tests and the remaining root suites, with all six reviewed trace file hashes unchanged. Receipts: `evidence/root-post-t4.json`, `evidence/root-post-t4.stdout.log`, `evidence/root-post-t4.stderr.log`. Historical root passes (48-trace at `05:09:49.278Z`, 54-trace at `06:03:31.192Z`) are retained as pre-correction history.
- **Receipt ledger (current vs historical)**: Post-F1/post-generation **current**: website typecheck, lint, unit (50 tests / 6 files) and static build PASS (`evidence/website-post-generation.json`); full E2E **PASS 78/78, retries 0, exit 0** at `2026-11-03T03:52:18.772Z` (`evidence/browser-post-f1.json`, `evidence/runner-browser-post-f1.log`, source hashes); 3-run mobile Lighthouse **PASS** with median score 100, LCP 1055.0604 ms, CLS 0.0004523810058988496, 3/3 complete and consistency true (`evidence/lighthouse-summary-post-f1.json`, `2026-11-03T03:54:47.081Z`; lab only, no field INP). **Historical, retained as before-correction context only**: pre-F1 78/78 E2E, the earlier 72 pass/6 fail and 75 pass/3 fail runs, 447 eval-suite tests, 968 MCP tests + 4 skipped, and the earlier Lighthouse median 100 / LCP 1054.4064 ms / CLS 0 — none relabeled as current.
- **Raw runner evidence (workspace-readable)**: `evidence/runner-{root-test,registry-gates,source-build-validation,evals-final,browser-final,browser-before,browser-intermediate,browser-post-f1,trace-before,trace-after,website-post-generation}.log`, plus post-T4 `root-post-t4.{json,stdout.log,stderr.log}`. These are archived outputs for independent review, not new runs; `runner-trace-after.log` is the pre-repair snapshot, retained as dated history only.

### Unverified Items and Ownership Register

| Area | Relevant Scope / ACs | Accountable Owner | Consequence of Unverified Status |
| --- | --- | --- | --- |
| Production deployed origin & indexing | AC-011, REQ-002 | Maintainer / Release owner (@HoangNguyen0403) | No approved public origin or search console access; cannot claim live search visibility, canonical edge behavior, or header enforcement. |
| User adoption baseline | AC-023, REQ-005 | Product Manager / Maintainer (@HoangNguyen0403) | Baseline adoption remains unknown; GitHub stars and npm downloads do not prove developer activation or SEO efficacy. |
| Real-use walkthrough demo | Deferred slice, REQ-005 | Maintainer / PM | Deferred follow-on intake slice; no recorded demo video or developer walkthrough available for public proof. |
| Community distribution & outreach | Deferred slice, REQ-005 | Maintainer / PM | Deferred follow-on intake slice; no promotional outreach, external posts, or community channel announcements authorized. |
| Host runtime enforcement & adapter | H2, REQ-008, REQ-009, AC-031, AC-032 | Host runtime maintainer / Host owner | Installed OMP is a compiled binary; pre-spawn hook alone is not request/fallback enforcement; awaits authorized host source path and reviewed design. |
| Paired live model evaluations | AC-027, REQ-007 | Routing verifier / Maintainer | Deterministic grader/trigger controls pass, but live paired model evaluations were NOT RUN; empirical model effectiveness in live inference is unproven. |
| Native host loading & real-task verification | AC-018, AC-019, REQ-004 | Integration verifier / Maintainer | Blocked behind failed `ags sync` (missing remote Git refs) and lack of authorized host invocation; asset existence does not prove native rule application. |

## References

- [Approved brief, source-group ACs, scope and evidence](../brd/brd-discoverability-readiness.md)
- [Related interaction-polish PRD](prd-landing-page-interaction-polish.md) — reuse its approved setup/illustrative/visual decisions; its implementation approval does not transfer to this feature.
- [Deployment approval and verification runbook](../../website/docs/deployment.md)
- [Website scripts](../../website/package.json), [root scripts](../../package.json), [CLI aliases/dependencies](../../cli/package.json)
- [Existing mobile performance harness](../../website/scripts/performance.mjs)
- [Canonical outcome schema](../../scripts/outcome/schema.ts), [scoped outcome audit CLI](../../scripts/outcome/index.ts)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Canonical portable routing procedure](../../skills/common/common-task-complexity-routing/references/routing-table.md) and [existing routing evaluations](../../skills/common/common-task-complexity-routing/evals/evals.json)
- [Generated host capability evidence](../agent-capabilities.md) — no OMP sync/export support inferred
- Session runtime evidence: initial scout dispatch receipts and child session_init/model_change records; role smol, resolved Codex Sol medium; inspected OMP modelRoles and empty agentModelOverrides.
- Runtime reference consulted: OMP task-agent-discovery.md (agent-model precedence, native configuration roots and pre-spawn hook) and tools/task.md (seance-only model argument). These are host documentation references, not AGS-owned source files.

## Next Workflow

Approve the combined PRD, then run **implementation-readiness** for A/B/R1 and prepare **design-solution** for H2 only when the actual host source and authority are available. Settle Subagent-Driven execution separately before fan-out. H1 configuration, its native probe, H2 guard activation, production inspection/deployment, public outreach, package publishing and paid evaluations retain their explicit scoped gates.

## Cost Report

`get_session_cost(workflow="plan-feature")` is requested at final handoff. Exact token billing and total session cost are unavailable. Two unnecessary planning scouts were cancelled after the operator challenged their cost; no successful findings or verification results are attributed to those cancelled tasks. A prior discovery scout's explicitly selected model was rejected by the task adapter; retrying with an unspecified runtime default was a routing error, not evidence that an eligible cheap profile was exhausted. No routing-policy edits or premium approvals were made.

## Selected Implementation Authority And Task Contracts

The maintainer selected Subagent-Driven execution, requested implementation of routing guidance/evaluations and runtime enforcement, then explicitly added SEO improvements. This authorizes repository Tasks 1–3 below. System-prompt edits and standalone OMP model mapping are not selected. Host-control activation, deployment, publishing, premium spend and unrelated account changes remain unauthorized. H2 source/design prerequisites are unresolved; reachable repository work proceeds without inventing runtime source.

### Task 1 — README clarity and credible entry journey

**Scope:** README.md and directly conflicting consumer/contributor prerequisites in CONTRIBUTING.md only.
**Inputs:** Approved SEO brief; REQ-001,003,004,005; current proof reports and CLI package/runtime evidence.
**Outputs:** Clear rendered newcomer hierarchy, reconciled/qualified claims, existing valid proof links, npm/ags primary setup with npx alternative and direct participation routes.
**Real Ingress:** Developer opens GitHub README and follows setup, proof, questions or contribution links.
**Invariants:** Preserve actual supported behavior and detailed reference material.
- Positive: distinguish installation, actual skill loading and task outcome.
- Negative: no invented percentages, registry totals, recording, published landing origin, CLI behavior changes or generated-file edits.
**Verification Owner:** Orchestrator after all owners freeze; worker reports exact proposed focused scenarios without mid-flight tests/build/lint/formatters.
**Handoff / freeze:** Return final owned-file report and stop editing; no commits.
**Correction Route:** One concrete criterion-based follow-up; missing evidence is not provider exhaustion.

### Task 2 — Landing SEO source and consumer contracts

**Scope:** website source, tests and existing website notes/deployment runbook only; no README.md, registry or host settings.
**Inputs:** REQ-001–005; AC-002–010,012–016,020,021,024; preserve PR285 interaction contract.
**Outputs:** Minimal confirmed SEO/content repairs, useful metadata/indexing boundary coverage and honest source/local/production verification notes.
**Real Ingress:** Static-export HTML/robots/sitemap/social assets and actual no-JavaScript/mobile browser journey.
**Invariants:** Preserve static architecture, approved indexing predicate and bounded accessible motion.
- Positive: previews/local builds remain non-indexable, canonical/social/sitemap origins agree.
- Negative: no fabricated sitemap freshness, production pass, redesign, analytics or external activation.
**Verification Owner:** Orchestrator after all owners freeze; worker adds only fault-catching tests and reports verification entrypoints without running tests/build/lint/formatters mid-flight.
**Handoff / freeze:** Return final owned-file report and stop editing; no commits.
**Correction Route:** Return material scope/design questions to orchestrator; do not suppress or weaken existing tests.

### Task 3 — Routing discipline and regression evaluations

**Scope:** Canonical common-task-complexity-routing skill/reference/evals; confirmed canonical brainstorm/plan workflow references; targeted overbroad Flutter/Laravel/React Native trigger metadata/evals; skills/metadata.json version/date maintenance for those changes only.
**Inputs:** REQ-006,007,009; AC-025–028; observed role/profile confusion, rejected model argument and quota-recovery evidence.
**Outputs:** Slice-level adequacy decisions, existing-evidence reuse, actual route verification, no unchecked fallback after invalid arguments, authorized quota fallback behavior, and positive/negative regression cases using existing evaluation machinery.
**Real Ingress:** Matched routing skill served to the agent; canonical keyword router and existing evaluation scorer.
**Invariants:** Preserve explicit host profiles and account restrictions; mechanism/evidence must decide behavior, not bare output keywords.
- Positive: legitimate ambiguous analysis can use an eligible stronger model; factual quota exhaustion can advance an authorized route.
- Negative: no system-prompt edits, automatic host settings, premium bypass, always-cheapest rule, new telemetry store or generated-mirror hand edits.
**Verification Owner:** Orchestrator after source freeze; worker records intended commands/cases and original RED as NOT RUN if no behavioral baseline was exercised.
**Handoff / freeze:** Return final changed-file/report receipt; no tests/build/lint/formatters/generation/commits mid-flight.
**Correction Route:** Return material policy decisions; defective output gets one concrete correction, not automatic model escalation.
