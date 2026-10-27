# Implementation Plan: Context-aware delegation

Date: 2026-10-26
Slug: `context-aware-delegation`
Requirements: `docs/prd/prd-context-aware-delegation.md`
Status: implementation approved and integrated (Tasks 1-4 settled; source acceptance receipts and integration evidence under `artifacts/context-aware-delegation/`). Final acceptance outcome is tracked in `artifacts/context-aware-delegation/final-evidence/correction-run2/STATUS.json`; no Task 5 verdict is claimed here. A post-integration correction run regenerated host category indices from the complete mirror inventory after the first pass omitted two common rows.
Execution approach: Subagent-Driven (selected by maintainer); no repeated approach question required
Scope: repository guidance, narrowly scoped skill metadata, regression/eval scenarios, generated integration and independent verification
SNC: S=2 N=1 C=2 total=5 tier=high; capability hint is not spend authorization

## Authority and execution contract

This plan does not itself change the current host's instructions. In particular, workers must not use the proposed main-loop policy to bypass today's dispatch, review, account or approval gates. The maintainer requested a plan, not implementation or paid experiments.

The orchestrator owns requirements, final decisions, shared contracts, eligibility and integration. Workers execute bounded briefs, do not recursively delegate, do not commit, and do not alter personal/global configuration. Independent reviewers are separate from implementation owners. Do not weaken tests or approvals to make an economical route pass.

Project: agent-skills-standard. Workspace: the current authorized checkout resolved at dispatch, not a hardcoded workstation path. Account domain must be established from authorized host/project configuration before sending implementation context. A model/provider prefix alone is not eligibility evidence.

### Shared contract C1: delegation placement

Use the PRD decision table as the single product contract. Canonical policy lives in `skills/common/common-subagent-driven-development/SKILL.md`; detailed examples live in its references. Other workflows reference it rather than independently restating divergent routing rules. Main-loop execution is conditional on host permission. If delegation is required, keep tightly coupled implementation in one bounded worker rather than a chain of planners/fixers. Required independent verification survives either placement.

### Shared contract C2: model and effort guidance

Canonical selection guidance belongs to `skills/common/common-task-complexity-routing/`, with SDD referencing it. Keep SNC sensitivity/review floors unchanged. Capability hints are not account authorization. The host resolves approved profiles, supported effort and authorized fallback; explicit settings are never silently overridden. Do not add a model-resolver service, pricing API or mandatory assignment schema field in this release.

Extend receipt guidance, using existing records rather than another telemetry store, to cover: requested capability, actual provider/model/effort when observable, effort support, selection reason, eligibility/authority reference, budget availability and substitution/fallback reason. Unknown stays unknown. User preference examples are guidance, not a new persisted configuration interface.

### Shared contract C3: evidence and economics

Count the accepted task, including parent, workers, independent reviews, repairs and failed/cancelled attempts. Distinguish tokens, billed money, subscription/quota consumption and elapsed time. Reuse `ARCHITECTURE.md` task-economics contracts. No numerical savings without complete comparable actor coverage and prices; offline fixtures do not establish model efficacy.

### Shared contract C4: write ownership and verification

Tasks 1, 2 and 3 have disjoint owned paths and may run concurrently after approval and valid packets. Do not edit another owner's files. Cross-task needs are reported to the orchestrator, not fixed opportunistically. Workers skip mid-flight build/lint/test/formatter runs; after the batch settles, the orchestrator runs covering checks once against a stable revision and requests corrections. If later edits occur, affected evidence must be refreshed. Independent review remains required for each slice and the final integrated branch under current policy.

## Dependency graph and effort sizing

```text
Maintainer approval + eligible profiles + valid assignment packets
                |
         +------+------+ 
         |      |      |
       Task 1 Task 2 Task 3   (parallel, disjoint source owners)
         +------+------+ 
                |
       settled-revision checks + independent slice reviews
                |
             Task 4          (single integration/generator owner)
                |
             Task 5          (independent final acceptance)
                |
       repository handoff; live experiment separately authorized
```

| Task | Role | Dependencies | Size / confidence | Capability / effort request |
| --- | --- | --- | --- | --- |
| 1 | Delegation-policy implementer | Approved C1-C4 | M / medium | standard; host-supported medium unless configured otherwise |
| 2 | Capability-guidance implementer | Approved C1-C4 | M / medium | standard; host-supported medium unless configured otherwise |
| 3 | Trigger-precision implementer | Approved C1-C4 | S / high | fast eligible implementation profile; preserve configured effort |
| 4 | Integration/evidence owner | Accepted 1-3 | M / medium | standard; preserve configured effort |
| 5 | Independent acceptance reviewer | Integrated 4 | M / medium | eligible analysis/review profile; no automatic premium |

These are comparative sizes, not promised time or cost. Use current host profile discovery and routing policy at dispatch; do not pin today's commercial model names into canonical source. Model/effort requests do not override profile settings. If a suitable eligible profile is absent, stop that dispatch rather than substituting an account.

## Task 1: Replace blanket delegation with a context-benefit decision

**Goal:** Implement requirements 1 and 2, criteria 1 through 6, preserving C1-C4.
**Owner:** one delegation-policy implementer.
**Depends on:** maintainer approval and dispatch prerequisites only.

**Owned paths:**
- `skills/common/common-subagent-driven-development/SKILL.md`
- `skills/common/common-subagent-driven-development/references/methodology.md`
- `skills/common/common-subagent-driven-development/references/templates.md`
- `skills/common/common-subagent-driven-development/references/progress-receipts.md`
- `skills/common/common-subagent-driven-development/evals/evals.json`
- `.agents/workflows/implement-feature.md`

**Required standards:** canonical SDD; common decision discipline; common task-complexity routing; skill-authoring/eval standards routed for these files; `agent-skills-eval-pressure-cases` when editing pressure cases.

**Change:**
1. Add the context-benefit decision before choosing execution placement. Named benefits: independent parallel work, measured context pressure, required independent verification or real host-enforced permission isolation. A label, file count or another checklist item is not sufficient.
2. Distinguish one implementation context from one actor for the entire lifecycle. Main-loop implementation can still require a separate reviewer. Under a delegation-only host, one coherent worker can retain coupled steps.
3. Keep approval, sensitivity, lifecycle, bounded ownership, failure classification and review requirements intact. Resolve the current overly narrow BLOCKED wording in implement-feature to agree with missing authority/context/standards prerequisites.
4. Update examples and the implement-feature entrypoint to reference the canonical placement decision; do not duplicate a second decision table. Explicitly retain the final whole-branch independent-review gate.
5. Add contrasting behavior cases for coupled work, independent parallel slices, host-required delegation, missing isolation, required review and spurious stage-based agents. Use semantic assertions, not exact prose snapshots. Retain existing authority/fallback regression scenarios.

**Non-goals:** changing task_brief.py schema, reducing required review coverage, editing model-tier policy, changing current host instructions.
**Verification lane:** settled-revision eval infrastructure checks plus manual/scorer contrast cases, listed below. Offline scoring is not a live efficacy claim.
**Return:** changed paths; criteria 1-6 evidence map; decision examples; any consumer outside owned paths requiring integration; unresolved contradictions. No commits.

## Task 2: Add provider-neutral model and effort selection guidance

**Goal:** Implement requirements 3 and 4, criteria 7 through 14; support criterion 18.
**Owner:** one capability-guidance implementer.
**Depends on:** approved C1-C4 only; no dependency on Task 1 output.

**Owned paths:**
- `skills/common/common-task-complexity-routing/SKILL.md`
- `skills/common/common-task-complexity-routing/references/routing-table.md`
- `skills/common/common-task-complexity-routing/references/snc-rubric.md`
- `skills/common/common-task-complexity-routing/evals/`

**Required standards:** common task-complexity routing; canonical SDD; decision discipline; routed skill-authoring/eval standards.

**Change:**
1. Keep capability (`fast|standard|strong`) separate from thinking effort. Recommend the least expensive eligible configuration adequate for the task and its verification burden, not the cheapest model categorically.
2. Supply examples for deterministic tools, bounded implementation, ambiguous investigation and consequential review. A small edit does not lower sensitivity floors.
3. Describe host-owned resolution of eligibility, explicit configured settings, supported effort, user preference and budget uncertainty. Unknown support must be reported, not mapped silently. Do not assume equal effort semantics across vendors.
4. Define the C2 receipt guidance in a reference and link it from SDD integration; no new runtime schema or telemetry store. Explain API cost versus subscription/quota and complete task cost including repair.
5. Retain distinct recovery paths for missing prerequisites, defective output and observed provider exhaustion; premium remains separately approved, bounded and analysis-only.
6. Add behavioral scenarios for unsupported effort, unknown quota/pricing, explicit profile preservation, unauthorized cheap account, strong-not-premium and one-corrective-assignment behavior. Ensure relevant LLM model-tier/effort requests can discover this skill without introducing a broad bare `model` trigger.

**Non-goals:** runtime auto-routing, new provider APIs, actual profile mutation, new spending permission, hardcoded commercial profiles.
**Verification lane:** capability eval scenarios plus Task 3 repository-backed discovery checks, scored after sources settle.
**Return:** criteria 7-14/18 evidence map; canonical reference anchors for Task 1/4; advisory-versus-enforced limitations; no commits.

## Task 3: Fix unrelated model-trigger loading without changing the matcher

**Goal:** Implement requirement 5, criteria 15 through 18.
**Owner:** one metadata/regression implementer.
**Depends on:** approved C1-C4 only. Task 2's new trigger expectations are checked at integration, not assumed while it is editing.

**Owned paths:**
- `skills/database/database-mongodb/SKILL.md`
- `skills/laravel/laravel-eloquent/SKILL.md`
- `mcp/test/SkillIndex.spec.ts`

**Read-only implementation context:** `mcp/src/services/SkillIndex.ts`, `mcp/src/services/SkillParser.ts`.
**Required standards:** routed TypeScript/testing standards, skill-authoring metadata rules, canonical task-complexity routing for target intent.

**Change:**
1. Remove/qualify ambiguous bare `model` triggers in both database skills. Retain framework-specific discovery through existing mongo/mongoose/eloquent/laravel terms and explicit qualified model phrases where necessary.
2. Extend the existing canonical-repository regression suite, not a mocked copy of metadata. Cover `model routing`, `LLM model selection`, `thinking level`, `model tier`, explicit MongoDB/Mongoose model requests and Laravel/Eloquent model requests. Include mixed/case variants where meaningful.
3. Assert absence of the two unrelated database skills for LLM intent and presence of the expected domain skill for qualified domain requests. Preserve legitimate multi-intent routing: an explicit MongoDB request combined with LLM routing should still discover MongoDB.
4. Do not replace the boundary matcher, add negative-keyword schema or special-case the exact reported string in code. If metadata cannot satisfy the ACs, report the concrete counterexample for orchestrator decision.

**Non-goals:** generic keyword cleanup, all-category trigger redesign, unrelated bare `scope`/`with` changes.
**Verification lane:** `rtk proxy pnpm --filter ./mcp test -- test/SkillIndex.spec.ts`; real canonical SkillIndex invocation with negative/positive phrases in a disposable local smoke, after the batch settles.
**Return:** changed metadata and behavior tests; before/after routed IDs from the smoke; AC mapping; any intended discovery compatibility change. No commits.

## Task 4: Integrate canonical changes, exports and evaluation protocol

**Goal:** Implement requirement 6, criteria 19 through 22 and verify integrated criteria 1-18.
**Owner:** one integration/generator worker; no concurrent writers.
**Depends on:** accepted Tasks 1-3 and their independent review evidence.

**Owned paths:**
- `ARCHITECTURE.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md` if present at dispatch; otherwise the repository's discovered existing changelog, explicitly added to the assignment before mutation
- New `docs/validation/context-aware-delegation-protocol.md`
- Generated mirrors/index/capability outputs: only exact paths discovered and allowlisted by the orchestrator after reading the generator rules; never repository-wide ownership

Tasks 1-3 source files are read-only to this owner. Corrections go back to the original owner, then affected checks are refreshed.

**Required standards:** `agent-skills-standard-integration-gates`, `ags-generator-safety`, `sdd-evidence-preservation`, `agent-skills-eval-pressure-cases`, applicable documentation and evidence-status guidance.

**Change:**
1. Update architectural and contributor guidance to the same C1-C3 contract. Remove/qualify affected unmeasured savings or zero-cost claims; do not broaden into unrelated documentation cleanup.
2. Add release-note wording describing proposed repository behavior and observed verification only. Do not claim host activation, sandbox enforcement or live model savings.
3. Write the ten-scenario protocol below, recording conditions, repetitions, acceptance, accounting coverage and explicit authorization prerequisites. Reuse existing eval infrastructure; do not build a benchmarking platform.
4. Inventory consumers and generated output paths before generation. Protect existing SDD evidence. Use the documented scratch/allowlisted copy-back flow for generators; never edit generated mirrors by hand or permit unrelated output churn.
5. Run covering checks once after integration settles; run actual MCP routing smoke against canonical content. Classify pre-existing failures separately without suppressing them. Stop release readiness on unresolved affected regressions.

**Non-goals:** host activation, paid eval execution, runtime provider selection, changing archived evaluation results, unbounded generated cleanup.
**Verification lane:** run the settled-revision command list and actual canonical-index smoke below; validate generated alignment and preserved evidence under the required integration skills.
**Return:** exact source/generated path list; check commands/exits; smoke output; protected-evidence confirmation; offline/live distinction; updated AC ledger and remaining approval boundaries.

## Task 5: Independently verify the integrated result

**Goal:** Independent final acceptance for all 22 criteria; no implementation ownership.
**Owner:** eligible analysis/review agent distinct from Tasks 1-4.
**Depends on:** Task 4 stable integrated revision, original baseline, PRD, cumulative review package and verification receipts.
**Owned paths:** only its explicitly assigned review report under the orchestrator's evidence directory. All source and generated artifacts are read-only.
**Required standards:** code-review/verification guidance, canonical SDD, the PRD and C1-C4, evidence-status guidance.

**Review:**
1. Check every AC against source and observed evidence, not worker completion claims. Trace each changed generated surface to canonical intent.
2. Challenge accidental approval weakening, forced unnecessary delegation, assumed provider equivalence, silent effort substitution and incomplete economic accounting.
3. Inspect scenario coverage for both negative and positive routing. A textual rubric result alone cannot prove actual model adherence.
4. Confirm no paid runs, account/profile changes, source-evidence deletion or unsupported enforcement claims occurred.
5. Report pass/fail/not-verified per AC with concrete references. Independent review cannot approve human policy changes, spend or deployment.

**Verification lane:** inspect integrated commands/smoke evidence; request a targeted rerun only when missing/stale evidence prevents acceptance. Do not rerun known failures merely to confirm them.
**Return:** review report, blocking findings with path/line and failed AC, accepted limitations and readiness recommendation. Fixes return to the original owner and undergo cumulative re-review.

## Verification commands and evidence discipline

Run from the repository root at a settled revision. These are existing command entrypoints; this planning turn does not claim they passed. Recorded integration evidence for the settled revision lives in `.agent/sdd/context-aware-delegation/task-4-report.md` and `artifacts/context-aware-delegation/final-evidence/`.

```sh
rtk proxy pnpm --filter ./mcp test -- test/SkillIndex.spec.ts
rtk proxy python3 -m unittest discover -s scripts/skill-tests/common-subagent-driven-development -p 'test_*.py'
rtk proxy pnpm test:evals
rtk proxy pnpm evals:audit
rtk proxy pnpm audit:keywords
rtk proxy pnpm audit:skills
rtk proxy pnpm audit:sdlc
rtk proxy pnpm check-alignment
rtk proxy pnpm validate
rtk proxy pnpm docs:capabilities:check
```

The Python suite is a no-regression gate, not permission to modify the packet schema. The eval audit validates metadata/scoring inputs, not live skill effectiveness. Check tool help for scoped scorer/preflight arguments before running them; do not invent CLI flags.

Runtime smoke: invoke the actual SkillIndex loading canonical `skills/`, query the negative and positive phrases in Task 3, and capture returned IDs. Reuse the repository's harness pattern or a disposable script outside tracked source; remove that disposable artifact after proof. Tests alone are not the smoke result.

Generator commands are mutating and run only under Task 4's preservation/allowlist procedure:

```sh
rtk proxy pnpm generate-indices
rtk proxy pnpm docs:capabilities
```

## Ten-scenario controlled comparison protocol

Scenarios: (1) deterministic text transformation; (2) coupled API/consumer update; (3) independent component changes; (4) bounded large-context research; (5) ambiguous debugging; (6) sensitive change requiring independent review; (7) explicitly configured model/effort; (8) unsupported effort; (9) unavailable or ineligible preferred provider; (10) unknown pricing/incomplete usage.

Phase A changes only execution placement: current delegation versus context-benefit placement, same task/revision, eligible model/effort, tools, limits and ACs. Phase B holds the accepted placement and effort fixed while comparing eligible capability choices. Phase C holds model and placement fixed while comparing supported effort settings. Do not change all three at once.

Minimum pilot: three matched repetitions per scenario per arm. Record cache conditions and execution order; rotate arm order where feasible. Report per-case flips and sample size; a small pilot is not statistical proof. Use synthetic authorization fixtures for dangerous/provider-failure cases, clearly labeled; never exercise real unauthorized actions.

Metrics: task acceptance, critical gate violations, repair attempts, parent/worker/reviewer actor inventory, elapsed time, input/cached/output/reasoning tokens with billing semantics, price provenance and monetary coverage. Unknown quota remains unknown. A candidate with any observed critical authority or acceptance regression is rejected; any other acceptance regression requires investigation rather than being hidden by an average. Efficiency improvement claims require complete comparable measurement for the claimed metric.

Live execution requires separately recorded provider/account eligibility, exact model/effort, maximum runs, spend/usage ceiling, expiry and human approval. Without it, finish the protocol and offline scorer checks, mark live results not_run, and do not activate a new runtime default.

## Dispatch packaging and worker response contract

This document supplies task boundaries; it is not an authorized assignment JSON. Before each dispatch the orchestrator must:

1. Resolve workspace, project/account domain, eligible profile and human scope approval. Preserve configured model, effort, mode and features.
2. Record baseline revision and dirty identity; hash the exact plan, owned source files and required standards. Reuse existing canonical task_brief.py schema v1, not a second manifest format.
3. Populate every required manifest field: schema_version, task_id, task_number, goal, owner, project_domain, workspace_root, plan_sha256, non_goals, authority, global_invariants, owned_paths, acceptance_criteria, verification, required_standards, source_revision, dirty_identity, source_files, dependencies, output_contract and limits. Copy C1-C4 and relevant PRD ACs into the standalone packet; do not assume workers inherit this chat.
4. Resolve broad owned directories to exact bounded paths where possible; include required standards and dependency receipts with current identities. Add generated-path allowlists only after inventory. Limits must be concrete authorized values or explicitly advisory/unavailable, never invented host enforcement.
5. Publish using the existing helper, whose declarations do not authenticate approval or create a sandbox:

```sh
rtk proxy python3 skills/common/common-subagent-driven-development/scripts/task_brief.py docs/prd/prd-plan-context-aware-delegation.md TASK_NUMBER --assignment ASSIGNMENT_JSON --out BRIEF_FILE
```

TASK_NUMBER, ASSIGNMENT_JSON and BRIEF_FILE are command parameters to resolve from the current authorized assignment, not ready-to-run literal paths. Expect exit 0 for valid publication; missing/stale authority or identities must be resolved before dispatch, not bypassed.

Enable completion notifications; do not poll. Worker replies contain task/actor/source revision, terminal state, changed paths, AC evidence, actual verification commands/results or not_run, configuration/limitations, and unresolved risks. Use `completed`, `needs_context`, `blocked`, `failed` or `cancelled` truthfully. No recursive dispatch, premium self-escalation, commits or deployment.

## Completion and approval boundary

Plan complete means all tasks have one owner, disjoint concurrent paths, traceable ACs, verification lanes and dispatch prerequisites. Implementation complete means all ACs are accepted against the integrated revision, generated outputs are aligned, required reviews are independent and evidence remains durable. Live efficacy/savings remains not_verified until separately authorized comparisons finish.

Approval boundary: repository execution was approved and carried out through Task 4; merge, deployment, host adoption and paid experiments remain separately authorized. Whether "implementation complete" holds for every AC is decided by independent final acceptance and recorded in the final-evidence status record, not asserted by this plan. No new architecture/service is needed for this bounded guidance release; any proposal to add runtime routing or authority enforcement returns for technical design and separate approval.
