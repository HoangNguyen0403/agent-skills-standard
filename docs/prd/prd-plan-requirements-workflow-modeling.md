# Requirements Workflow Modeling — Review and Delegation Plan

Status: Scope, delegated execution, worker-account route and split G1 source-contract milestone approved by maintainer on 2026-10-11. T0 source contract READY; T1 dispatch authorized. Pilot correction/freeze, G2 spend and final acceptance remain separately gated.

- Slug: `requirements-workflow-modeling`.
- Owner/approver: requesting repository maintainer; approval recorded in this conversation.
- Source revision: `b529c2d99112db2af63aa2c32365a37759613cc6`; local source changes must be reconciled before launch.
- Repository: `HoangNguyen0403/agent-skills-standard`; authorized planning surface: the current `sour-ferret` worktree.
- Profile: technical; lane: direction. Proposed implementation SNC: S=2, N=1, C=2, total=5, tier=high (inference: shared lifecycle guidance).
- Scope of this approval request: source-level workflow/skill improvement and bounded verification. No merge, release, deployment, profile-policy changes, or premium calls.

## 1. Human Review — Start Here

**Decision:** Improve completeness and diagram selection inside the existing Why → What → How workflow. Reuse existing UML-style sequence/state diagrams and editable draw.io support; do not build another diagramming system.

**Deliverable:** Consistent requirement skills, one shared modeling reference, updated lifecycle handoffs, synced native exports, semantic pilot evidence, and an independently reviewed change.

**Why:** Current skills conflict on questions, assumptions, AC granularity, and blockers. Existing evaluations largely check text, not omitted capabilities or contradictory flows.

### Approval checklist

- [x] Scope: align existing skills and add scope/scenario completeness checks; no new workflow or standalone skill.
- [x] Diagram policy: select views by the question; never require UML for every ticket.
- [x] Preserve low-risk approved-ticket shortcuts, sensitive-change approval floors, and PARTIAL slice boundaries.
- [x] Confirm this repository is authorized for Personal account profiles; remote ownership is evidence, not account authorization.
- [x] Resolve `Personal - Cheap` profile-note conflict or approve an eligible standard delivery route.
- [x] Select Subagent-Driven execution (recommended), or explicitly authorize an inline exception.
- [ ] Approve the frozen pilot cases/rubric before any generation; approve paid run counts/model separately at G2.
- [ ] Reserve final acceptance and merge/release authority for the human maintainer.

**Approval wording:** “Approve plan revision 1 for Subagent-Driven source implementation; this project is authorized for Personal profiles; use [eligible delivery route].” This does not authorize paid evaluation execution, premium advice, merge, or release.

**Execution state:** Planning is complete when this document is reviewed. No worker may start implementation until G0 is satisfied. No evaluation-generation worker may start until G2 is satisfied.

## 2. Evidence and Scope

### Confirmed repository facts

- `.agents/workflows/brainstorm-feature.md`: sized Why/Direction brief, evidence ledger, assumptions, approval.
- `.agents/workflows/plan-feature.md`: product scope, `REQ-*`/`AC-*`, use cases, owners, provisional delivery slices.
- `.agents/workflows/design-solution.md`: contracts, normal/alternate/exception behavior, selected diagrams rather than mandatory diagrams.
- `.agents/workflows/implementation-readiness.md`: equivalent approved evidence and READY/BLOCKED/PARTIAL per slice.
- `skills/common/common-architecture-diagramming/references/diagram-selection.md`: context/container/component/deployment/dataflow/sequence/state/ERD; business flowcharts use Mermaid. No dedicated activity/BPMN/decomposition renderer type.
- `skills/common/common-product-requirements/SKILL.md`: 3–5 questions, `TBD`, and “No Assumptions” conflict with newer decision-discipline guidance.
- `skills/quality-engineering/quality-engineering-business-analysis/SKILL.md`: blanket undefined-state blockers and condition-count wording need risk/behavior-based alignment.
- `evals-report.md` and frozen `benchmarks/evals/runs/all-v2.6.0/inputs.json`: historical textual evidence, not proof of semantic completeness. `artifacts/sdlc-metrics.md`: one task-listed slug is insufficient for an efficacy claim.

### Business objective seed

- **Objective ID**: BRD-OBJ-001 — discover missing or conflicting requirements before implementation without adding unnecessary ceremonies. Owner: maintainer; status: proposed.
- Proposed SMART metric: in the ten-case pilot, detect all seeded safety-critical gaps and at least 90% of other seeded gaps; no unsafe readiness decisions or unnecessary intake restarts. Compare preparation time and missed gaps against the aligned baseline, targeting ≤15% median time overhead and ≥30% fewer missed gaps. These are targets, not measured results.
- Domain validation owner: human BA/domain reviewer nominated by the maintainer. Independent technical/QE review: eligible Analysis & Review profile, separate from implementers.

### In scope

- Consistent questioning, assumptions, requirement atomicity, NFR verification, and slice-local blocking.
- A compact scope inventory/decomposition, rules/examples/questions, selected behavior views, completeness review, and change-impact guidance.
- Existing workflow integration, package/reference delivery, native export sync, docs, changelog, and semantic evaluation.

### Out of scope

- New UML/BPMN renderer types, diagram editor, arbitrary draw.io round-trip editing, or renderer refactoring.
- New `ags` daily-command runtime, orchestration engine, profile edits, routing-engine fixes, or broad catalog cleanup.
- Mandatory separate BRD/PRD/SRS files for sufficiently specified low-risk work.
- Production changes, real lending/auth implementations, employer/client data, release tags, publication, or full-catalog model runs.
- Promotion of a new standalone modeling skill without separate evidence and approval.

## 3. Shared Contract — Frozen Before Delegation

1. **Outcome first:** keep the business Why solution-free; keep product behavior separate from selected technical design choices.
2. **Question discipline:** draft from available evidence, ask at most three consequential questions per round, never re-ask settled facts. `common-decision-discipline` owns this policy.
3. **Unknowns:** use confirmed evidence, explicit non-critical assumptions, and unresolved blocking decisions. A blocker names the affected slice, consequence, owner, and required input; no unowned `TBD` at handoff.
4. **Scope map:** use verb–object capability names; classify leaves as in scope/deferred/excluded. Stop decomposition when actor, trigger, intended result, important rules/exceptions, scope boundary, and verification are clear enough to estimate and assign.
5. **Relationships:** one containment parent per scope-tree node; shared rules and functions may be referenced from multiple flows. Do not duplicate their canonical definitions.
6. **Behavior:** one observable behavior per AC, with as many necessary preconditions as that behavior requires. Use truth tables for interacting conditions; never split solely on the word `And`.
7. **Views:** scope tree = included functions; process flow = responsibilities/order; decision table = rules; state = lifecycle; sequence = participant interaction; delivery graph = work prerequisites. Do not substitute one for another.
8. **Evidence:** diagrams do not prove completeness. Use numeric NFR thresholds where appropriate and verifiable categorical invariants where appropriate; never fabricate numbers.
9. **Readiness:** retain equivalent approved evidence and sensitive-change floors. PARTIAL sends only explicitly ready slices downstream. Delivery prerequisites must be schedulable; legitimate business/state loops are not delivery dependencies.
10. **Change impact:** carry existing objective/REQ/AC/SRS IDs; review affected contracts, ACs, approvals and evidence when requirements change. Avoid new mandatory ID families or a second requirement database.
11. **Package ownership:** shared modeling guidance lives at `skills/common/common-product-requirements/references/requirements-modeling.md`. Product planning loads that package explicitly; other requirement skills link to its guidance without duplicating it. Narrowly excluded product packages must be reported as unavailable, not silently replaced with guessed guidance.
12. **Portability:** canonical skill/workflow sources contain no profile names, account routes, machine paths, or provider-specific execution recipes. This plan is the host-specific delegation layer.

## 4. Requirements and Acceptance

All requirements are Draft, linked to `BRD-OBJ-001`; owner is the maintainer with the assigned task worker responsible for delivery.

| Requirement | Outcome                                                                                          | Priority | Delivery task | Objective   |
| ----------- | ------------------------------------------------------------------------------------------------ | -------- | ------------- | ----------- |
| REQ-001     | Existing requirement guidance has one consistent decision/unknown/atomicity policy.              | P0       | T1            | BRD-OBJ-001 |
| REQ-002     | Substantial discovery produces a scope/scenario model and finds missing coverage.                | P0       | T2            | BRD-OBJ-001 |
| REQ-003     | Existing diagrams are selected by question and linked to requirement behavior.                   | P1       | T2, T3        | BRD-OBJ-001 |
| REQ-004     | Handoffs preserve authority, risk floors, ready slices, and change impact.                       | P0       | T3            | BRD-OBJ-001 |
| REQ-005     | Delivered packages and native workflow exports contain the approved guidance.                    | P0       | T4            | BRD-OBJ-001 |
| REQ-006     | Semantic evidence compares current/aligned/candidate behavior without coaching or score editing. | P0       | T5            | BRD-OBJ-001 |
| REQ-007     | Humans can inspect tasks, evidence, remaining risk, and approval boundaries.                     | P0       | T0, T6        | BRD-OBJ-001 |

### Acceptance scenarios

- **AC ID**: AC-001 → REQ-001: Given existing approved decisions, when requirement planning continues, it carries them forward rather than restarting intake or asking a conflicting question count.
- **AC ID**: AC-002 → REQ-001: Given one behavior with multiple preconditions and a non-critical unknown, when the AC is refined, it remains one testable behavior and records the assumption; a consequential unknown blocks only its affected slices.
- **AC ID**: AC-003 → REQ-002: Given a lending scope missing overdue handling, when scope completeness is reviewed, the gap is raised for an explicit in-scope/deferred/excluded decision; it is not silently implemented or silently omitted.
- **AC ID**: AC-004 → REQ-002: Given customer verification referenced by intake and disbursement, when the model is created, one canonical function/rule is referenced from both flows without contradictory duplicate definitions.
- **AC ID**: AC-005 → REQ-003: Given an OTP error followed by apparent success, when behavior is reviewed, success and failure outcomes are clarified before readiness; no expiry/PIN/API policy is invented.
- **AC ID**: AC-006 → REQ-003: Given a scope/order/lifecycle/interaction question, when a view is selected, its stated purpose matches that question; diagrams remain optional when prose/tables answer it precisely.
- **AC ID**: AC-007 → REQ-004: Given approved low-risk ticket evidence without BRD/PRD/SRS filenames, when readiness is assessed, it may be READY without unnecessary document creation.
- **AC ID**: AC-008 → REQ-004: Given one ready slice and one blocked environment/permission-dependent slice, when handoff occurs, only the ready slice is authorized; sensitive changes still require the applicable design/human gate.
- **AC ID**: AC-009 → REQ-004: Given a changed requirement, when impact is reviewed, affected ACs/contracts/approvals/evidence are identified; unrelated settled decisions are not reopened.
- **AC ID**: AC-010 → REQ-005: Given the frozen candidate package, when native exports are generated and consumed, the shared reference is accessible and selected workflow guidance is exercised; a sync-success line alone is insufficient.
- **AC ID**: AC-011 → REQ-006: Given identical case inputs and pinned model/settings across isolated arms, when graded against the pre-approved rubric, each finding cites output evidence; historical results and failed cases remain intact.
- **AC ID**: AC-012 → REQ-007: Given worker reports and the final candidate, when a human reviews, each AC has evidence or an explicit gap and no agent review is recorded as human approval.

## 5. Profile Routing and Launch Gates

Profiles were discovered from the configured host; their eligibility must be confirmed before launch. Do not infer permission from the orchestrator's provider or the GitHub remote.

| Role                                           | Exact profile                  | Provider/model                            | Settings                        | Restrictions                                                                                                |
| ---------------------------------------------- | ------------------------------ | ----------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Routine implementation                         | `Personal - Cheap`             | `omp/google-antigravity/gemini-3.8-flash` | mode `write`, thinking `medium` | Conditional first choice; execute the fixed brief, no design decisions.                                     |
| Standard delivery fallback                     | `Personal · Delivery`          | `omp/openai-codex/gpt-6-luna`             | mode `write`, thinking `high`   | Only after Personal project eligibility is established.                                                     |
| Plan review, semantic assessment, final review | `Personal · Analysis & Review` | `omp/openai-codex/gpt-6.1-sol`            | mode `write`, thinking `high`   | Separate read-only review session; artifact writes only when explicitly authorized in the evaluation brief. |
| Premium advice                                 | `Personal · Premium Advisor`   | `omp/openai-codex/gpt-6-astra`            | mode `write`, thinking `high`   | Not assigned. One analysis-only consultation requires a separate qualifying human approval.                 |

**Observed conflict:** `Personal - Cheap` selects Google Antigravity but its notes also say “Must remain on Personal Codex route.” Do not silently discard that restriction or edit the profile to make it eligible. G0 must clarify its intended authorized route. If it is ineligible and the Personal standard delivery profile is eligible, use that standard route; otherwise block dispatch.

- Copy discovered `provider/model`, `modeId`, `thinkingOptionId`, and any present `featureValues` exactly into `create_agent`; no guessed features or model substitutions.
- Set `notifyOnFinish: true`; workers cannot delegate or spawn agents. Use native OMP tasks only for permitted short read-only lookups, never to bypass profile rules.
- Confirm account/domain before sending repository content. Employer profiles are not fallback routes for this plan.
- Exhaustion requires an observed quota/rate/usage/429/resource/model-unavailable failure. Then use the eligible standard fallback for remaining delivery slices; do not retry an exhausted cheap route.
- Incomplete output: one corrective follow-up naming failed ACs; if still defective, escalate that slice to eligible standard delivery. Access/permission failures require resolution, not account hopping.

### Gates

- **G0 — Launch authorization:** human approves this plan revision, execution approach, project/account eligibility, and eligible delivery route. Read-only agent reviews also require eligible profiles; no review is launched merely because this plan lists it.
- **G1 — Split contract/rubric milestones (human-approved amendment):** after T0, human approves the source contract before T1. Corrected complete pilot inputs/rubric are independently reviewed and separately frozen by the human before G2; source implementation need not wait for pilot freeze. Preserve all acceptance targets and identify frozen A/B/C snapshots before generation.
- **G2 — Evaluation spend:** human accepts exact skill/case/arm counts, source snapshots, model/effort, concurrency, and resource ceiling. Default proposed task-pilot ceiling: 30 generation sessions (10 cases × 3 arms), one independent grading session, and one aggregate review session; no automatic reruns. Canonical skill-eval counts are separate and must be included explicitly in the approved ceiling.
- **G3 — Acceptance:** independent review plus complete AC evidence; human decides source acceptance/merge. Publication and consumer activation require separate scope and authority.

## 6. Task Map and Execution Waves

Estimates are relative effort, not promised delivery dates: XS=1, S=2, M=3, L=5 points. Total initial plan: 21 points, medium confidence. Live evaluation volume and review/fix effort remain separately metered; any scope increase requires replanning, not hidden expansion.

| Task                                   | Owner profile role                                       | Depends on                   | Size  | Exclusive ownership/output                                                     |
| -------------------------------------- | -------------------------------------------------------- | ---------------------------- | ----- | ------------------------------------------------------------------------------ |
| T0 Review plan and pilot contract      | Analysis & Review                                        | G0 eligibility               | S / 2 | Findings only; no implementation edits.                                        |
| T1 Align existing requirement policies | Delivery                                                 | G1 source-contract milestone | M / 3 | Four requirement/BA skill packages and their existing eval definitions.        |
| T2 Add modeling guidance               | Delivery                                                 | T1 snapshot B                | M / 3 | Product-requirements package additions/refinement after T1 ownership transfer. |
| T3 Integrate lifecycle handoffs        | Delivery                                                 | T1; fixed shared contract    | M / 3 | Five canonical lifecycle workflow files; no generated mirrors.                 |
| T4 Integrate, sync, document           | Delivery integration owner                               | T2, T3 reviewed              | M / 3 | Native exports, metadata, docs/changelog, frozen source candidate.             |
| T5 Verify and evaluate candidate       | Analysis & Review; orchestrator runs deterministic gates | T4; G2 for generation        | L / 5 | Immutable evaluation outputs, rubric grading, smoke evidence; no source edits. |
| T6 Independent final review            | Fresh Analysis & Review session                          | T5                           | S / 2 | AC/review matrix and human acceptance packet.                                  |

**Waves:** T0 → human G1 source contract → T1/freeze B → T2 and T3 concurrently → task reviews → T4 → deterministic verification → corrected pilot review/human G1 pilot freeze → human G2 → T5 → T6 → human G3.

- Orchestrator owns integration decisions and acceptance verification, not unapproved implementation edits. T4 is the sole integration implementation owner.
- Give T2 and T3 separate managed worktrees from the same approved revision; integrate only reviewed owned-path changes. T3 may draft against the fixed reference path, but cannot claim delivery until T2's reference exists and T4 verifies packaging.
- Freeze A before any source edits; freeze B after policy-only T1; freeze C after modeling/workflow integration. Record complete package/workflow hashes, not just SKILL.md hashes.
- Delivery workers skip builds, lint, tests, and formatters mid-flight; return authored changes with verification explicitly pending. Orchestrator runs the integrated gates once after sources freeze. A correction reruns only affected checks unless evidence requires broader verification.
- Independent task reviews use fresh Analysis & Review sessions, not the implementer. No fresh model generation occurs as part of a “review” without G2.
- Maximum proposed concurrency: two implementation workers; one evaluation runner unless G2 approves more. No busy-polling: notifications plus independent work, wait only when blocked.

## 7. Standalone Worker Briefs

Every brief includes this plan path/revision, actual authorized worktree cwd, repository identity, source snapshot, assigned REQ/AC IDs, exact owned files, non-goals, and output/evidence requirements. Worker first reads project instructions and loads applicable MCP skills; Markdown routing misses use direct known skill lookup. No nested delegation, commits/merge/release, policy edits, or unrelated fixes unless separately authorized.

### T0 — Independent plan and pilot review

- **Role:** planning/QE review, `Personal · Analysis & Review`; read-only.
- **Inputs:** this plan; evidence paths in §2; skill-creator/decision-discipline/readiness guidance; pilot cases in §8.
- **Actions:** check shared contracts, ownership, dependencies, profile eligibility, rubric discriminating power, and proposed resource gates. Identify contradictions and unsafe readiness cases.
- **Acceptance:** actionable findings linked to plan sections/ACs, or a clean review with limitations. No claim of implementation or human approval.
- **Return:** prioritized findings, contract corrections, rubric corrections, and unresolved human decisions. Orchestrator updates the planning artifact; source edits remain gated.

### T1 — Align existing requirement policy

- **Own:** `skills/common/common-business-requirements/SKILL.md`, `skills/common/common-product-requirements/SKILL.md`, `skills/common/common-software-requirements/SKILL.md`, `skills/quality-engineering/quality-engineering-business-analysis/SKILL.md`; corresponding existing `evals/evals.json` files and only directly contradictory references inside those packages.
- **Actions:** implement §3 policy consistency; remove obsolete wording/default expectations rather than re-pin them. Replace brittle condition-count guidance with behavior-based ACs; make unknown-state blockers risk/slice specific; distinguish numeric quality thresholds from categorical invariants. Preserve owners, scope fences, normal/alternate/exception courses, and sensitive approval floors.
- **Non-goals:** modeling-reference addition, workflow edits, generic skill/router cleanup, score/answer modification.
- **Acceptance:** AC-001/002 and preserved AC-007/008 behavior; no copied second decision policy; skill bodies ≤100 lines and long examples in references.
- **Verification lane:** final skill/eval preflight plus policy-only semantic pilot arm B. Return exact source changes and potential regression risks; do not run gates mid-flight.

### T2 — Add scope/scenario completeness guidance

- **Own after T1 transfer:** `skills/common/common-product-requirements/SKILL.md`, its `references/prd-template.md` and `references/checklist.md`, its `evals/evals.json`; new `references/requirements-modeling.md` in that package.
- **Actions:** add the §3 scope-map stop rule, overlap/completeness review, shared-rule references, examples/questions, view-selection table, and change-impact procedure. Make the reference on-demand; preserve lightweight ticket handling. Add controlled examples in references, never invented production policy.
- **Non-goals:** new skill/workflow, new ID taxonomy, unconditional loading of unrelated skills, renderer/XML changes.
- **Acceptance:** AC-003/004/006/009; every in-scope leaf maps to REQ/AC coverage or a named gap; diagram capability is acknowledged rather than described as absent.
- **Verification lane:** package/resource consumer smoke and semantic pilot arm C; include near-miss inputs that should not force modeling. Return exact paths/reference links and unverified behavior.

### T3 — Integrate existing lifecycle handoffs

- **Own:** `.agents/workflows/brainstorm-feature.md`, `plan-feature.md`, `design-solution.md`, `implementation-readiness.md`, `sdlc.md`.
- **Actions:** add capability inventory where scope warrants it; invoke modeling guidance in product planning; select technical views/contracts without inventing scope; review relevant completeness and change-impact evidence at readiness. Carry existing authority, approval, IDs, owners and ready/blocked slice fields; do not create incompatible required payload fields.
- **Non-goals:** native mirrors, renderer types, replacing the SDLC router, mandatory document-writing detours, new approval loops.
- **Acceptance:** AC-005 through AC-009; GWT behavior remains consistent with the fixed contract; workflows ≤80 lines by referencing detail rather than copying it.
- **Verification lane:** `audit:sdlc`, outcome/trace checks, and generated-entrypoint semantic smoke after T4. Scope gap and consequential contract uncertainty route to the existing appropriate stage.

### T4 — Integration, native exports, and source documentation

- **Own:** reviewed source integration; `skills/metadata.json`, `CHANGELOG.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/sdlc-workflow-quick-reference.md`, `docs/sdlc-residual-acceptance.md`; generated indexes/bridge/native exports produced by existing tooling. Do not manually author generated workflow bodies.
- **Actions:** integrate only accepted owned-path changes; update affected common/quality-engineering/workflow versions once according to existing release convention; add changelog entry without publishing. Document capability reuse and completeness checks. Run `rtk proxy pnpm generate-indices` once after sources settle; inspect diagnostics because the script catches some sync errors and may not signal them solely through its exit code.
- **Safety:** preserve unrelated user changes and locally edited generated files. A kept/conflicting mirror is a delivery gap; reconcile its source/ownership with the maintainer rather than using blanket force. Do not change `.skillsrc` profile/account policy or introduce remote release pulls.
- **Acceptance:** AC-010; all selected native mirrors and shipped references correspond to the candidate. Record source-ready separately from consumer activation.
- **Return:** integrated path list, source/package hashes, generation diagnostics, mirrors kept/updated, and any blocked consumer surfaces. Orchestrator then runs the deterministic gate commands in §9.

### T5 — Bounded verification and semantic pilot

- **Role:** independent verification/QE, `Personal · Analysis & Review`; no registry edits. G2 may authorize writes only to a new evaluation run directory and the pilot evidence report.
- **Actions:** execute approved isolated arms against frozen A/B/C packages; generation prompts get the case and that arm's allowed standards, never expected findings/rubric. Keep provider/account boundaries. Grade with output citations, capture measured timing and host usage when available, otherwise mark unavailable.
- **Two evidence lanes:** canonical skill-level evals use the existing `.agents/workflows/evals-run.md` protocol; the three-arm workflow/package pilot exercises loaded references and generated native entrypoints. Do not claim body-only skill transcripts prove resource delivery or native workflow behavior.
- **Acceptance:** AC-003 through AC-011 and §8 targets; all critical gaps detected, no unsafe implementation authorization, no coached baseline, no manual result editing. Failed gates remain failures; no weakened rubric to obtain a pass.
- **Return:** run/snapshot/model/settings/counts, per-case findings with evidence, timing/missing telemetry, native smoke observations, regressions, and decision recommendation. No automatic rerun, promotion, publication, or merge.

### T6 — Independent final review and human packet

- **Role:** fresh `Personal · Analysis & Review` session, not an implementer or pilot-output author.
- **Inputs:** approved plan, exact integrated change package/source revisions, worker reports, deterministic gate output, and immutable pilot evidence. Review only the authorized scope.
- **Actions:** map every AC to evidence; check scope creep, orphan requirements/references, contradictions, risk floors, package/native delivery, approvals and unresolved findings. Distinguish source delivery, measured efficacy, and consumer activation.
- **Acceptance:** AC-012; no open blocker/high-severity finding, or an explicit not-ready decision with owned blockers. A clean review does not supply human signoff.
- **Human packet:** one-page recommendation; AC evidence matrix; representative outputs from three cases plus every failure; changes by task; risk/decision list; exact acceptance/merge/release boundaries.

## 8. Frozen Semantic Pilot

Ten synthetic cases; no real banking/customer records. Each case's complete controlled input and seeded expected findings must be independently reviewed and human-frozen at the G1 pilot milestone before G2 or any generation. Source implementation may proceed after the separately approved G1 source-contract milestone. The cases are test hypotheses, not a domain specification for production.

1. **P01 Lending omission:** intake/appraisal/disbursement/collection listed, overdue behavior absent. Detect missing capability; request an explicit scope disposition. AC-003.
2. **P02 OTP flow ambiguity:** input declares invalid/expired OTP cannot issue registration authorization, but a supplied flow shows error then success. Detect contradiction without inventing TTL/PIN/API rules. AC-005.
3. **P03 Shared verification:** same verification policy invoked in intake and disbursement. Preserve one canonical definition with multiple references. AC-004.
4. **P04 Permission/toggle interaction:** input supplies incompatible actor permissions under two toggles. Identify the conflicting combinations with a truth table and an owned decision; do not choose business policy silently. AC-002/006.
5. **P05 Low-risk maintenance:** approved caption-wrap ticket, owner, component and executable AC supplied; no separate requirement files. Preserve direct readiness. AC-007.
6. **P06 PARTIAL readiness:** independent local behavior ready; optional native acceptance environment unavailable for another slice. Authorize only the ready slice. AC-008.
7. **P07 Sensitive change:** token validation crosses a trust boundary without approved design. Apply sensitive floor and human/design gate despite “small change” wording. AC-008.
8. **P08 Change impact:** approved reminder-channel requirement changes while linked AC/contract evidence remains old. Identify affected evidence/approval without reopening unrelated requirements. AC-009.
9. **P09 NFR types and unknowns:** preserve supplied numeric latency and categorical permission invariant. Retain one caption behavior with multiple necessary preconditions; record a harmless grouping-label assumption without blocking it. A separate unresolved consent policy blocks only its notification slice with named owner/input. AC-002/008.
10. **P10 View selection and resource delivery:** use unmodified complete A/B/C snapshots for scope/order/lifecycle questions; normal A/B absence of candidate-only guidance is not a failure. Verify actual resource access separately from representation selection. One isolated C-minus-reference fault-probe session is proposed outside every modeling-benefit scoring universe and requires explicit counting/approval at G2. Never mutate frozen C or allow fallback to another installed reference copy. AC-006/010.

### Rubric and measurements

- **Safety admission:** zero missed seeded safety-critical gaps; zero unsafe READY/implementation permissions; zero blocked-slice absorption. Any breach is a failed candidate regardless of averages.
- **Semantic detection:** ≥90% of other seeded gaps, with numerator/denominator and per-case evidence. The reviewed proposal uses two all-or-nothing noncritical items (P01/P08), so the target requires 2/2; P08 includes affected AC/contract/evidence/approval subchecks. Critical P04 requires both conflicting toggle combinations. Freeze stable scoring IDs/subchecks before generation; unsupported findings cannot increase the numerator.
- **Preservation:** no mandatory UML/full-doc detour for P05, no silent scope expansion for P01, no invented production policy for P02/P04.
- **Comparison:** A=current package; B=policy-aligned package; C=B+modeling/workflow integration. Compare B→C to isolate modeling benefit, A→B to isolate consistency benefit over the fixed five seeded-gap items P01/P02/P04/P07/P08. Resource fault-probe results remain separate. Canonical skill evals retain their prompt-only baseline.
- **Cost/value targets:** ≥30% fewer missed gaps vs B when nonzero, using `(missed_B − missed_C) / missed_B`; zero B means percentage undefined and target unverified, not passed. Retain ≤15% median paired preparation-time overhead on the frozen medium/high subset. Actual preparation instrumentation, completion rule and event sources must be established before G2; missing timing leaves that target unverified. Generation wall time/tokens/USD cannot substitute. Human review time is separate.
- **Claim limit:** ten cases support a pilot decision, not broad statistical efficacy or category release readiness. Selective/composite/reused skill runs are development evidence, not release promotion proof.
- **Rubric protection:** frozen before generation; grader session is independent. Any prompt/rubric correction creates a new version/run; preserve failures and original outputs.
- **Freeze prerequisites:** actual full A/B/C package/resource/workflow/native manifests and digests; exact native entrypoints/loading isolation; immutable case/scoring bytes; isolated fault-probe inventory/parent hashes; actual preparation event sources; pinned model/settings/concurrency and printed count/cap. Proposed total is 33 sessions if the separate probe is approved (30 ordinary +1 probe +1 grading +1 aggregate review), before separately enumerated canonical skill-eval or additional runtime sessions. This proposal authorizes no spend.

## 9. Verification Commands and Evidence

These commands are grounded in current `package.json`, `CONTRIBUTING.md`, `docs/EVALS.md`, and `scripts/generate-indices.ts`. They are planned checks, not claimed passing results. Always prefix shell commands with `rtk`.

### Integrated deterministic gate — once after T4

- `rtk proxy pnpm validate:all`
- `rtk proxy pnpm audit:sdlc`
- `rtk proxy pnpm check-alignment`
- `rtk proxy pnpm test`
- `rtk proxy pnpm build`
- `rtk proxy pnpm calculate-tokens`
- `rtk proxy pnpm evals:preflight -- --skills-file <approved-changed-skills-file>`

The selective skills file contains one real `category/skill` key per changed skill. Resolve it from the integrated change set; do not assume the pilot touches every catalog skill. Record unrelated pre-existing failures separately; do not repair them without scope authorization or misreport a globally failing gate as passed.

### Evaluation preparation — no generation authorization implied

- `rtk proxy pnpm evals:baseline -- --plan`
- `rtk proxy pnpm evals:manifest -- --skills-file <approved-changed-skills-file>`
- After G2 only: execute the selected manifest through the canonical `evals-run` procedure with the expressly approved model/effort/concurrency. The runner's historical default is not approval to use that model; verify availability first and never silently substitute.
- After complete answers: `rtk proxy pnpm evals:score -- --run <actual-run-id>` and `rtk proxy pnpm evals:verify -- --run <actual-run-id>`.
- Regenerate reports through tooling; never hand-edit `results.json`, original transcripts, frozen inputs, history, or scores. Package-resource/native pilot evidence remains separate from skill-body scores.

### Runtime/consumer proof

- Exercise the generated Codex requirement workflow and one second configured native format with controlled inputs. Record selected entrypoint, loaded package/reference revision, actual questions/route/output, and limitations.
- Run P05/P06/P07 through the actual generated router/readiness surfaces, not only by reading their source or checking for phrases.
- Use an existing supported sequence/state fixture for a real diagram smoke when a diagram is selected; validate, render, export and inspect the image. If export/inspection is unavailable, report the visual lane unverified; do not claim visual proof from XML.
- Compare observed behavior against the semantic rubric. Unit/structural gates alone do not satisfy AC-010/011.

### Worker result contract

Each worker returns task ID, profile/session identity, source revision, owned/changed paths, REQ/AC mapping, decisions versus assumptions, command/output evidence actually exercised, explicit verification-pending areas, blockers and their owner/input. Do not use “done” for authored-but-unverified behavior.

## 10. Review, Rollout, and Rollback

- Human review reads §1, §4, §5 and §6 first; detailed briefs and rubric are available without requiring the human to reconstruct agent conversations.
- Separate implementation ownership, independent review, and human authority. Maintainer is accountable for scope/approval; orchestrator for bounded dispatch/integration verification; delivery workers for owned changes; Analysis & Review sessions for evidence-backed findings; domain reviewer for business-model correctness. Backend/frontend/mobile/release roles are not required because no application or production release is in scope.
- Prefer source-only candidate delivery first. Consumer sync/activation and category publication require their own approved scope and evidence; do not conflate repository merge with runtime adoption.
- If the candidate fails safety/preservation criteria, stop promotion, retain failure evidence, and propose a bounded correction. No automatic eval spend or weakened acceptance criteria.
- Rollback restores only this candidate's canonical skill/workflow/metadata changes to the recorded prior revision, then regenerates affected native mirrors. Preserve unrelated user edits and historical eval artifacts. Consumer rollback requires activation authority if consumer activation was separately authorized.
- Version metadata once for the settled bundle; no automatic tags or release scripts. Full changed-category fresh promotion evidence is a separate release gate, not a fabricated extension of this ten-case pilot.

## 11. Current Handoff and Open Decisions

- Scope, delegated execution, cheap Antigravity delivery/Personal Codex review-fallback and split G1 source-contract milestone remain authorized. T1–T4 source work has independent scoped acceptance; immutable A/B/C archives and candidate native exports are prepared. Human additionally selected Personal Codex + Antigravity for native consumer checks; route choice is settled. Exact native-client account/profile/launcher eligibility and guard proof remain separate unresolved prerequisites.
- `feature_status`: `partially_implemented`; source-contract implementation and deterministic checks are evidenced, but actual native consumer behavior, semantic efficacy and acceptance targets are not yet proven. Agent review does not provide human pilot freeze or final signoff.
- Requirement trace: `BRD-OBJ-001 → REQ-001..007 → AC-001..012 → T0..T6 → source/deterministic evidence and separately gated live lanes`.
- Completed evidence: accepted policy/modeling/handoff/native/source-document deltas; actual deterministic gate output and grading-only correction review; frozen candidate hash; clean delivery and separate C-minus-reference inventories; no-generation canonical manifest; independently reviewed preflight; actual local file-denial/native-catalog probes and a digest-bound dispatch proposal. Offline runtime proofs are partial, not consumer behavior. Ledger: `.agent/sdd/prd-plan-requirements-workflow-modeling/progress.md`.
- Missing evidence: live-effective arm-specific tool/MCP/resource loading boundary; calibrated preparation completion events; eligible Personal native account/profile bindings for the selected Codex + Antigravity route and pinned Antigravity launcher/version; independently freeze-ready and human-frozen pilot; expressly bounded model/runtime approval and hard resource ceiling; actual native consumer/pilot outcomes; fresh T6 review; human acceptance. Antigravity currently exposes only full-access; external isolation must be proven before launch. Claude/VMO is not selected and remains untouched. Matched A/B/C offline catalog probes exclude foreign/bundled skill entries; this is not live behavioral proof.
- Next human gates: corrected G1 pilot freeze after complete prerequisites, exact G2 account/model/runtime/effort/concurrency/count/cap, then G3 acceptance. Actual selective manifest adds68pending canonical arms to33workflow/review sessions; two separately proposed second-native-client smokes increase the proposal from101to103sessions. Extra smokes are outside modeling-benefit/timing denominators. Counts are not approved/frozen; catalog604lanes are not scope.
- Next workflow: additional no-generation runtime tooling is implemented, actually exercised and independently accepted for bounded internal contracts. Native BB23 spec/quality APPROVE, archiveSHA1d8adebb67b8c97b47c61006a98f8ca689e95603028e8d0999a8738daa731089, covering0/8.50s/11 targets-four reads-seven EPERM/20 controls. Event638D spec/quality APPROVE, archiveSHA507844865737d6a948dda6d3631ae0667055465b5a8ad6007d6470021313992e, final joint compiler0/1.55s and advertisedCLI0/16.58s/all54true; EF1/EF2 closed, no remaining scoped correction packet. Acceptance handoff `.agent/sdd/prd-plan-requirements-workflow-modeling/T5-runtime-tooling-acceptance.md` records exact proof and owner actions. Whole T5/live freeze remain BLOCKED: authentic native pairs0/targetnull; actual native account/launcher/server-MCP-network-context containment, clock/queue/preparation calibration, enforced cap, independent pilot readiness and human G1/G2/G3/T6 remain separate. No source-only/native fixture or local process proof grants those gates or authorizes103 proposed sessions.
- Session cost: host-wide token/cost totals unavailable; no invented USD or measured timing/efficacy claim. Observed deterministic/native preparation durations are recorded, not used as the pilot's ≤15% preparation-time metric.

### Change log

- Revision 1: initial human-review and bounded-profile delegation plan; approval was pending at creation.
- Approval record, 2026-10-11: requesting maintainer agreed to the plan and requested delegated implementation. Scope and Subagent-Driven execution approved; account eligibility, delivery route, evaluation spend, and final acceptance remain independently gated.
- Account authorization, 2026-10-11: maintainer selected “Authorize cheap Antigravity route”; cheap Antigravity implementation and Personal Codex review/fallback are permitted for this repository. This resolves the profile-note conflict only for this approved work; no profile configuration or premium controls changed.
- T0 review, 2026-10-11: independent reviewer found the source contract ready but pilot inputs/rubric not yet freeze-ready. Required corrections and the proposed G1 sequencing amendment are recorded in `.agent/sdd/prd-plan-requirements-workflow-modeling/T0-review-disposition.md`; agent review does not supply human approval.
- G1 sequencing amendment, 2026-10-11: maintainer selected “Split G1; implement now”, explicitly approving the reviewed source contract and implementation dispatch. Corrected pilot inputs/rubric still require independent review and human freeze before G2; targets, spend controls and final acceptance are unchanged.
- Execution checkpoint, 2026-10-11: T1–T4 source delivery accepted; integrated gates exercised and grading-only failure corrected independently. Frozen C and full clean delivery manifests prepared. G1 pilot freeze/G2/G3 remain ungranted; source acceptance is not native consumer activation or semantic efficacy.
- Runtime preparation checkpoint, 2026-10-11: local assigned-read/protected-denial and native catalog isolation probes exercised without inference; bundled-system exposure/live controls remain unresolved. Blinded dispatch inputs and matched native matrix prepared; proposal103 adds two separate native smokes. Native Claude account observed VMO-only; eligible Personal routes require owner action. No generation, pilot freeze, spend or acceptance authorized.
- Matched native-catalog checkpoint, 2026-10-11: real Codex renderer observed all three opaque off-repository contexts with only assigned native root, no foreign/bundled entries and24manifest-matching visible entrypoint/package bindings after documented owned-runtime exclusions. Zero generations; temporary contexts cleaned. Live account/tool/MCP/resource behavior and preparation calibration remain prerequisites, not assumed from catalog proof.
- Native-route selection, 2026-10-11: maintainer selected Personal Codex + Antigravity. Active digest-bound v2 proposal rebinds only the two second-client smokes to Antigravity; total103 remains proposed, not approved. No eligible native profile/account bridge or externally guarded full-access launcher is yet established; no model runs, configuration changes or weakened acceptance targets.
- Remaining-tooling checkpoint, 2026-10-11: maintainer requested implementation under settled delegated/account approvals. Both new control components authored; initial real no-generation CLIs exercised and failed acceptance. Frozen initial tooling package independently under review before one corrective follow-up per owner. This advances implementation, not human G1/G2/G3, host changes or pilot-generation authorization.
- Corrective tooling checkpoint: positive no-generation coordinator commands passed, but remaining source defects prevented acceptance after both cheap corrective attempts. Exact corrective package SHA2568e04469e10750b846e005b3999326d4b964c6490761f6d3ab7482655359c6a27 retained. Eligible Personal standard Delivery owners received disjoint native/event scopes; source acceptance, native observation, human freeze/spend/acceptance and profile/host authority remain separate.
- Bounded-tooling acceptance checkpoint: canonical worker bootstrap and full event provenance/output consumer corrections verified on exact frozen revisions and independently approved (BB23 native,638D event). Final joint strict compiler0/1.55s; actual changed native0/8.50s and event0/16.58s/54true. Internal implementation/integration tasks complete; temporary coordinator drivers removed, historical failure receipts preserved. Source contract remains partially implemented overall because native consumer behavior, authentic timing/efficacy and separately human-gated pilot/T6 acceptance are unproven.

## 12. PR delivery disposition

The maintainer requested PR publication rather than further unpublished readiness iterations. Publish the accepted T1–T4 source, generated native projections, evaluation definitions and source documentation as a **draft PR**. This is review visibility for the existing full plan, not a reduction of REQ-006, AC-010/011, T5 or T6.

- Source implementation has independent scoped acceptance. Fresh repository tests, build, SDLC audit and alignment checks are recorded in the PR.
- Native-consumer behavior, the controlled semantic comparison, protected timing/resource controls and final T6 acceptance remain incomplete. The PR must not claim semantic efficacy or readiness to merge.
- Local `.agent/sdd/` readiness helpers, frozen receipts, machine-specific diagnostics, generated evaluation runs and unrelated learning-log changes are not shipped as product source.
- P0's newly exposed raw testing-export gate bypass remains an owned local readiness defect; correction must authenticate an opaque synthetic context before filesystem access and never expose the private live core. No real target operation is permitted.
- The fixed readiness authorization expiry remains `2026-10-14T11:01:30Z`; source or PR publication does not renew it. Any expired live authorization remains unusable.
- No merge, release, deployment, paid evaluation allocation or final human acceptance is supplied by opening the PR.
