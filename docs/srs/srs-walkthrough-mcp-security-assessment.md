# Design Walkthrough: MCP Security Assessment

Scope: design-document evidence only. No implementation, target assessment, model exercise, dependency installation, generated publication or release was performed.

## Authority and Artifacts

- Requesting operator approved the presented PRD for technical design on 2026-11-10. Exact pre-approval PRD SHA-256 was observed as `e18701d94b6a57437262ef21ff4588d2fc68dc5cdfef0d5d0575399a293ca488` before its approval annotations were edited.
- PRD annotations now record approved requirements/AC scope and retain the implementation/model/runtime boundaries.
- [SRS](srs-mcp-security-assessment.md) approved by requesting operator on 2026-11-10 for implementation-readiness only. Approved pre-annotation SHA-256: `4f8e9518be3ae8081d90f7bd445aafe35f7b7d0f13f30f5f9a9eef9dcf7642fc`. This establishes design_ready, not coding, runtime, account or publication authority.
- The original BRD and PRD remain authoritative for intent and behavioral criteria. SRS requirement cards own their technical verification references; this walkthrough does not add a second test matrix.

## Grounding Actually Performed

- Read architecture registry→CLI→consumer ownership and existing ADR-005/012/014/015/018/019/022 boundaries. Host enforcement is outside portable Markdown.
- Read product/software-requirements standards, SRS template, approved PRD ACs and canonical evidence/authorization references.
- Read the existing verification-kit README: its actual supported surfaces are local CLI/API installation, catalog/discovery and offline doctor, not native model invocation or target enforcement.
- Independently scoped mechanism lookup inspected the actual disposable-consumer installation/catalog path, evaluation/reporting limitations and capability evidence contract. It found no evidenced native-host procedure satisfying the proposed instrumented exercise.
- Independent data-contract lookup inspected canonical evidence/report owners, no-clobber precedent and embedded ADR conventions. Parent additionally inspected `offline-export.md:36-51` and `scripts/evals/reporter.ts:399-405`; these do not supply an MCP sandbox or prove tool-free evaluation.
- Adopted no-clobber as a host-bound contract with explicit failure, not an assertion that the current generic write tool provides it.

## Design Checks

The SRS defines input identity and transfer eligibility, inventory attributes, coverage aggregation, canonical finding-status reuse, source/fidelity binding, Markdown report sections, no-clobber concurrency behavior, optional package ownership, native consumer procedure, failure/rollback and an embedded proposed ADR. Nine technical requirement cards reference all five PRD requirements and all sixteen PRD ACs. This is document linkage, not executable behavioral coverage.

Independent safety check found no consequential omission/contradiction against the PRD and canonical evidence semantics. Independent delivery check found explicit coverage of all PRD ACs, one VER mapping per technical card and no consequential scope expansion. It identified an abbreviated trace-maintenance issue, now corrected to match card source edges, and noted the walkthrough/receipt were not yet present during its concurrent read. This walkthrough and the final receipt are persisted by the parent before handoff; no absent file was used as proof. Neither check exercised installation, native models, host controls, persistence behavior or target security.

## Unrun Lanes and Readiness Ownership

| Lane | Actual state | Meaning / owner |
| --- | --- | --- |
| Source skill/workflow implementation | NOT RUN | No new runtime guidance resources authored; Engineer owns S1 after approvals |
| Generation/catalog installation | NOT RUN | Integrator must verify the new exact resources; prior generic kit cases are insufficient |
| Native consumer/model report | NOT RUN | QA/host operator must bind versioned native host, eligible provider/account, explicit resource/data authorization and independent oracle |
| Host effect/permission/no-clobber proof | NOT RUN | Host operator supplies actual capability/denial/observation evidence; no universal support claimed |
| Live MCP/target security | NOT ASSESSED | Excluded from this offline delivery; report generation cannot imply server health |
| Target production/fleet/runtime activation | NOT AUTHORIZED | Separate future scope, not an implicit follow-on |
| Scoped outcome receipt audit | PASS after authorized dependency restoration | Exact prior readiness run matched; three records checked, one matched, no issues. Record-schema-and-scope validity only; full kit/build/native behavior not assessed |
| Human design acceptance | APPROVED, readiness scope only | Requesting operator, 2026-11-10; no implementation or exercise acceptance |

Safe supplied-artifact reasoning is not blocked by missing live-target controls. Actual S1 acceptance remains incomplete until installed-native discovery/report behavior and the affected effect boundaries are observed. Creating source artifacts alone does not satisfy that contract.

## Handoff

SRS approval permits implementation-readiness review only. Readiness separately resolves execution approach, named eligible owner, tooling, independent oracle and model-driven consumer exercise authority/host proof. No paid trial, scanner procurement, target process/endpoint invocation, merge, remote publication or deployment is authorized.

Receipt: `artifacts/runs/mcp-security-assessment/d92d4c92-c706-401f-90f5-41865d78316c.json`. Host token usage/prices and complete actor costs are unavailable; no numerical total/savings claim.

## Implementation Readiness

Historical readiness snapshot. Later scoped implementation authority and observed repository checks are recorded under [Repository Delivery Results](#repository-delivery-results); the missing native-host/model proof is not silently cleared.

Verdict: **BLOCKED for S1 execution**, while preserving approved lifecycle **design_ready**. No independent implementation slice is declared READY. D0 is completed design work, not a runnable feature; O0 is an explicitly typed oracle prerequisite, not a substitute completed assessment. S1 remains one end-to-end feature and is not split into “source-only complete” layers.

### Approved and Testable

The matching BRD, PRD and SRS carry outcome, scope/exclusions, accepted owner roles, stable IDs, observable criteria, failure handling and scoped human approvals. Independent document checks found no consequential behavioral omission after recorded corrections. Design approval does not prove the proposed consumer environment feasible or tested.

### Verification Levels

These references classify the existing canonical criteria; their behavior and authoritative VER mappings are not redefined here.

| V-model level | Canonical criteria and evidence | Readiness |
| --- | --- | --- |
| Acceptance | AC-MCP-01..16; independent security/QA review of actual reports plus operator delivery acceptance | Contract testable; no delivery acceptance observed |
| System | AC-MCP-01..12,14..16 through installed native workflow-to-report and effect observations; SRS VER-MCP-01..07/09 | Actual native host, exercise authority, oracle and instrumented controls unavailable |
| Integration | AC-MCP-05/13/15; exact sync/catalog/native-resource delivery and authorized report persistence; VER-MCP-04/08 | Existing kit mechanism is relevant, but current generic cases are not this new workflow and dependencies are unresolved |
| Unit | No new scanner/parser/service or executable module is required by this guidance-only design | No new product unit suite mandated; lexical/source-text checks cannot substitute for semantic acceptance; any later executable helper requires an owned behavior test |

Security negative/edge expectations include hostile metadata, secret canary exclusion, stdio/HTTP differences, insufficient evidence, stale/error scanner output, blocked runtime requests and output collisions. No UI/mobile surface changes, device/build matrix, API deployment, market flags or Zephyr integration are in scope.

### Owned Blocking Gaps

| Gap | Affected boundary | Owner / required input |
| --- | --- | --- |
| S1 implementation grant and named owner remain unbound | S1 dispatch | Subagent-Driven approach approved for prerequisite work only; requesting operator/orchestrator must bind any later S1 scope and eligible named owner separately |
| Dependencies restored; full project/kit readiness still unassessed | Generated delivery and kit execution | Frozen --ignore-scripts install and scoped outcome audit succeeded without package/lock changes. QA must verify any affected build/kit prerequisites before their use; pending lifecycle builds are not implicitly authorized |
| Oracle preparation technically accepted at frozen digest | Later S1 semantic verification | Independent reviewer accepted docs/srs/mcp-security-assessment-oracle.json; retain external review record and revalidate affected bindings if fixture/source identities change. Actual model grading remains unrun |
| No version-bound native host/control/effect/no-clobber capability receipt | Native consumer/system verification only | QA and host operator bind native invocation, allowed reads/output create-new, target process/network/credential isolation, denied-attempt/effect observation and cancellation; existing local kit/model-eval declarations do not establish these |
| No separate approved model/account/data/resource/stop scope | Model-driven consumer verification only | Requesting operator/account owner approves the exact bounded exercise before any quota/data use; design approval is not that grant |

At the initial readiness review, Node v26.0.0 at `/opt/homebrew/Cellar/node/26.0.0/bin/node` met the kit's Node >=22 version prerequisite only; dependency restoration and all doctor/drive, generation and model exercises had not run. The later authorized restoration and scoped-audit results below supersede that dependency gap, not the unassessed build/kit/native-control boundaries.

Host/evaluation proof blocks the affected verification, not safe offline reasoning or future explicitly approved preparatory authoring. It nevertheless prevents claiming the indivisible S1 READY/end-to-end complete. No new adapter/control project, substitute host, weakened criterion or model purchase is authorized to bypass these gaps.

### Readiness Evidence Lanes and Route

Design/requirement document checks: assessed with retained references. Source implementation, generation, installed consumer execution, permission enforcement and semantic report behavior: not assessed. Human approval: BRD/PRD/SRS only. Delivery acceptance, publication/release and target activation: not assessed/not authorized.

Next action: resolve any later S1 dispatch grant, affected kit/build prerequisites and existing host/evaluation proof boundary, then reassess only affected readiness. Dependency restoration and oracle preparation are now complete; do not repeat intake or reauthor the accepted oracle. No unconditional implement-feature recommendation. If no existing host can meet the approved contract, return only that host/verification design question to design-solution or separate intake rather than silently expanding S1.

## Authorized Prerequisite Results

Historical prerequisite-only checkpoint; it does not describe the later separately authorized repository implementation below.

The operator's next “ok” approved the specifically presented **Subagent-Driven prerequisite work—dependency restoration and independent oracle preparation**. It did not approve S1 implementation or a model-driven consumer exercise. Prepared validated assignment packets and dispatched disjoint dependency and independent-analysis workers concurrently.

- Dependency owner: `960064fe-81b2-4143-8a98-cdfcb009d81b`, Personal - Cheap / `google-antigravity/gemini-3.8-flash`, medium effort. Frozen install with `--ignore-scripts` and repository-local store exited 0; tsx v4.23.15 resolves. Parent independently confirmed package.json and pnpm-lock.yaml SHA-256 remained unchanged. Pending lifecycle builds are disclosed, not enabled.
- Independent oracle author: `67bc0bd3-5acc-4164-9d4e-eca7e9076299`, Personal · Analysis & Review / `openai-codex/gpt-6.1-sol`, medium effort; read-only analytical output, parent materialization only.
- Prepared [oracle specification](mcp-security-assessment-oracle.json): 17 cases, 20 literal synthetic artifacts, all AC-MCP-01..16 referenced, no unresolved listed artifact refs. Frozen SHA-256 `3e29f3c9a226da724410872b17edd9afb06ff976ef46955fb7877030515b7063`.
- Separate reviewer `5c9ad5b3-f64a-4615-b6e3-12a7b71c15e9` accepted that digest as **ACCEPTABLE_FOR_ORACLE_PREPARATION**, with no blocking defects. [External acceptance record](mcp-security-assessment-oracle-review.md) preserves independence, source bindings and limits; frozen oracle bytes remain unchanged.
- Parent covering command `rtk pnpm audit:outcome --records --required --dir artifacts/runs/mcp-security-assessment --slug mcp-security-assessment --workflow implementation-readiness --run-id 5dcdac0f-4d08-408a-88fd-1b41047bdc03 --json` exited 0: three records checked, one exact record matched, no issues. This exercises the formerly unavailable loader/audit path after restoration, not assessment behavior or native host controls.

Prerequisite checkpoint result (historical): **authorized prerequisites complete; S1 remained held**. No product implementation, full project build/test, generated publication, native consumer/model experiment, target scan or host-policy change had occurred at that checkpoint. Later repository work did not reopen settled requirements or oracle meaning.

## Repository Delivery Results

Repository status: **source_ready**. Feature lifecycle: **partially_implemented** because indivisible S1 native-consumer/report/effect acceptance remains unexercised. Completed repository delivery is not end-to-end feature acceptance.

The requesting operator explicitly selected Subagent-Driven repository implementation/local checks, then separately approved guarded recovery, presentation-only citation normalization with independent rebinding, and finally the guarded two-phase configuration/bootstrap transition. Those decisions do not authorize targets, consumer-model experiments, host-policy changes, commits, remote publication or release.

Implementation owner `358b969f-8d6e-4305-82a6-3f11ef60082a` used Personal - Cheap / `google-antigravity/gemini-3.8-flash`, medium effort. Delivered optional `.agents/workflows/mcp-security-assessment.md`, keyword-only `common/common-mcp-security-assessment`, demand-loaded references, inert assets, authoring eval definitions, opt-in selection and relevant docs. Existing generator produced native exports; no runtime engine, new handler or adapter was added.

### Observed Repository Checks

| Lane | Result | Evidence and limit |
| --- | --- | --- |
| Guarded local generation | PASS | Baseline-producer adoption applied 61 files; exact approved config restored; ordinary reconciliation applied four files. After evaluator correction, normal generation refreshed four boundary-note mirrors plus lock. All three applied runs retired no files; bootstrap and `artifacts/generation-logs/attempt-2026-11-10T09-49-34-933Z-1a19e3/` receipts remain retained |
| Final generator check | PASS | `rtk pnpm generate-indices --check`, exit 0 after evaluator correction. Exact raw log/receipt archived at `.agent/sdd/mcp-security-implementation/post-eval-generation-check-evidence.tgz` |
| Real local install/discovery smoke | PASS | Existing production APIs installed workflow plus domain, cyber-authorization and cyber-evidence across four host formats; 80 resource/export paths matched, managed workflow/catalog parity and skill discovery passed, unrelated sentinel preserved. Six checks; receipt persisted before owned temp cleanup |
| Governed trace | Exit 0, warnings retained | Citation normalization clears seven orphan AC errors; five Direction-lane BRD-objective warnings and document-link-gap labels remain. No invented BRD objectives |
| Finite evaluator decision regression | PASS, bounded transcript controls | 280 tests passed across `mcp-decision-fidelity.test.ts` and existing `decision-fidelity.test.ts`, zero failures/skips. Ten authored finite evals, eight positive/eight negative activation queries and four separate lexical pressure probes; no measured model efficacy |
| Native semantics / host enforcement / delivery acceptance | NOT RUN / pending | No native host CLI/model execution, actual assessment report, target security result, isolation/no-clobber proof or human delivery acceptance |

Final post-correction smoke receipt: `.agent/sdd/mcp-security-implementation/author/smoke-evidence/smoke-receipt-2026-11-10T09-50-29-025Z-3b20b2.json`, SHA-256 `2f464d66bebdbe9c3dcef9fb94f576ee244a06b95ee13ca834ba352828363e5f`. Earlier focused checks remain historical; post-correction proof is recorded at `.agent/sdd/mcp-security-implementation/post-eval-focused-checks.json`. Native-format parity is not native-host invocation.

The first independent review found a Major in keyword-based authored evals; parent reproduced three violating answers being accepted under both scorer semantics versions. The isolated correction uses existing anchored regex envelopes plus correct field predicates and independent literal regression controls; those original counterexamples are now rejected under both versions. `pressure-*` positives remain lexical and are not automatically conjoined with their separate ordinary typed counterparts. Arbitrary free-form refusal outside the finite envelope is a format mismatch, not proof of unsafe behavior. Static assertion grounding checks only `contains`/`contains_any` and cannot establish regex discrimination. Original full-unit RED was not run; the actual pre-repair reproduction is retained without fabricating a test history.

LSP diagnostics for the new regression returned **No language server found**. No static typecheck PASS is claimed; Node executed the TypeScript regression through tsx. Full project build/lint/unit suites remain unrun.

### Preserved Identities and Authority

Approved `.skillsrc` restored exactly: `fafff2560f8ee8c4403a1a57296e9a5cc8effb64e518f20fae547578b222f20b`. Bootstrap archives/state/report are retained under `.agent/sdd/mcp-security-implementation/author/bootstrap/`; the two-phase transition was not atomic and its earlier failed guards remain historical evidence, not erased passes.

The operator-approved SRS citation-only amendment has SHA-256 `48663f5b9a34aacea1ec40d4069c594957a1dbefa7dfb76da78ba0940e0f7fd5`. [Independent source-equivalence binding](mcp-security-assessment-source-binding.md) bridges the archived original SRS to the unchanged accepted oracle. Neither old embedded hashes nor historical receipts are misrepresented as current.

Whole-delivery independent review is a separate evidence gate, not inferred from the checks above. Final implementation receipt uses run ID `f125c58b-201c-421c-bda0-1661e0308e9a`; no native/model, human-acceptance or release lane can inherit PASS from repository checks. Full project build/lint/unit suites were not run: no public executable/library source changed. Pending lifecycle builds remain disabled.

Upstream conflicting licensing notices remain a reuse/publication limitation; original control questions and pinned attribution do not establish legal clearance. Remaining acceptance needs a versioned existing native host with enforced/observable boundaries and separately scoped eligible model/account/data/resource/stop authority. Missing proof holds those exercises, not completed safe source work.
