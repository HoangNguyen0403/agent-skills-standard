# Product-Evidence SDLC — Delegation and Implementation Plan

> For agentic workers: use `subagent-driven-development` for orchestrated execution. Workers execute their assigned brief directly and do not delegate. Checkbox completion requires evidence, not a success assertion. The operator authorized subagent-driven execution; scoped H1/H2/H3 gates remain binding.

**Approval:** scope/requirements, Subagent-Driven execution and reviewed t01-v2 H1 approved for T02–T09. **Execution:** T00/T01 complete. After repeated host persistence failures, old actors are permanently closed;48Gi storage headroom observed. Fresh same-profile T02/T03 independent reviews and T04/T05 remaining ONE standard corrections launched, sourcecap2. T02 stable/current reportbafaa0ce...; no W1 acceptance/common consumer execution/waived joins. **Slug:** product-evidence-sdlc; operator hybrid, both lane, SNC high. Publication proposed; activation unauthorized. **H1:** `.superpowers/sdd/2026-10-11-product-evidence-sdlc/H1-approval.md`.

**Goal:** Add an opt-in, evidence-led product decision loop to the existing SDLC without replacing its requirements chain, weakening delivery gates, or confusing shipped software with realized business value.

**Proposed architecture:** seven product-management skills, three conditional workflows, one common evidence/authority contract, shipped deterministic resources, minimal existing-workflow/registry integration, isolated behavioral evals, and a human-controlled pilot. Exact technical contracts are approved in T01 before implementation.

**Tech stack:** existing Markdown/frontmatter/JSON registry; TypeScript CLI/MCP and audit harnesses; Node-native executable resources proposed for consumers. No new connector, database, or paid service is assumed.

**Spec:** [human-review PRD](../../prd/prd-product-evidence-sdlc.md). **Evidence and rationale:** [research BRD](../../brd/brd-product-evidence-sdlc.md). **Approved technical authority:** `docs/srs/srs-product-evidence-sdlc.md` and companion normative t01-v2 contract; exact hashes externally bound by H1-approval.md. Preserve frozen accepted bytes; future material changes require a new decision.

## 1. Human review in five minutes

1. Read PRD sections 1–3: scope, four human gates, and account/profile concern.
2. Check the task board below: deliverables, dependency waves, and owners.
3. Check section 4: immutable shared boundaries and things agents cannot approve.
4. Approve/correct H0 only if design-only execution is wanted. H1 later approves the actual technical contract and named implementation briefs.
5. Inspect per-task AC evidence and the release dossier before approving pilot/publication. A plan approval is not a purchase, customer-exposure, merge, or release permission.

**Execution preflight completed:** operator authorized Personal Codex plus the configured Gemini cheap pool, overriding its conflicting Codex-only note for this task; existing isolated worktree verified; locked dependencies installed; compatibility baselines passed. The conversation operator is human sponsor/approver; the coordinating agent owns orchestration/integration. **Pilot-only prerequisites:** pilot product, data eligibility, baseline, analytics/finance owners, measurement windows, and outreach/experiment budget remain unresolved.

## 2. Profile assignments and routing rules

Snapshot from `list_profiles` during planning; re-discover if configuration changes. These are configured models, not verified provider availability or price quotes.

| Alias | Exact profile | Provider | Model | Mode | Thinking | Allowed assignment |
| --- | --- | --- | --- | --- | --- | --- |
| A | `Personal · Analysis & Review` | `omp` | `openai-codex/gpt-6.1-sol` | `write` | `high` | Bounded design, product analysis, independent review; artifact writes only when the brief explicitly permits them |
| C | `Personal - Cheap` | `omp` | `google-antigravity/gemini-3.8-flash` | `write` | `medium` | Approved bounded implementation only; operator explicitly authorized configured Gemini route and overrode contradictory Codex-only note for this task |
| D | `Personal · Delivery` | `omp` | `openai-codex/gpt-6-luna` | `write` | `high` | Implementation, tests, executable verification; eligible standard fallback |
| P | `Personal · Premium Advisor` | `omp` | `openai-codex/gpt-6-astra` | `write` | `high` | Exceptional, explicitly approved, bounded analysis-only consultation; assigned to no standard task |

No `featureValues` were returned for these profiles: omit `settings.features`; do not invent defaults. Materialize `provider/model`, `settings.modeId`, and `settings.thinkingOptionId` exactly. A profile's `write` mode does not override the brief's read-only review boundary.

**Delivery selection:** C is the authorized first choice following the operator's explicit **Personal plus Gemini cheap** selection; its configured provider/model/effort remain unchanged. D is the authorized standard fallback under the failure rules below. This task-specific authorization does not edit profile configuration or approve private client/employer data. EZRX/VMO accounts remain excluded; never use them as a convenient fallback.

**Observed failure handling:** quota/rate/model-unavailable failure exhausts that route for the session; preserve work and use the eligible standard fallback. Invalid arguments or missing access are not exhaustion. For defective output, send one corrective brief with exact AC failures; a second quality failure escalates that slice to eligible D. It does not exhaust C for unrelated slices.

**Premium:** repeated evidence-based failures, irreversible tradeoffs, unresolved safety risk, or implementer–reviewer disagreement may justify requesting P. Present one targeted question, evidence, exact profile/model/effort, permitted scope, cap, and expiry. No invocation before explicit human approval; no implementation, mutation, deployment, or spawning by P.

**Workspace evidence and authority:** Paseo registered this checkout as workspace `wks_2532b0631be96a8c`, project `prj_d2cfd2af46001d8b`; the operator separately authorized its Personal/Gemini account route. Existing linked-worktree isolation is verified, so reuse it with disjoint write ownership rather than create unnecessary top-level isolation. Do not use another project's workspace or unrelated customer/employer context.

## 3. Task board and dependency waves

`Delivery` below means eligible C first, otherwise eligible D under section 2; it is not a new profile. Each task gets one implementation owner. A fresh A review session checks each implementation result; T11 is a separate whole-change review, not the implementer's self-review.

| Task | Deliverable | Owner/profile | Depends on | Size / confidence |
| --- | --- | --- | --- | --- |
| T00 | Eligibility, owners, worktree, dependency and budget preflight | Human + orchestrator | None; H0 | S / high for checks, authorization unknown |
| T01 | Approved technical contract and reuse/provenance decision | A; doc-only permission | T00; H1 after output | L / medium |
| T02 | Shared evidence skill, validator, bridge, behavioral fixtures | Delivery | T01 + H1 | L / medium |
| T03 | Market/customer/strategy method bundle | Delivery | T01 + H1 | M / high |
| T04 | Investment/experimentation bundle and deterministic calculator | Delivery | T01 + H1 | L / medium |
| T05 | Metrics/roadmap method bundle | Delivery | T01 + H1 | M / high |
| T06 | Three new canonical workflows | Delivery | T02, T03, T04, T05 | M / high |
| T07 | Existing lifecycle routing and PO-facing documentation | Delivery; sole existing-workflow owner | T06 | L / medium |
| T08 | Opt-in distribution, routing, audit and release-package preparation | Delivery; sole registry/CLI/MCP owner | T06 | L / medium |
| T09 | Integrated consumer/runtime verification | Delivery; QA owner | T07, T08 | L / medium |
| T10 | Blinded efficacy/trigger evaluation and independent grading | Delivery coordinator; isolated answer workers; A grading | T09 + H2 | L / medium; quota unknown |
| T11 | Independent final review and human release dossier | Fresh A; read-only code, report-only writes | T10 | M / high |
| T12 | Authorized decision pilot and first eligible value review | Human PO/analytics/finance; optional A assistance | T11 + H3 pilot approval | L / low until real inputs exist |
| T13 | Separate publication/default-adoption decision and action | Human maintainer/release owner | T12 + H3 adoption approval | M / medium |

**Waves:** W0 = T00/T01 → H1; W1 = independent T02/T03/T04/T05; W2 = T06; W3 = independent T07/T08; W4 = T09 → H2 → T10 → T11; W5 = human-approved T12 → T13. Start at most two implementation workers concurrently; queue the rest. Increase concurrency only by an explicit resource decision. Reviews are separate sessions and can inspect completed slices while other disjoint slices run.

T07 and T08 may start together on disjoint canonical surfaces. T08's final generated-index/native-mirror operation is a **join barrier**: wait for T07's completed handoff and a stable integrated source snapshot before generating or validating repository mirrors. T08 owns this operation; T07 never generates competing output. T09 starts only after both final handoffs.

The critical path is T00 → T01 → slowest W1 slice → T06 → slowest W3 slice → T09 → T10 → T11 → pilot → adoption. Sizes are planning inferences, not dates or fee commitments. Estimate elapsed time and monetary cost after T00/T01 using actual resources; do not invent hourly/model rates. The proposed six-week pilot clock starts at pilot approval, not while preparing skills.

### Review Focus — five consumer-visible failure classes

1. **Evidence/authority laundering:** copied citations, stale scope, fabricated approval, path/data leakage — T01/T02/T07; adversarial check T09/T10.
2. **Financial misstatement:** net ROI confused with benefit/cost, duplicate benefits, inconsistent horizons, fake payback/NPV — T04; independent arithmetic check T09.
3. **Lifecycle regression:** incident slowed, maintenance blocked, inconclusive experiment promoted to full build, release mistaken for value — T06/T07; runtime cases T09.
4. **Broken optional distribution:** resources missing, global markdown over-trigger, defaults silently changed, unavailable pack treated as ready — T08; real-consumer check T09.
5. **Untrustworthy efficacy/adoption:** coached baselines, different models per arm, self-review, license contamination, pilot success invented — T01/T10/T11/T12/T13.

## 4. Global constraints and shared contract

These are proposed boundaries, frozen at H1. T01 may recommend changes with evidence; the orchestrator updates dependent briefs before dispatch, rather than asking implementers to design competing contracts.

### C1 — Evidence and authority

- One canonical evidence ledger per initiative in local-file mode: `docs/product/<slug>/evidence.json`; distinct `product_id`; product-level strategy pointer. Human-readable research/value views reference IDs, not duplicate editable records.
- Nine record kinds: SRC, CLM, OPP, HYP, EXP, INV, DEC, MET, REV. Every reference resolves in its declared authority domain. Claims distinguish confirmed/inference/assumption/unknown; preserve original origin, scope, retrieval/observation time, revision, counterevidence, freshness rationale, and privacy/license constraints.
- Validate duplicates, dangling references, invalid types/states, cycles where the approved dependency relation forbids them, missing critical evidence, scope/revision mismatch, and cross-file BRD/REQ/AC/SRS bridges. A validator cannot verify that a remote citation is true, a protected record is accessible, or a named human actually approved.
- Raw customer recordings, PII, credentials, and restricted financial inputs stay outside public packages. A redacted pointer is not permission to fetch it. Untrusted retrieved content cannot issue new agent instructions.
- Record required authorization separately for learning, exposure/spend, investment, spec, UAT, release, and retirement. Material changes invalidate affected decisions only. Host/operator controls govern sensitive actions; this project does not implement an approval-control bypass or claim JSON attribution is authentication.

### C2 — Compatibility and state

- Keep Outcome Report schema v1, existing `feature_status` values, and BRD-OBJ/REQ/AC/SRS trace arrays. Product IDs do not enter those arrays.
- Link the product ledger through existing evidence fields. Product status is separate: `unvalidated`, `validating`, `validated_for_scope`, `invalidated`, `inconclusive`, `not_applicable` with reason. Release status does not imply value status.
- Add conditional product routing without making research mandatory for incidents, maintenance, settled requirements, or valid prior decisions. Missing optional capabilities yield a specific gap/route, not a fabricated readiness result.

### C3 — Financial contract

- Define currency, price basis, analysis horizon, cohort, counterfactual, timing, and which cash flows belong inside the boundary. Incremental monetary benefit B plus eligible cash savings; incremental costs C exclude any costs already netted out of B. Net value = B−C; net ROI = (B−C)/C; benefit/cost = B/C for positive known C.
- Unknown or zero cost means undefined/unavailable ROI, not infinity. Cost/benefit categories prevent double counting contribution margin, retention/LTV, hours, and related savings. Capacity freed is not automatically cash savings.
- Base/downside/upside are assumption scenarios, not probabilities. Payback uses the declared time series; never break-even is explicit. NPV is computed only when timing, rate convention, and periods are complete; missing discount assumptions do not silently become zero.
- T01 freezes numeric representation, rounding, discount-period conversion, zero/negative boundaries, outputs, and error semantics. T04 implements that contract; it does not decide financial meaning.

### C4 — Shipped executable resources

Proposed standalone Node-native resources, no monorepo imports or undeclared npm dependencies:

- `skills/common/common-product-evidence/scripts/validate-product-evidence.mjs`
- `skills/product-management/product-investment/scripts/evaluate-investment.mjs`

T01 must confirm the consumer runtime, argument/input/output contract, exit codes, resource layout, and installation path before H1. Proposed invocation: validator accepts ledger path plus authority root; calculator accepts a scenario JSON path. Both return machine-readable results and meaningful nonzero errors. Schema v1, unknown-version handling, path containment, and trusted roots are explicit. Do not add a daily `ags` command or a new runtime requirement accidentally.

### C5 — Authoring, licensing, evidence, and approval

- Skills ≤100 lines; new workflows ≤80 lines; use references for detail. Preserve existing documented workflow exceptions, portable runtime/handoff/outcome sections, and operator-profile fields.
- No global `**/*.md` trigger or unconditional product-management category. New workflow discovery is not automatic default installation. `workflows: true` intentionally includes all exported workflows; absent-product-pack invocation must still fail honestly.
- No Dean Peters CC BY-NC-SA content copying/adaptation into this MIT registry without separately resolved rights; paraphrasing distinctive content is not a license workaround. Apache reuse requires file-level provenance and applicable LICENSE/NOTICE/changed-file handling. General methods may be independently authored from permissive primary sources.
- Freeze supplied-source revisions and selected files/hashes before reuse; the BRD's investigation was not an atomic full-repository snapshot. No results, licenses, or rights are inferred from popularity.
- Load project skills in every worker. No worker delegation, shared-file edits, hidden scope additions, commit/push/publication, premium launch, or product contact/spend/launch by default.
- Focused verification runs at completed-slice boundaries; do not run concurrent broad suites or formatters against shared mutable files. The integration owner runs the consolidated checks once the candidate is stable.

## 5. File ownership — no competing editors

`Create` targets below are planned outputs, not claims that files exist. Generated mirrors are never hand-edited. Each skill owner also owns its references/evals/attribution files; test directories are task-disjoint.

| Owner task | Exclusive write surface |
| --- | --- |
| T01 | Create `docs/srs/srs-product-evidence-sdlc.md`; create `docs/srs/product-evidence-sdlc/{contract-decisions,source-reuse-register}.md` |
| T02 | Create `skills/common/common-product-evidence/`; create `scripts/skill-tests/common-product-evidence/` |
| T03 | Create `skills/product-management/{product-market-research,product-customer-discovery,product-strategy}/` |
| T04 | Create `skills/product-management/{product-investment,product-experimentation}/`; create `scripts/skill-tests/product-investment/` |
| T05 | Create `skills/product-management/{product-metrics,product-roadmap}/` |
| T06 | Create `.agents/workflows/{discover-product,validate-product,review-product-value}.md` |
| T07 | Modify `.agents/workflows/{sdlc,brainstorm-feature,plan-feature,implementation-readiness,verify-work,deploy-release,publish-notes,retro-learn}.md`; modify `docs/{getting-started-product-owner,sdlc-workflow-quick-reference}.md` |
| T08 | Modify `skills/metadata.json`, `package.json`, `CHANGELOG.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`; create `skills/product-management/references/framework-map.md`; own required changes in `cli/src/{services,constants}` and their tests, `mcp/src/{services,tools}` and `mcp/test`; own `scripts/{audit-sdlc,workflow-chain,generate-indices}.ts` and necessary audit tests; generate repository-native mirrors/indices |
| T09 | Create `scripts/skill-tests/product-evidence-integration/`; create `artifacts/runs/product-evidence-sdlc/verification/` reports; no product implementation edits |
| T10 | Create only the approved new evaluation run manifests/answers/results/reports through existing evaluator machinery; no historical evidence edits or changes to frozen skill/eval inputs |
| T11 | Create `docs/srs/product-evidence-sdlc/{final-review,release-dossier}.md`; no implementation edits |
| T12 | Create only the approved pilot product's product-evidence/value-review records and restricted-store references; no reusable-package/customer-system edits |
| T13 | Human-controlled publication/version/tag actions only as approved; no agent implementation assignment |

T08's source scope is a maximum integration boundary, not permission to refactor it wholesale. T01 lists exact affected files and public-symbol references before H1; unchanged files stay unchanged. Current parser/outcome implementations under `scripts/trace/` and `scripts/outcome/` are read-only compatibility references. Adding new product ID kinds there is out of scope.

For any collision: stop the conflicting edit, message the orchestrator with path and required change, and let the named owner act. Review findings return to the original owner; reviewers do not patch the implementation. Integrate completed worktrees without accepting unowned changes.

## 6. Bounded task briefs

### T00 — Execution preflight

**Depends:** none. **Profile:** human/orchestrator; do not start a paid worker merely to perform these checks. **Trace:** REQ-009; AC-017, AC-018. **Gate:** H0.

- [ ] Record explicit Personal-domain/account eligibility for project `prj_d2cfd2af46001d8b`, data classes, named PO/sponsor, engineering owner, and QA/release owner. Workspace registration alone is insufficient.
- [ ] Resolve the cheap-profile provider/note contradiction or hold C and confirm eligible D. Preserve all profile settings; do not edit authorization policy to approve this work.
- [ ] Set delegated execution as the approved method, choose task worktrees and integration owner, and record the scope of H0. No production implementation yet.
- [ ] Confirm locked Node/pnpm prerequisites. After authorized setup, install existing dependencies with `rtk pnpm install --frozen-lockfile`; do not modify lockfiles to get a green check.
- [ ] Record design-task resource cap and source-access limits. H2 separately governs live eval cost/concurrency; H3 governs pilot/customer permissions.

**Output:** preflight decision/eligibility record carried in the task brief and run evidence. **Acceptance:** every selected account/workspace/data class is authorized; owners and permissions are concrete; unresolved items block only dependent dispatch. **Verification:** actual dependency/install output if setup was authorized; profile snapshot plus human attribution and approved scope. **Non-goals:** deciding pilot ROI, launching evaluators, or silently implementing inline if an eligible profile is missing.

### T01 — Technical contract and reuse decision

**Depends:** T00. **Profile:** A, explicitly permitted to author only the three design/provenance documents in section 5. **Trace:** REQ-001, REQ-003, REQ-004, REQ-005, REQ-007, REQ-009; AC-001, AC-002, AC-005, AC-006, AC-007, AC-009, AC-013, AC-014, AC-018. **Gate:** H1 before downstream dispatch.

**Read:** BRD, PRD, C1–C5; current `scripts/outcome/schema.ts`, `scripts/trace/types.ts`, `cli/src/services/{SkillSyncService,WorkflowSyncService,IndexGeneratorServiceImpl}.ts`, `mcp/src/services/SkillIndex.ts`, relevant tests, metadata, contribution/release rules, and pinned selected upstream license/content files. Use language-server references for any proposed exported-symbol change when available.

- [ ] Define versioned ledger types, required/optional fields, stable ID syntax, authority pointers, review/expiry semantics, state transitions, revision binding, reference validation, privacy boundaries, and old-trace bridge. Provide valid and adversarial example records, not invented customer research.
- [ ] Freeze standalone validator/calculator interfaces, numeric units/precision, cash-flow/discount conventions, finite/zero/unknown/negative handling, file/URI policy, exit codes, and errors. Include consumer runtime and package-relative invocation.
- [ ] Freeze the minimal opt-in category/file/keyword routing and workflow dependency contract. Identify exact code/test changes; preserve defaults and compatibility.
- [ ] Decide the runtime smoke harness: actual CLI command/sync/install path, actual MCP transport, and installed resources in an empty consumer. Fixture only the remote registry/network boundary; do not replace internal services with echo mocks. No new production-only test hook without an approved design change.
- [ ] Build source reuse register: upstream revision, selected files/hash, applicable license/NOTICE, copied/adapted vs independently authored status, permission decision, and unresolved legal concern. Reject unresolved restricted-content reuse.
- [ ] Number technical clauses `SRS-*`; map each to PRD REQ/AC and downstream owner. Record tradeoffs and readiness proof. Submit contract for human H1; do not approve it yourself.

**Acceptance:** every load-bearing contract is decision-complete, tests have unambiguous expected outcomes, source rights are resolved or reuse excluded, and worker surfaces are exact. **Verification:** JSON examples/schema compatibility and source/license inspection; independent A review by a different session plus human H1. **Non-goals:** product implementation, signing off legal rights, rewriting PRD scope, or delegating.

### T02 — Shared product-evidence contract package

**Depends:** T01. **Profile:** Delivery. **Trace:** REQ-001; AC-001, AC-002. **Inputs:** H1-approved schema/resource contract and provenance decisions.

- [ ] Create `common-product-evidence/SKILL.md` with narrow triggers, required authority/freshness/privacy discipline, revision-scoped decisions, red flags, and progressive references.
- [ ] Create references for the frozen schema, authority model, requirement bridge, and safe local-file usage; keep human views as references rather than independent ledgers.
- [ ] Implement the approved shipped validator under `scripts/validate-product-evidence.mjs`; no repository-only imports, network fetches, or automatic writes. Validate identifiers/types/references/scope/revisions and authority-root containment as specified at H1.
- [ ] Add permanent behavior tests under `scripts/skill-tests/common-product-evidence/`: valid multi-layer bridge; duplicate/dangling IDs; bad version; stale/disputed critical evidence; revision mismatch; disallowed path escape; separate product/feature statuses. Do not assert wording or source snippets.
- [ ] Author outcome-based skill evals: shared-origin citations, stale competitor pricing, fabricated approver, protected evidence, conflicting authority, and malicious instructions inside retrieved material. Supply should/should-not triggers and pressure cases.

**Output/interface:** shared contract package consumed by all methods/workflows; machine-readable validator result using H1 semantics. **Acceptance:** invalid inputs fail distinctly, valid scoped records pass, no validator result claims authenticated approval or source truth. **Verification:** focused Node test command for this directory, direct shipped-validator invocation on accepted/rejected fixtures, and independent A review. **Non-goals:** modifying core trace/status schemas, adding connectors, or universal privacy certification.

### T03 — Market, customer, and strategy methods

**Depends:** T01. **Profile:** Delivery. **Trace:** REQ-002; AC-003. **Inputs:** approved shared contract, source reuse register, supplied research scope.

- [ ] Author `product-market-research`: decision question; relevant segment/geography/horizon; alternatives/substitutes; primary-source provenance; competitor differentiation; explicit unknowns, counterevidence, source dependence and freshness.
- [ ] Author `product-customer-discovery`: JTBD/problem evidence, ethical sample/consent boundaries, interview/observation guidance, representativeness limits, quote-to-insight trace, and synthesis that does not invent participants or demand.
- [ ] Author `product-strategy`: goals/cohorts, strategic choices and non-goals, opportunity/hypothesis synthesis, positioning, viability constraints, and reversible decision recommendations.
- [ ] For each, create SKILL.md, focused references/templates, attribution if required, and eval definitions. All outputs use C1 IDs; no parallel product ledger or redundant PRD.
- [ ] Cover behavior cases: vendor-page claims vs independent demand; leading interviews; no customer access; small biased sample; a stronger do-nothing/substitute option; inherited conflicting strategy; hostile instructions in source pages.

**Output/interface:** SRC/CLM/OPP/HYP/DEC recommendations and readable research/strategy references, no unapproved decision execution. **Acceptance:** no fabricated market sizes/interviews, source-derived uncertainty survives synthesis, audience and decision scope are explicit. **Verification:** structural/audit checks at slice boundary and independently graded behavioral cases. **Non-goals:** contacting customers, making purchases, or importing CC BY-NC-SA templates.

### T04 — Investment and experimentation methods

**Depends:** T01. **Profile:** Delivery. **Trace:** REQ-003, REQ-004; AC-005, AC-006, AC-007, AC-008. **Inputs:** frozen financial/resource/authorization contract.

- [ ] Author `product-investment`: build/buy/partner/defer/do-nothing alternatives; incremental monetary/capacity distinctions; horizon/unit boundaries; downside/base/upside assumptions; budget-holder authority; decision/revisit triggers.
- [ ] Implement `product-investment/scripts/evaluate-investment.mjs` exactly against H1. Independently reconcile the arithmetic examples and timing-sensitive cases; do not silently default a missing baseline, currency, or discount rate.
- [ ] Add behavior tests in `scripts/skill-tests/product-investment/` for 150000/100000, zero/unknown cost, duplicate benefits, incompatible currencies/horizons, negative net value, delayed cash flows, no-payback, and incomplete discount assumptions.
- [ ] Author `product-experimentation`: falsifiable hypothesis, appropriate method, sample/eligibility, primary metric/guardrails, failure/inconclusive rules, duration/cost/exposure cap, consent and stop rules; prototype authority remains learning-only.
- [ ] Create references/evals for missing permission, invalidated/inconclusive results, bias, moving success thresholds after results, proxy metrics, and financial overstatement. No outcomes invented in templates.

**Output/interface:** INV/EXP/DEC records; deterministic financial result; bounded validation recommendation. **Acceptance:** AC-005 arithmetic passes; unsafe/incomplete boundaries fail honestly; rejected/inconclusive experiments do not authorize full build. **Verification:** focused Node behavior tests and direct calculator runs; A review independently recalculates scenarios rather than trusting model prose. **Non-goals:** finance approval, experiment execution, outreach, pricing changes, or full-build risk decisions.

### T05 — Metrics and roadmap methods

**Depends:** T01. **Profile:** Delivery. **Trace:** REQ-002, REQ-005; AC-004, AC-009, AC-010. **Inputs:** approved evidence/measurement/investment contract.

- [ ] Author `product-metrics`: outcome vs output, definitions/denominators, eligible cohorts, baseline/window/query revisions, leading/lagging signals, guardrails, instrumentation proof, observation maturity, and attribution limits.
- [ ] Author `product-roadmap`: strategy/outcome alignment, opportunity tradeoffs, capacity/dependencies, displaced work, learning milestones, outcome confidence, and transparent prioritization. A prioritization score is not an ROI estimate.
- [ ] Create references/templates/evals for immature retention, missing event/denominator, confounded release comparison, capacity vs cash, stakeholder deadline vs validated demand, overlapping initiatives, and guardrail breach.
- [ ] Emit MET/REV records linked to original HYP/INV/DEC scope; allow negative/inconclusive findings without changing delivery status. Treat scale/iterate/stop as recommendations requiring appropriate authority.

**Output/interface:** measurement/review contract plus evidence-linked roadmap recommendation. **Acceptance:** success has a definition and owner; unknown baselines remain unknown; no causal ROI claim from correlation. **Verification:** independently graded scenarios and artifact validation against the approved contract. **Non-goals:** implementing analytics connectors, scheduling reviews, retiring a product, or redefining DORA as product value.

### T06 — Three new canonical workflows

**Depends:** T02, T03, T04, T05. **Profile:** Delivery. **Trace:** REQ-004, REQ-005; AC-007, AC-008, AC-009, AC-010.

- [ ] Create `discover-product.md`: scope/authority intake → evidence gaps and source collection → problem/market/strategy synthesis → opportunity and recommended next decision. Existing accepted evidence skips redundant discovery.
- [ ] Create `validate-product.md`: critical assumptions → bounded experiment proposal → authorization check → eligible results/risk decision → validated/invalidated/inconclusive route. Never fabricate authorization or implicitly execute exposure/spend.
- [ ] Create `review-product-value.md`: registered metric/window and original investment → actual eligible observations/costs → limitations and guardrails → human recommendation. Immature observations return pending/inconclusive; no automatic background schedule.
- [ ] Preserve portable Runtime Contract, Handoff Payload, Blocking Questions, Outcome Report v1, Cost Report, and next workflow. Explicitly list optional package/runtime prerequisites and capability-gap route. Keep each workflow ≤80 lines; references carry detail.
- [ ] Link ledger evidence through existing report fields; keep product status out of `feature_status`. Cover invalidated learning → no build and released software → inconclusive product value.

**Acceptance:** workflows can be executed from declared inputs and exact dependencies; proposals and authorizations are not conflated. **Verification:** audit/structure at slice boundary plus walkthrough transcripts for the named transitions, reviewed independently. **Non-goals:** editing existing workflows/defaults, native mirrors, or adding provider-specific commands to canonical text.

### T07 — Existing lifecycle integration

**Depends:** T06. **Profile:** Delivery; sole owner of section 5 existing-workflow/docs surfaces. **Trace:** REQ-006, REQ-009; AC-002, AC-009, AC-011, AC-012, AC-018.

- [ ] Add conditional router branches: evidence gap → discover-product; critical value assumption → validate-product; eligible post-release review → review-product-value. Preserve explicit task/latest approved state and urgent-harm precedence; missing documents alone do not restart settled work.
- [ ] Enrich brainstorm-feature and plan-feature with ledger/decision/metric references, not duplicated product artifacts. Keep Why/What separation and design-solution technical gate.
- [ ] Update implementation-readiness for affected scope evidence/authority and documented risk acceptance; maintain low-risk maintenance/equivalent-evidence rules and approved-current-context reuse.
- [ ] Carry measurement baseline/owner/trigger and scoped exception through verify-work, deploy-release, publish-notes; do not allow agent-created baseline or rollout approval.
- [ ] Route standards findings to retro-learn as proposals with its existing explicit maintenance/efficacy controls. Do not turn negative product results into automatic registry edits.
- [ ] Update PO quick start and workflow quick reference: simple routes, capability prerequisites, decision checklist, where human approval is required, and shipping vs value distinction.

**Acceptance:** incident and maintenance routes stay direct; product work gets only relevant evidence gates; no unsafe unconditional full-build route. **Verification:** existing SDLC audit plus approved/invalidated/absent-pack/incident/maintenance walkthroughs and independent A review. **Non-goals:** adding mandatory market research, changing status schemas, rewriting native mirrors, or approving rollout.

### T08 — Registry, CLI/MCP distribution, audit, and package preparation

**Depends:** T06. **Profile:** Delivery; sole owner of registry/CLI/MCP/generated surfaces. **Trace:** REQ-007, REQ-010; AC-013, AC-014, AC-020. **Inputs:** T01's exact file/reference map plus completed packages/workflows.

- [ ] Register product-management using existing category/version/owner conventions; create its framework-map reference; add precise keyword/file routing as approved. No global markdown glob or unconditional PM-category dependency.
- [ ] Preserve DEFAULT_WORKFLOWS unless separate adoption approval explicitly changes scope. Handle explicit optional workflows and `workflows: true` honestly when the pack is absent. New workflows must be discoverable without silently making their prerequisites universally installed.
- [ ] Ensure SkillSyncService/GithubService preserve scripts/schema/references/attribution and installation ownership, overrides, unknown files, and integrity verification. Change only where actual consumer tests expose a gap.
- [ ] Update required index/native-export handling and SDLC audit reachability/contract checks for optional workflows. CORE_SDLC_CHAIN currently denotes reachability, not a required linear lifecycle; do not conflate graph membership with default installation.
- [ ] Add focused behavioral tests in existing CLI/MCP suites for narrow routing, optional discovery/sync, absent pack, native export availability, and shipped resource execution. Do not add copy/wiring assertions that merely repeat source text.
- [ ] Prepare CONTRIBUTING/ARCHITECTURE/CHANGELOG changes, resource/runtime instructions, source notices, and candidate release inputs. Regenerate indices/mirrors once dependent sources are stable. Version proposals are not published tags.

**Verification commands, after approved dependency setup:**

```sh
rtk pnpm --filter ./cli test -- src/services/__tests__/SkillSyncService.package.spec.ts src/services/__tests__/WorkflowSyncService.spec.ts src/services/utils/__tests__/WorkflowTransformer.spec.ts
rtk pnpm --filter ./mcp test -- test/SkillIndex.spec.ts test/Tools.spec.ts test/WorkflowIndex.spec.ts
rtk pnpm generate-indices
rtk pnpm audit:sdlc
```

Select additional exact targets from T01's callsite map; do not assume these four commands cover all changed behavior. **Acceptance:** fresh consumer receives a runnable optional pack; absent pack/ordinary markdown is handled correctly; no install-ownership or default regression. **Non-goals:** whole-service refactor, global PM opt-in, releasing tags/npm, or editing another worker's skill content.

### T09 — Integrated runtime and regression verification

**Depends:** T07, T08. **Profile:** Delivery, separate QA assignment. **Trace:** REQ-001/003/004/005/006/007/008; AC-001 through AC-015 as applicable. **Inputs:** stable integrated candidate and T01-approved harness.

- [ ] Exercise the actual CLI sync/install/native-export path in a fresh temporary consumer, with only remote registry I/O supplied by a pinned fixture. Execute installed validator/calculator resources without repository imports/dependencies; capture exit codes and outputs. A mocked internal service is not a CLI smoke result.
- [ ] Exercise actual MCP transport and public load/get-workflow APIs against the candidate; confirm product triggers and absence of unrelated markdown activation. Capture returned capabilities and reported gaps.
- [ ] Run local-file discovery → invalidated hypothesis → no full-build route; approved scope → PRD/readiness → synthetic instrumented rollout record → inconclusive/negative value review. Synthetic evidence is clearly labelled; no production ROI claim.
- [ ] Run maintenance and incident routes; missing optional package/tool; stale/mismatched authorization revision; untrusted source instructions; prohibited path/data reference; and calculator boundary scenarios. Verify the observed result, not a wording anchor.
- [ ] Run consolidated structural, compatibility, and relevant existing tests once the candidate is stable: audit:sdlc, CLI validate:all, audit:skills, audit:keywords, check-alignment, audit:injection, freshness:audit, test:outcome, test:trace, affected CLI/MCP tests. Add product resource tests to the relevant gate via T08 if required.
- [ ] Keep permanent tests only for distinct consumer-visible regressions. Remove temporary consumers/smoke scaffolding; retain sanitized run/AC evidence. Return product source defects to their owning tasks, then rerun the affected scenario after correction.

**Acceptance:** AC coverage includes observed successful, boundary, and negative outcomes; actual resources/CLI/MCP exercised; compatibility suites pass or every failure is classified as blocking. No broad “verified” label for unexercised host authority. **Non-goals:** source repairs outside owned test/report paths, live customer experiments, or declaring eval efficacy/ROI from tests.

**Verification:** execute the actual consumer/transport scenarios above, then `rtk pnpm test:outcome`, `rtk pnpm test:trace`, and the approved exact CLI/MCP/product-resource test targets. Record commands, exit codes, installed paths, transport results, and per-AC outputs; a transcript-only walkthrough does not prove CLI/MCP execution.

### T10 — Blinded behavioral and trigger efficacy

**Depends:** T09. **Profile:** eligible Delivery coordinator for executable eval machinery; fresh isolated eligible answer-worker sessions; separate A grader. **Trace:** REQ-008; AC-015, AC-016. **Gate:** H2 before answer generation.

- [ ] Load canonical evals-run and current CONTRIBUTING policy. Plan selective manifests for the eight new skills plus behavior-changing existing inputs; freeze source/eval hashes, tool/data configuration, arm definitions, case count, model/effort, and expected fresh-answer count.
- [ ] Use existing manifest/estimate/preflight machinery before launch. Disclose host-default evaluator model if it differs from the approved profile; do not inherit the workflow's default silently. Verify the executor can route to the eligible account/model before spending.
- [ ] Evaluate new skills against clean no-skill arms; changed existing skills against current/candidate/no-skill where supported. Same eligible model/effort/tools/prompt/data per comparison, separate contexts, no expected-answer/assertion coaching. Use opaque trigger case IDs; trigger arms receive only name/description.
- [ ] Keep safety/approval assertions independently binding. Grader inspects behavioral decisions and executable evidence, not matching phrase counts alone. No edits to frozen evals/transcripts/historical results to make a score pass.
- [ ] Score/report/verify through existing tools. Current release policy: with-skill case pass **>85%**, assertion pass **≥85%**, delta **≥0**, trigger recall/specificity each **≥90%**; policy changes require their own approval. Report denominators, compromised arms, limitations, and unavailable cost separately.
- [ ] Return efficacy failures to the original owners. Any changed source/eval input starts a new compatible run and needs remaining-budget authorization; no automatic extra billable round or premium escalation.

**Output:** immutable compatible runs, trigger/behavior results, source hashes, grading record, and resource/cost evidence or explicit unavailable fields. **Acceptance:** thresholds and safety cases met; executable proof and transcript proof distinguished. **Non-goals:** generic SDK/provider refactor, unlimited eval retries, or financial ROI claims.

**Verification:** use `rtk pnpm evals:score -- --run RUN_ID`, `rtk pnpm evals:verify -- --run RUN_ID`, and `rtk pnpm evals:report` with the actual approved manifest run ID. Confirm compatibility hashes, denominators, trigger measures, graded safety behavior, and applicable thresholds. These are planned commands, not executed efficacy evidence.

**Resource rule:** maximum two live answer workers unless H2 explicitly changes it. Approve one named run with its computed answer count and token/currency cap when available; if unavailable, use a human-approved bounded answer/token limit, not a guessed monetary number. Approved model changes invalidate cross-model delta comparisons; run fresh compatible arms, never pool them as one experiment.

### T11 — Independent final review and release dossier

**Depends:** T10. **Profile:** fresh A; no implementation writes. Explicit write permission only for final-review/release-dossier documents. **Trace:** REQ-008, REQ-009, REQ-010; AC-015, AC-016, AC-018, AC-019, AC-020.

- [ ] Independently review the whole candidate against PRD ACs, technical contract, five Review Focus classes, source rights, optional install behavior, outcome compatibility, and profile/approval records.
- [ ] Read actual runtime/eval outputs and selected code/consumer artifacts. Implementer assertions are leads, not verification. Audit loaded skills before posting the review; ledger limitations do not become a fabricated compliance certification.
- [ ] Report finding → evidence → affected AC → owner → severity → required correction. Return changes to the owner; unresolved consequential disagreement blocks the dependent gate rather than being outvoted by agents.
- [ ] Produce a short human dossier: completed/pending ACs, source/license disposition, runtime/eval results, compatibility/consumer limits, costs when available, pilot prerequisites, candidate pins, rollback, and exact permissions requested.
- [ ] Keep implementation acceptance, efficacy acceptance, pilot authorization, publication, default adoption, and production activation as separate statuses. Present pilot decision to humans; no agent sign-off for them.

**Acceptance:** no unresolved blocking findings; every claim has inspectable evidence; humans can decide without reading every task transcript. **Verification:** reviewer records source/output references and independent spot checks, then human gate review. **Non-goals:** fixing code, auto-merging, granting permissions, or deciding real product ROI from synthetic fixtures.

### T12 — Real decision pilot and value review

**Depends:** T11. **Profile:** human PO/research/design/analytics/finance owners; optional A assistance only with approved data/account scope. **Trace:** REQ-005, REQ-010; AC-009, AC-010, AC-019, AC-020. **Gate:** H3 pilot approval.

- [ ] Nominate the product, PO, budget holder, evidence access, actual baseline, three initiative decisions proposed in the BRD, measurement windows, finance owner, and any separately authorized outreach/experiment exposure. Revise the pilot scope explicitly if fewer decisions are authorized; do not silently shrink it.
- [ ] Record baseline decision/handoff quality before treatment. Run the new discovery/validation chain only where relevant; capture effort/cost, uncertainty changes, decisions, guardrails, and displaced work.
- [ ] Before each approved rollout, register metric/query revisions, cohort/windows, owner, review trigger, and financial accounting boundary. Capture real events/observations; never infer them from agent prose.
- [ ] Conduct the first eligible value review. If cohorts/data are immature or costs/attribution are missing, report inconclusive/unavailable and the bounded next decision. A stopped bad bet is learning evidence, not automatically monetized avoided cost.
- [ ] Compare pilot outcomes against BRD-OBJ-001/002/003 and original investment assumptions; document adoption/overhead/rework and benefits with limits. Humans choose continue/change/stop; agents recommend only.

**Output:** authorized pilot ledgers and human-readable value reviews, with protected-store references instead of raw private material. **Acceptance:** critical decisions are traceable, commitment and measurement gates were respected, real results or explicit inconclusive results are reported. **Verification:** analytics/query/export proof, finance reconciliation when monetary claims exist, and human review. **Non-goals:** forced positive ROI, automatic schedules, or customer-system changes without matching authority.

### T13 — Publication and default-adoption decision

**Depends:** T12. **Profile:** human maintainer/release owner; no default worker launch. **Trace:** REQ-010; AC-020. **Gate:** H3 separate adoption/publication approval.

- [ ] Review candidate pins, live efficacy, pilot findings, rights/attribution, docs, shipped resources, upgrade/rollback, and current release policy. Keep repository publication separate from consumer activation.
- [ ] Decide publish opt-in / revise / do not adopt. Default installation is a separate decision; opt-in publication does not authorize modifying DEFAULT_WORKFLOWS.
- [ ] If publishing is explicitly approved, use deploy-release/project release workflow with authorized versions/tags/manifests and release-owner actions. No plan step implicitly runs publish/push/merge commands.
- [ ] Verify released consumer pins through native install/invocation after publication and check rollback to the previous approved pins. Any new publication defect returns to its implementation owner.

**Acceptance:** only approved actions occur; consumers can identify the released package and its capability/measurement limits; rollback evidence is available. **Non-goals:** retroactive approval, automatic broader rollout, or claiming a pilot proves universal efficacy.

**Verification:** match published versions/manifests to the approved candidate; run the T09 consumer-install/resource scenarios against the released pins and the rollback pins, under release-owner authorization. Record actual outputs and publication/activation status separately; a prepared manifest is not evidence of publication.

## 7. Acceptance coverage and review ownership

Requirement/AC meanings live in the PRD; this table maps ownership, not duplicate definitions.

| AC set | Implementation/behavior owner | Verification | Human accountability |
| --- | --- | --- | --- |
| AC-001, AC-002 | T01/T02/T07 | T09, T10, T11 | Product/research + engineering |
| AC-003 | T03 | T10, T11 | Product/research |
| AC-004 | T05 | T10, T11 | Product |
| AC-005, AC-006 | T04 | T09, T10, T11 | Finance/product |
| AC-007, AC-008 | T04/T06 | T09, T10, T11 | Budget/exposure authorizers |
| AC-009, AC-010 | T05/T06/T07 | T09, T10, T12 | Product/analytics/release |
| AC-011, AC-012 | T07 | T09, T10, T11 | Engineering/incident owner |
| AC-013, AC-014 | T08 | T09, T11 | Registry engineering |
| AC-015, AC-016 | T09/T10 | Independent T11 | QA/evaluation |
| AC-017, AC-018 | T00/T01 + orchestrator | Per-task review, T11 | Human sponsor |
| AC-019, AC-020 | T07/T08/T11/T12/T13 | T11 + human gate | Product/maintainer/release |

Every Delivery slice receives a fresh A review using its brief/ACs plus changed files and observed outputs. Separate spec compliance from implementation quality. Run neither review as the implementing session, and do not let an agent act as the required human approver. User policy limits corrective/fallback routing; generic unlimited “review until approved” loops do not override it.

## 8. Dispatch and result templates

### Copy-paste worker brief

The orchestrator supplies **actual approved values**, not unresolved placeholders. Extract the task's section from this document; do not send the entire conversation or unrelated project/customer context.

```text
Project: agent-skills-standard; approved project/workspace and account/data scope from T00.
Goal: the named task deliverable; canonical PRD and H1 technical-contract revisions.
Assignment: exact Txx card, its dependency artifacts, and approved REQ/AC/SRS links.
Profile: exact selected name/provider/model/mode/thinking/features from current discovery.
Permitted writes: task-owned paths only; new test/source paths require owner approval.
Inputs/interfaces: frozen schema/runtime/routing/financial contracts used by this slice.
Actions: execute checkbox steps; load AGENTS/project skills independently first.
Boundary: no delegation, unapproved design change, premium/provider change, contact/spend,
commit/push/publish/deploy, or human approval. Return material decisions to orchestrator.
Verification: exact focused commands and behavioral scenarios from approved brief.
Resource cap: actual approved cap and stop conditions; notify completion/blockers.
Return: changed files, AC results, commands/outputs, artifacts, risks, and decision needed.
```

For a reviewer, replace permitted writes with read-only implementation access and an explicitly allowed review report; state that implementation ownership belongs to a different session. Never send expected-answer labels/assertions to blinded answer workers.

### Profile materialization example — do not launch while gated

After eligibility and task authorization, D materializes as:

```json
{
  "title": "Product evidence T02 — shared contract",
  "provider": "omp/openai-codex/gpt-6-luna",
  "settings": { "modeId": "write", "thinkingOptionId": "high" },
  "workspaceId": "the T00-authorized task workspace ID",
  "initialPrompt": "the complete approved T02 worker brief",
  "notifyOnFinish": true
}
```

This is an explanatory template, not a runnable authorization or a workspace/profile substitution. Use the real task worktree ID and complete brief. Set notifications; continue disjoint work; no busy polling. Wait only when no independent work remains. Do not use native tasks, direct model calls, or existing sessions to bypass eligibility or premium controls.

### Required result record

- Task ID, actual agent identity/profile/model/effort, approved input revisions, workspace.
- Changed/created paths; any unowned change detected; dependencies consumed.
- Each AC: pass/fail/blocked/not exercised, with actual artifact/output pointer.
- Commands, exit codes, relevant observed outputs, fixture/data provenance, and runtime limitations.
- Independent reviewer identity/findings; correction and fallback history if applicable.
- Cost source and available usage; explicitly unavailable fields remain unavailable.
- Risks, unresolved material decisions, exact next owner/workflow. No “done” for partially implemented behavior.

Use existing Outcome Report v1 for workflow results; use task evidence as referenced artifacts rather than inventing new feature statuses. Completion events trigger orchestrator integration and verification, not automatic approval or next-stage sensitive actions.

## 9. Checkpoint acceptance, stop conditions, and evidence status

- **H0:** correct domain/account, data permissions, owners, design scope, intended execution method. Missing eligibility blocks dispatch, not plan drafting.
- **H1:** technical/source contract independently reviewed and human-approved; every implementation slice has exact inputs, write surface, AC, and focused verification. Freeze contracts before parallel work.
- **H2:** integrated runtime passes, compatible immutable eval plan, exact eligible generation model, known answer count, resource cap and concurrency. No auto `--execute` because a manifest exists.
- **H3 pilot:** independent dossier accepted plus real product/data/budget permissions. **H3 adoption:** pilot/eval evidence assessed; separate publication/default/activation scope. One H3 approval cannot be reused for the other.

Stop the dependent action for unresolved rights, unavailable required authority, path/data/account violation, guardrail/cost-cap breach, source-contract change, unowned edits, incompatible eval evidence, or blocking review disagreement. Continue genuinely independent safe work. New consequential design choices go back to T01/H1; no implementer invents a fallback architecture.

**Evidence status when this plan was written:** existing repo patterns, task surfaces, scripts, package conventions, profile discovery, and workspace registration inspected. Drafting did not implement packages/workflows/resources, install dependencies, launch workers/evals, contact customers, or publish. The previously observed missing-`tsx` audit failure remains an infrastructure prerequisite, not a failed product implementation test. Product efficacy and ROI remain unknown.

**Planning verification exercised:** a temporary dependency-free Node check passed for 14 unique task briefs, an acyclic task dependency graph, matching task-board/brief dependencies, 10 requirement IDs, all 20 ACs assigned verification owners, four profile-setting snapshots, 32 existing source/test/document surfaces, six local Markdown links, balanced fences, required brief fields, write-boundary entries, and pending approval. Ownership/join-barrier boundaries were also reviewed in the plan. This is document/coverage evidence only, not permission, runtime verification, workflow efficacy, or ROI. The MCP audit recorded 12 loaded project skills and no routed-category gaps in this planning turn; host token totals/rates were unavailable, so monetary cost is unavailable.

**Execution checkpoint:** T00/T01 complete/H1 approved. T02 stable12source/full-delta30fde934... plus corrected failure-history reportbafaa0ce.../supplement164504df... matched; no acceptance/consumer permission. T03 settled27source/full-delta de6dccc2... awaits new independent verdict. T04 completed230line99D1/d92d07... standard review requests3MajorSR1–3; T05 completed9138 standard review requests4MajorS1–4/NitN1. Latest usercontinue: read-only48Gi/89%/1%inode after repeatedENOSPC partial-journalfailure; old recentOMPactors permanentlyclosed. Fresh sameeligibleprofiles launched4775e76c(T02review),ef6d5fc0(T03review),6b4c8e53(T04remainingONE02A3correction),c96338fe(T05remainingONE4781correction), sourcecap2; original evidence/failures/authority retained, notnewqualityround. No journalcleanup/rootcause or recovered-persistence claim. T06–T09 joins/H2/H3/premium/commits/publication unchanged. Ledger `.superpowers/sdd/2026-10-11-product-evidence-sdlc/progress.md`.
