# Human Review Brief / PRD: Product-Evidence SDLC

**Status:** scope/requirements, subagent-driven execution and reviewed t01-v2 H1 approved by the conversation operator; implementation/verification T02–T09 authorized. **Slug:** product-evidence-sdlc. **Owner:** conversation operator as human sponsor/approver; orchestration and integration owned by the coordinating agent. **Risk:** high; cross-cutting standards and investment-authority boundaries. **H1 evidence:** `.superpowers/sdd/2026-10-11-product-evidence-sdlc/H1-approval.md` binds exact reviewed fingerprints; H2/H3 remain pending.

**Read this first.** This is the short What/approval view. [Research and rationale](../brd/brd-product-evidence-sdlc.md) explain why; the [delegation plan](../superpowers/plans/2026-10-11-product-evidence-sdlc.md) contains task briefs, profile settings, dependencies, ownership, and verification.

## 1. What changes for a Product Owner

A product initiative must be able to answer: **What problem is real? Why this investment? What evidence would disprove it? Did the shipped change deliver value?**

Preserve the existing Why → What → How → delivery chain. Add conditional discovery, validation, and value-review workflows; one shared evidence contract; and seven opt-in product-management methods. Known work reuses current evidence; incidents and approved maintenance do not wait for market research.

The PO remains accountable for value and backlog decisions. Agents assist; neither an agent nor a document becomes an unquestionable factual authority. Human investment, customer-exposure, release, and retirement permissions remain separate.

**Not included:** replacing Jira/analytics, bulk importing skill catalogs, autonomous purchases/deployments, or guaranteeing ROI. Restricted upstream content is not imported. Publication and default installation are separate decisions.

## 2. Human decisions — review these four gates

| Gate | What the human decides | What it authorizes | What it does not authorize |
| --- | --- | --- | --- |
| H0 — Scope and account | Accept this direction; confirm project/account eligibility, named owners, and delegated execution preference | Preflight and a bounded design/provenance assignment | Implementation, live eval spending, or customer access |
| H1 — Contract | Accept the evidence schema, authority/freshness rules, financial semantics, resource packaging, and scoped worker briefs | Named implementation tasks against the approved contract | Budget increases, production exposure, or publication |
| H2 — Evaluation | Accept the immutable eval plan, eligible model/account, case count, concurrency, and resource cap | The named live-evaluation run | New providers, premium consultation, or further billable attempts beyond the cap |
| H3 — Adoption | Accept review evidence and pilot scope; later accept pilot results for publication/default adoption | Only the recorded pilot or publication action | Automatic customer contact, spend, launch, or product retirement |

Each approval records identity, scope, date, and artifact revision. Agents cannot supply human approval. The operator approved subagent-driven implementation, the Personal plus Gemini cheap account route, and the independently reviewed t01-v2 contract for T02–T09. Live eval spending, real pilot and publication still require their separate scoped gates; registry implementation is not product investment/customer-exposure authority.

## 3. Profile routing proposed from the configured profiles

| Work | Named profile | Condition |
| --- | --- | --- |
| Design, requirements, independent review | `Personal · Analysis & Review` | Project/account eligibility confirmed; document output only when explicitly permitted |
| Implementation, tests, executable verification | `Personal - Cheap` first choice | Operator selected **Personal plus Gemini cheap**, explicitly authorizing its configured Gemini route and overriding the conflicting Codex-only profile note for this task |
| Delivery when cheap route is ineligible/exhausted or fails its corrective attempt | `Personal · Delivery` | Personal project/account eligibility confirmed; no silent model changes |
| Consequential unresolved advisory question | `Personal · Premium Advisor` | Never routine; separately approved, bounded, analysis-only consultation |

The operator authorized this repository for Personal Codex analysis/review/delivery and the configured Gemini cheap implementation pool. No EZRX/VMO profile is selected. Full profile/model/settings snapshots are in the delegation plan; this task-specific authorization does not change profile configuration or grant access to private customer/employer data.

## 4. Requirements and ownership

All requirements are **P0, scope accepted**; completion remains unverified. These are behavioral requirements, not technical-contract or sensitive-action approval records. Humans may combine roles; worker ownership must remain disjoint.

| Requirement | What the consumer must get | Accountable role | Objective |
| --- | --- | --- | --- |
| REQ-001 | Inspectable evidence, original-source provenance, freshness, revision-bound authority, and requirement links | Product/research owner | BRD-OBJ-001 |
| REQ-002 | Decision-led market, customer, strategy, and roadmap methods without fabricated findings | Product owner | BRD-OBJ-001 |
| REQ-003 | Reproducible investment scenarios distinguishing net ROI, benefit/cost, payback, and timing-sensitive value | Finance/product owner | BRD-OBJ-002 |
| REQ-004 | Bounded hypothesis validation with explicit authorization and negative/inconclusive outcomes | Product/design/engineering owners | BRD-OBJ-002 |
| REQ-005 | Measurement before rollout and separate post-release product-value status | Product/analytics owner | BRD-OBJ-003 |
| REQ-006 | Connected routing that preserves current delivery, incidents, maintenance, and valid prior decisions | Engineering owner | BRD-OBJ-002 |
| REQ-007 | Optional package works through real CLI/MCP/native surfaces with usable shipped resources and precise missing-capability behavior | Registry engineering owner | BRD-OBJ-001 |
| REQ-008 | Independent behavioral, executable, and blinded efficacy evidence; no manufactured pass claims | QA/evaluation owner | BRD-OBJ-001 |
| REQ-009 | Eligible profiles, one implementation owner per component, independent review, and human gates | Orchestrator/human sponsor | BRD-OBJ-002 |
| REQ-010 | Reviewable documentation, controlled pilot, publication preparation, and rollback | Product/release owner | BRD-OBJ-003 |

## 5. Personas and user stories

- **US-001 → REQ-001/002:** As a Product Owner, I want claims and opportunity recommendations linked to inspectable evidence so that I can challenge the investment rationale.
- **US-002 → REQ-003/004:** As a budget holder, I want comparable scenarios and bounded validation so that uncertain bets cannot silently consume a full-build budget.
- **US-003 → REQ-005/006:** As an analytics/product owner, I want agreed metrics and value reviews so that shipping is not mistaken for success.
- **US-004 → REQ-007/008:** As a registry consumer/maintainer, I want optional capabilities that actually load and execute so that workflows have no hidden monorepo dependency.
- **US-005 → REQ-009/010:** As a human sponsor, I want bounded agent assignments and approval gates so that I can inspect progress without reading every implementation detail.

These stories are independently reviewable value statements. The delegation plan splits their implementation into testable components and maps every acceptance criterion to an owner task.

## 6. Acceptance criteria — the reviewer's checklist

| AC | Requirement | Given / When / Then |
| --- | --- | --- |
| AC-001 | REQ-001 | Given a critical claim, when a decision consumes it, then its source, relevant scope/time, owner, uncertainty, and counterevidence are inspectable. |
| AC-002 | REQ-001 | Given a stale/disputed claim or changed approved revision, when full-build readiness is assessed, then the affected decision is flagged and cannot silently authorize the action. |
| AC-003 | REQ-002 | Given incomplete customer/market inputs, when research runs, then unobserved facts remain unknown and substitutes plus sampling limits are considered. |
| AC-004 | REQ-002 | Given competing opportunities, when roadmap order changes, then rationale, dependencies, capacity, and displaced work are recorded without equating a score to ROI. |
| AC-005 | REQ-003 | Given benefit 150000 and cost 100000 in one accounting boundary, when evaluated, then net value is 50000, ROI is 50%, and benefit/cost is 1.5. |
| AC-006 | REQ-003 | Given zero/unknown costs, incompatible units, duplicate benefits, or cash flows that never break even, when evaluated, then undefined/unavailable/rejected results are explicit rather than invented or infinite. |
| AC-007 | REQ-004 | Given a hypothesis but no experiment authorization, when validation is requested, then the output is proposal-only and no spend, outreach, or exposure occurs. |
| AC-008 | REQ-004 | Given negative or inconclusive results, when routed, then no unconditional full-build recommendation is emitted. |
| AC-009 | REQ-005 | Given an intended rollout, when release readiness is assessed, then a measurement contract, baseline evidence or explicit scoped exception, owner, and review trigger are recorded. |
| AC-010 | REQ-005 | Given a released change and insufficient/confounded value evidence, when reviewed, then delivery remains released and product value is separately inconclusive without causal or financial success claims. |
| AC-011 | REQ-006 | Given current approved evidence, when routed, then only invalidated gaps reopen; low-risk maintenance retains its direct route. |
| AC-012 | REQ-006 | Given active production harm, when routed, then incident handling takes precedence over product discovery. |
| AC-013 | REQ-007 | Given a fresh consumer with the opt-in package, when synced and invoked, then skills, references, and executable resources are available through native surfaces. |
| AC-014 | REQ-007 | Given an absent optional package/tool or ordinary unrelated markdown, when routed, then the precise capability gap is reported or unrelated product skills do not activate. |
| AC-015 | REQ-008 | Given the integrated candidate, when verified, then observed runtime outcomes and independent review support the claims; mocks, structural checks, and reviewer-name strings do not substitute. |
| AC-016 | REQ-008 | Given a live efficacy run, when scored/promoted, then models/tools/inputs are pinned, arms are isolated/blinded, source hashes match, and applicable registry thresholds are satisfied. |
| AC-017 | REQ-009 | Given a task dispatch, when launched, then project/account eligibility, exact profile settings, permitted files, dependencies, verification, and no-subagent constraints are included. |
| AC-018 | REQ-009 | Given shared-file overlap, profile contradiction, premium request, or consequential unresolved disagreement, when encountered, then the owner/gate resolves it before dependent action; no account/model/authority bypass. |
| AC-019 | REQ-010 | Given a human review, when deciding, then the brief exposes scope, profiles, dependencies, gates, evidence, risks, and implementation/pilot status separately. |
| AC-020 | REQ-010 | Given a candidate ready for adoption, when published or piloted, then the corresponding human authority, pinned evidence, documentation, review owners, and rollback are present. |

## 7. Defaults, open decisions, and guardrails

**Defaults proposed:** three new workflows; seven opt-in PM skills plus one shared common contract; no mandatory connector; no new daily CLI command; keep Outcome Report schema v1; no automatic default installation. Native consumer tools must not depend on repository-only scripts.

**Design decisions delegated to the bounded contract task:** exact ledger schema and error semantics, cross-layer bridge, resource runtime/packaging, scenario units and precision, and optional-category routing. The human accepts the written result at H1 before implementation briefs are released.

**Execution preflight:** account route and subagent-driven method authorized; existing isolated worktree confirmed; locked dependencies installed; outcome/trace compatibility baselines passed. The conversation operator remains the human sponsor/approver. T01 technical contract and independent review are in progress; H1 approval is required before implementation dispatch.

**Pilot prerequisites:** nominated product/PO, authorized evidence and customer access, real baseline, observation windows, finance/analytics owners, and any experiment budget. Missing pilot data does not block independent registry implementation after H1, but it blocks claims of product impact or broader adoption.

**Guardrails:** no customer/employer secrets in reusable packages; no speculative ROI; no autonomous approval; no new provider or premium spend; no unsupported validation-state upgrade; preserve existing installation ownership/custom overrides and deterministic audit behavior.

## 8. Success and rollout

Carry forward the three BRD pilot objectives: trace all critical investment claims; record scoped validation/risk acceptance before commitment; define measurement before rollout and conduct the first eligible value review. The proposed six-week decision pilot starts only when humans accept its scope. Financial return remains unknown until eligible observations and actual costs exist.

Track handoff failures, rework, research/agent costs when available, instrumentation quality, learning decisions, and actual outcomes separately. Do not invent currency estimates from model names, MCP counts, or hypothetical avoided spending.

Implementation → independent verification/evals → human-controlled pilot → separate publication/default-adoption decision. Prepare rollback to the previous pinned category/workflow revisions; do not push, publish, or activate by default.

## 9. Review action and document authority

- [x] Scope/requirements and subagent-driven method accepted by the conversation operator.
- [x] Personal Codex analysis/review/delivery and configured Gemini cheap implementation authorized for this repository.
- [x] Cheap-profile conflicting Codex-only note overridden for this task by the explicit **Personal plus Gemini cheap** selection; profile configuration unchanged.
- [x] Preflight completed and bounded T01 design worker dispatched.
- [x] Reviewed exact technical t01-v2 and obtained genuine human H1 bound in H1-approval.md; live evals, pilot and publication remain separately gated.

Authority order: approved business brief → this approved PRD → approved technical contract → scoped task brief. Research findings remain independently contestable. A request to draft these files does not mark any approval checkbox complete.

**Change log:** H1/account/method remain approved. T02 stable correctedreportbafaa0ce.../12-sourcecapture retained; T03 settled27-sourcecandidate retained. T04 independent3Major and T05 independent4Major fixes remain. Old recentactors permanentlyclosed after repeated hostENOSPC;48Gi currentheadroom observed, fresh sameeligibleprofile T02/T03 reviewers and T04/T05 remainingONEcorrectionowners launched, sourcecap2. No source acceptance/common consumer permission, evidence/journal deletion or persistence-rootcause claim. T06–T09/H2/H3/premium/commits/publication gates unchanged.
