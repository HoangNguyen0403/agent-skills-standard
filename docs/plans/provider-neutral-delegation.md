# Delivery Plan: Provider-Neutral Delegation

slug: provider-neutral-delegation
status: implementing_after_approved_technical_design
operator_profile: technical
snc_tier: high
model_tier: strong
brief_approval: approved(requesting_operator, 2026-10-23)
execution_approach: Subagent-Driven (selected by requesting operator)
implementation_approval: approved(requesting_operator, 2026-10-23); D1–D5 approved after independent review
account_domain: Personal (confirmed by requesting operator)

Inputs: [approved direction](../brd/brd-provider-neutral-delegation.md), [PRD](../prd/prd-provider-neutral-delegation.md), [source review](../../artifacts/subagent-optimization-review.md). REQ/AC IDs below refer to the PRD, including its atomic suffixed scenarios. Source findings are F1–F10. This is an owner-aligned delivery decomposition, not a substitute for technical design or implementation authorization.

## Contract and shared boundaries

Goal: correct delivery/policy gaps, establish honest host support and measure accepted-task economics. Preserve all ten approved requirements; no requirement is silently postponed as an optional follow-up.

Canonical ownership: `skills/**`, `.agents/workflows/**` and implementation sources. Native agent directories are generated exports. No worker commits, recursive delegation, uncontrolled shared checks, account substitution, self-approval or automatic premium calls. Maintain source/delivery/verification evidence; cleanup must not destroy required receipts.

Workers receive only their owned scope, applicable global authority/invariants, settled dependency outputs, REQ/ACs, revision identity and verification commands. The eventual packet implementation must not be assumed available to safely dispatch its own task: explicitly provide those fields until verified.

Common acceptance: observable behavior/permission scenarios, not wording or source-copy assertions. Existing incidental wording tests are candidates for replacement/removal when touched; do not repin them. Tests complement, not replace, real changed-path smoke. Each implementation slice updates directly affected docs/changelog; final export work integrates the combined result.

## Task 0: Settle technical contracts

- Owner: engineering lead; independent architecture/security reviewer validates delivery-identity and authority decisions. Human maintainer approves high-risk design before coding.
- Requirements: REQ-001–REQ-010. Artifact: `docs/srs/srs-provider-neutral-delegation.md`, created by `design-solution`, with revisioned decisions and interface contracts.
- Decisions: (D1) trustworthy context identity/provenance and fallback without it; (D2) task packet schema, applicable-global-constraint selection and evidence revision; (D3) semantic host lifecycle/support matrix and transport/access proof; (D4) installed canonical workflow catalog and ownership; (D5) token/billing normalization and executable conformance evidence.
- D1 must not mistake a caller-supplied ID or protocol session ID for authentication. Decide whether verified per-context dedup is needed immediately or safe complete-body delivery is the initial behavior when identity is unavailable. Preserve the approved outward behavior either way.
- D3 must distinguish Claude Code, Codex, Copilot surfaces, Gemini and Antigravity; model vendor is not a host capability. Unsupported host operations remain explicit rather than fabricated.
- D5 must reuse existing SessionJournal/eval seams and state which provider-specific telemetry is truly available. No service/database/framework expansion without an approved scope change.
- Acceptance: every implementation owner has a settled shared contract and exact non-goals; unresolved consequential decisions identify affected task and accountable owner. No runtime/account evidence is invented.
- Dependency: none. Estimate: M / 5 points, medium confidence. No production changes.

## Task 1: Reconcile semantic delegation and worker bootstrap policy

- Owner: delegation-policy owner. Components: `skills/common/common-subagent-driven-development/**` (SKILL/references/evals only, not scripts); `skills/common/common-task-complexity-routing/**`; `skills/common/common-context-optimization/**`; `skills/common/common-decision-discipline/**`; `.agents/workflows/implement-feature.md`, `.agents/workflows/review-ticket.md`; `mcp/src/server.ts` instructions/registration surface.
- Requirements: REQ-003, REQ-004, REQ-006, REQ-010; F3/F5/F6/F7/F10.
- Change: semantic dispatch/wait/resume/collect rules; one model-tier vocabulary mapped by the host; explicit approved inline exception; meaningful freshness/batching boundaries; independent review retained; failure-specific recovery and premium authorization; durable-evidence-before-cleanup rule; bounded worker bootstrap distinct from parent intake.
- Interface: D3 operation names and required evidence; D1 delivery requirements referenced without assuming current global dedup is safe. Do not add named commercial profiles or runtime-specific tool names to canonical policy.
- Acceptance: AC-003, AC-110, AC-111; AC-004, AC-112–AC-115; AC-006, AC-119–AC-124; AC-010, AC-134, AC-136. Held-out scenarios cover missing context vs exhaustion, prohibited premium escalation, inline permission and preserved independent review.
- Verification: execute the assigned bootstrap/recovery scenarios with bounded synthetic inputs; inspect actual invocation/receipt evidence. Use skill evaluations as secondary evidence, not mere expected wording.
- Dependencies: Task 0. Estimate: M / 3 points, medium confidence.

## Task 2: Produce complete bounded task packets

- Owner: packet/helper owner. Components: `skills/common/common-subagent-driven-development/scripts/task_brief.py` and directly required helper interfaces; helper verification under `scripts/skill-tests/common-subagent-driven-development/` plus existing progress suite only if its contract changes. No policy/reference edits owned by Task 1.
- Requirements: REQ-002 and packet side of REQ-006; F2. Implement D2, do not invent a competing schema.
- Change: include applicable global authority/invariants, ownership, dependencies, ACs, revision and verification; reject incomplete required input; exclude unrelated tasks. Deliver file references only when accessible, with explicit failure for missing dependency artifacts.
- Acceptance: AC-002, AC-105–AC-108. Keep existing cumulative review, dirty-state/index preservation and receipt invariants intact.
- Verification: reproduce the existing global-constraint omission before the fix; smoke the actual helper on temporary multi-task inputs after the fix. Distinct cases: missing prerequisite, stale dependency revision, unrelated task exclusion. Preserve plausible behavior regressions rather than source-text assertions.
- Existing regression lanes: `rtk proxy python3 scripts/skill-tests/common-subagent-driven-development/test_review_package.py`; `rtk proxy python3 scripts/skill-tests/test_sdd_progress.py`. Derive the focused new packet command from the test entrypoint selected during design/implementation.
- Dependencies: Task 0. Can run alongside Task 1 with settled contracts and disjoint ownership. Estimate: M / 5 points, medium confidence.

## Task 3: Correct worker-context content delivery

- Owner: MCP delivery owner. Components: `mcp/src/tools/index.ts` skill-delivery path; `mcp/src/services/SessionTracker.ts`; transport plumbing in `mcp/src/http.ts` / `mcp/src/index.ts`; `mcp/test/Tools.spec.ts` and `mcp/test/http-transport.spec.ts`. Coordinate `mcp/src/server.ts` changes only after Task 1 settles that file.
- Requirements: REQ-001 and delivery side of REQ-010; F1. Implement D1, including revision binding and the safe no-trustworthy-identity behavior.
- Acceptance: AC-101–AC-104; AC-010, AC-136. Parent/sibling consultation cannot stand in for actual requesting-context delivery. Audit output distinguishes what is observed without falsely certifying receipt/enforcement.
- Verification: run the real MCP through a shared-server parent/child/sibling fixture and inspect returned bodies, including revision change and no trusted identity. Existing focused lane: `rtk pnpm --filter ./mcp test test/Tools.spec.ts test/http-transport.spec.ts`. Tests alone do not prove host propagation.
- Non-goals: introducing application authentication or trusting arbitrary IDs; broad unrelated MCP refactor; changing billing aggregation owned by Task 7.
- Dependencies: Task 0 and Task 1's `server.ts` settlement. Estimate: L / 5 points, low confidence until D1 is approved.

## Task 4: Unify installed workflow discovery

- Owner: workflow-install owner. Components: `mcp/src/services/WorkflowIndex.ts`, workflow tools in `mcp/src/tools/index.ts`, `mcp/test/WorkflowIndex.spec.ts`; existing CLI workflow install/sync path and corresponding consumer tests only as required by D4.
- Requirements: REQ-008; F9. Implement the settled provider-independent catalog; do not reverse-parse generated provider formats as new editable sources.
- Acceptance: AC-008, AC-129, AC-130; provider-only installation lookup and native export identity agree; missing workflow is honestly unavailable.
- Verification: actual temporary consumer installation/lookup for the configured provider-only layouts, including missing/removed catalog entries. Existing focused lane: `rtk pnpm --filter ./mcp test test/WorkflowIndex.spec.ts`; CLI consumer command narrowed to the actual existing sync/install test selected by the owner.
- Dependencies: Task 0; Task 3 settles `tools/index.ts`. Share CLI workflow install ownership with Task 5 by sequencing any overlap explicitly; no simultaneous edits to one source.
- Estimate: M / 5 points, low confidence until D4 defines install/publication ownership.

## Task 5: Correct native specialist exports and support declarations

- Owner: provider-export owner. Components: `cli/src/capabilities/agentCapabilities.ts`; `cli/src/services/utils/SpecialistTransformer.ts`; specialist sync; transformer tests; capability documentation generator/output. Workflow install files remain Task 4-owned until settled.
- Requirements: REQ-003, REQ-005; F4/F5. Implement D3 using current native documentation and version-pinned evidence, including Copilot native-agent shape and honest unsupported/partial permission projection.
- Acceptance: AC-109, AC-110; AC-116–AC-118. Serialization is necessary but not sufficient. Host/surface/version evidence establishes what can actually nest, access artifacts, restrict tools and complete bounded work.
- Verification: `rtk pnpm --filter ./cli test src/services/utils/__tests__/SpecialistTransformer.spec.ts src/services/utils/__tests__/WorkflowTransformer.spec.ts`; then authorized synthetic native discovery/invocation/denial scenarios per supported surface. Never use real confidential context to probe an ineligible route.
- Dependencies: Task 0. May run alongside Tasks 1–3 under disjoint ownership. Task 4 and this owner settle any shared sync component sequentially. Estimate: L / 8 points, low confidence; native availability affects qualification, not permission to claim parity.

## Task 6: Tighten worker standard selection

- Owner: worker-bootstrap/routing owner. Components: exact implicated canonical keyword/composite metadata, `mcp/src/services/SkillIndex.ts` only if necessary, `mcp/test/SkillIndex.spec.ts`. Keep Task 1 policy changes separate; do not duplicate the bootstrap source.
- Requirements: REQ-010; F10. Use known file/skill scope and bounded worker bootstrap, repair demonstrated routing collisions rather than shortening every skill or removing applicable guardrails.
- Acceptance: AC-134–AC-136 with positive/negative held-out routing cases; required worker body delivery remains intact through Task 3.
- Verification: `rtk pnpm --filter ./mcp test test/SkillIndex.spec.ts`; exercise actual scoped MCP lookups corresponding to observed irrelevant standards and required positive cases. Record changed routing without claiming a catalog-wide false-positive improvement from a handful of cases.
- Dependencies: Task 0 and Task 1 bootstrap contract. Can run alongside Task 3 when source ownership stays disjoint; shared MCP checks wait for settled edits. Estimate: M / 5 points, medium confidence.

## Task 7: Qualify lifecycle and full-task economics

- Owner: telemetry/evaluation owner; independent acceptance reviewer remains separate. Components: existing SessionJournal/telemetry adapter and tests; `scripts/evals/**`; `scripts/harness-smoke/**` where existing host discovery can be extended without a second runner. Coordinate edits to `mcp/src/tools/index.ts` only after Tasks 3–4 settle it.
- Requirements: REQ-005, REQ-006, REQ-007; F4/F8. Implement D5 and evaluate the combined behavior, not only prompt answers. No new universal execution service.
- Acceptance: AC-116–AC-118; AC-121, AC-122, AC-124; AC-125–AC-128. Evidence covers parent/workers/review/failed and cancelled attempts, unknown fields, provider normalization, same-task resume and noncompletion on timeout.
- Verification: existing deterministic lane `rtk pnpm test:harness`; actual native discovery smoke is separate and does not count as delegation parity. Run approved synthetic delegation scenarios and matched repeated baseline/current/proposed trials only on eligible accounts under separately approved resource limits. No paid trial is authorized here.
- Promotion criterion: all deterministic contract/authority cases pass; no observed required-behavior/review regression on held-out tasks; complete coverage for savings claims; owner accepts measured task-class cost/quality/latency tradeoffs. Unknown usage means no savings claim, not invented zero-cost results.
- Dependencies: Task 0; telemetry fixture preparation may proceed independently after D5; integrated qualification needs Tasks 1–6 settled. Estimate: L / 8 points, low confidence due to provider access/telemetry variation.

## Task 8: Integrate, regenerate and publish acceptance evidence

- Owner: integration/release owner. Own generated exports, root architecture/contribution/changelog integration and final trace/evidence documents; do not hand-edit generated mirrors.
- Requirements: REQ-009 and final trace for all REQ/ACs.
- Acceptance: AC-131–AC-133; every PRD AC has an observed result or an explicit outstanding qualification that prevents a complete-support/promotion claim. No partial scope is labeled finished.
- Verification: after all canonical owners settle, run `rtk pnpm generate-indices` and examine diagnostics because caught sync failures may not fail the process. Run transformer parity and `rtk pnpm docs:capabilities:check`; use the project's required final checks once with no peer mutations. `check-alignment` checks lexical eval alignment, not export parity or runtime success.
- Evidence: immutable source revision, changed behavior and focused results, native support matrix, complete/incomplete usage report, human approvals and last approved rollback revision. Publication status and activation status remain separate.
- Dependencies: Tasks 1–7. Estimate: M / 5 points, medium confidence. Release/merge/activation still require matching approval.

## Delivery graph and scheduling

Task 0 -> {Task 1, Task 2, Task 5}; Task 1 -> {Task 3, Task 6}; Task 3 -> Task 4; Tasks 1–6 -> integrated Task 7 -> Task 8.

Task 7's deterministic fixture/normalization preparation may overlap independent work after D5 settles. This is preparation within its assigned ownership, not premature acceptance of unimplemented paths. Any Task 4/5 sync overlap is assigned to one owner and sequenced.

Concurrent writes require disjoint ownership or isolated workspaces. Shared MCP/CLI verification runs against settled snapshots only. Worker focused checks run in their owned settled environment; final integration checks run once after all applicable edits settle. Later edits invalidate affected evidence.

Estimate: 49 provisional relative points including Task 0 (5+3+5+5+5+8+5+8+5); overall confidence low until design and host/account availability are known. These are planning estimates, not elapsed-time, spend or delivery commitments.

## Technical-design and authorization gates

- Next workflow: `design-solution`; produce reviewed D1–D5 contracts before implementation.
- Then `implementation-readiness`: confirm owner assignments, trace, executable verification lanes, account eligibility and required human approval.
- Only then settle execution approach. Recommended: Subagent-Driven with bounded owners and independent acceptance. Inline is not selected by the earlier “ok”; any exception requires its applicable host-policy gate.
- Resolve actual authorized project/profile domain before implementation delegation. Existing profile names are host configuration, not proof of this project's eligibility. No implementation context is sent to an unresolved route.
- Native qualification and repeated model trials need available approved accounts, pinned host versions, synthetic inputs and an explicit resource cap. Missing access blocks those acceptance runs only; deterministic repository work remains actionable after its design/execution authorization.
- Premium advice is neither required nor authorized by this plan. No retry counter or “strong” hint changes that.

## Planning verification and status

Grounding: reused source review rather than repeating broad discovery; two bounded read-only lookups confirmed existing commands, helper entrypoints and trust seams. Listed implementation/test/native commands are planned, not executed during this planning turn.

Planning validation: verify local document links, coverage of REQ-001–REQ-010 and parent AC groups, unique task numbers, dependency ordering and absence of implementation authorization. Validation does not establish implementation behavior or passing future tests.

feature_status: requirements_ready
completed_evidence: direction approval; atomic PRD scenarios; bounded task ownership/dependencies; source-derived verification lanes
missing_evidence: D1–D5 design approval; implementation approach and eligible owners; implementation results; authorized native qualification and task economics
recommended_next_workflow: design-solution
cost: unavailable (host usage/pricing not supplied)
