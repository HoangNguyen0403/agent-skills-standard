# AI Test Assurance: Requirements and Delegation Plan

- Slug: `ai-test-assurance`
- Date: 2026-10-26
- Status: proposed; planning authorized; implementation, pilot execution, merge, and release not authorized.
- Profile: technical; lane: direction.
- SNC: S=2 N=2 C=2 total=6 tier=high (cross-repository changes to evidence and release decisions).
- Product/acceptance owner: requesting repository owner. Engineering/integration owner: orchestrator. Validation owner: independent QE reviewer, assigned before dispatch.
- Execution approach: prepared for Subagent-Driven execution; confirm execution authorization before dispatching implementers. Do not interpret this document as approval.
- Scope authority: the conversation's investigation and request to create an improvement plan. No previously approved BRD is asserted.
- This document is the canonical product requirement registry and delivery plan. Task 1 owns the separate technical contract; do not duplicate evolving schema definitions here.

## 1. Outcome and scope

As a maintainer accepting AI-assisted changes, I want evidence that tests protect independently defined behavior, so that passing tests and clean static scans do not create false production confidence.

### Objectives

- OBJ-01: distinguish complete analysis from missing, partial, stale, or inapplicable evidence.
- OBJ-02: establish distinct risk coverage and independently justified expected outcomes, regardless of test authorship.
- OBJ-03: improve demonstrated defect detection without uncontrolled false alarms, runtime, or maintenance cost.

### Capability inventory

| Capability | Disposition | Requirement / task |
| --- | --- | --- |
| Report scan completeness honestly | In scope | REQ-01 / T2 |
| Recognize executable test context without confusing quoted fixtures | In scope; Go first | REQ-02 / T3 |
| Record test intent, oracle, owner, and boundary realism | In scope | REQ-03 / T4 |
| Validate revision-bound execution and fault evidence | In scope | REQ-04 / T5 |
| Distinguish declared trace from verified behavior | In scope | REQ-04 / T5 |
| Review healing without weakening protected behavior | In scope | REQ-05 / T4, T7 |
| Challenge policy/eval claims with adversarial controls | In scope | REQ-06 / T6 |
| Compare baseline and candidate on held-out faults | In scope; bounded offline pilot | REQ-07 / T7 |
| Publish adoption and incident-feedback procedure | In scope | REQ-08 / T8 |
| Build a new mutation engine or universal semantic test-quality score | Excluded | Reuse an existing runner or controlled known-bug variants |
| Replace parsers for every supported language | Deferred | Candidate follow-on only after T3 calibration; no implied commitment |
| Change all existing suites or impose mutation thresholds everywhere | Excluded | Risk-targeted admission only |
| Connect production telemetry, deploy canaries, or inject production faults | Excluded | T8 documents handoff only; activation requires separate authority |
| Repair unrelated TestGuard update/config/diff features | Deferred | T2 must accurately disclose effective scope; do not silently advertise diff-only analysis |

### Non-negotiable guardrails

- Human and AI-authored tests face identical requirements.
- An oracle is the independently justified expected behavior, not the implementation's current output.
- A static finding is a risk indicator, not proof of a defect or lack of regression protection.
- Coverage, assertion count, test count, model agreement, and a green eval score are not substitutes for fault evidence.
- Mocking is allowed at justified boundaries; do not mock the subject or replace a claimed integration boundary with a fake.
- Different layers may check the same business rule when they protect distinct faults. No automatic cross-layer deletion.
- Runtime evidence is scoped to exact source/test inputs and environment. Subsequent relevant changes invalidate it.
- No raw production data, employer/client material, ambient credentials, paid model calls, or network-dependent pilot execution without separate authorization.
- No worker may merge, deploy, commit, change approval controls, or delegate recursively.

## 2. Confirmed evidence and remaining uncertainty

Paths in this table are relative to the named repository.

| Finding | Evidence | Qualification |
| --- | --- | --- |
| AGS already defines intent, plausible fault, layer selection and RED classification | AGS `skills/common/common-tdd/SKILL.md`, `references/quality-contract.md` | Guidance, not a universal executable mutation gate |
| AGS healing rejects assertion weakening and routes real bugs separately | AGS `.agents/workflows/test-loop.md:17-28` | Workflow instruction; do not claim mechanical semantic enforcement |
| Trace Covered is a document-link heuristic | AGS `scripts/trace/index.ts:18-28,57-75` | Does not prove actual execution; absent requirement sources can return success |
| Eval verification checks integrity and score consistency | AGS `scripts/evals/verify.ts`, `scorer.ts` | Textual scoring is not execution of the proposed behavior |
| TestGuard collects scan counters but JSON emits findings only | TestGuard `pkg/engine/engine.go:33-38,231-269`, `cmd/testguard/main.go:96-104` | Source inspection |
| TestGuard uncovered-mutation rule checks action keywords and isFetching text | TestGuard `pkg/rules/dart/uncovered_mutation.go:20-43` | Not executed mutation testing |
| Existing TestGuard binary flagged quoted bad examples in its own rule tests | Command below; `pkg/rules/golang/rules_test.go:33-53,122-143` | Observed on existing binary; binary-to-source identity not established |
| AGS checkout lacked root node_modules and compiled cli/dist during investigation | Read-only scout inspection | Recheck prerequisites at dispatch; no dependency installation performed |

Observed command: `rtk proxy /Users/nguyenhuyhoang/OtherProjects/testguard/bin/testguard --json /Users/nguyenhuyhoang/OtherProjects/testguard/pkg`. Result: GUARD-GO-02 warning and GUARD-GO-03 advisory, both matching intentional fixture snippets. This is an example, not a measured false-positive rate.

Research: [TestGen-LLM](https://arxiv.org/html/2402.09171), [Meta ACH](https://engineering.fb.com/2025/09/30/security/llms-are-the-key-to-mutation-testing-and-better-compliance/). These support measured filtering and targeted fault challenges; their outcome rates are not our baseline.

## 3. Requirements and acceptance criteria

All requirements are proposed. All map to the product owner above; engineering owner is the owning task worker, with the orchestrator accountable for integration. QE independently validates each AC. CLI and repository workflows are the affected channels; there is no new web/mobile UI.

| Requirement | Priority | Objective | Responsible task | Observable outcome |
| --- | --- | --- | --- | --- |
| REQ-01 | P0 | OBJ-01 | T2 | Consumers distinguish complete, incomplete, invalid, and explicitly inapplicable scans |
| REQ-02 | P1 | OBJ-03 | T3 | Rule signals distinguish executable Go code from quoted fixtures and explain support limits |
| REQ-03 | P1 | OBJ-02 | T4 | Existing intent records carry oracle provenance, owner, and boundary limits |
| REQ-04 | P0 | OBJ-01, OBJ-02 | T5 | Requested assurance level requires matching, current evidence rather than document links |
| REQ-05 | P1 | OBJ-02 | T4, T7 | Healing cannot be accepted solely because tests became green |
| REQ-06 | P1 | OBJ-02 | T6 | Critical testing guidance is challenged with wrong-but-plausible responses and behavior probes |
| REQ-07 | P1 | OBJ-03 | T7 | A bounded baseline/candidate comparison measures fault detection and false alarms |
| REQ-08 | P2 | OBJ-03 | T8 | Adoption has owners, rollback criteria, maintenance and incident-feedback procedures |

### Behavioral ACs

- AC-01 (REQ-01): Given an explicit supported nonempty scope, when every selected input is analyzed, the machine report identifies that effective scope and reports completion independently of finding severity.
- AC-02 (REQ-01): Given an unreadable input, traversal failure, or parse failure in required scope, when the scan finishes, its verdict is incomplete/error and cannot be consumed as clean success.
- AC-03 (REQ-01): Given zero analyzable tests or unsupported-only inputs, when scanning, report explicit non-success unless the caller explicitly authorized an empty scope; authorized emptiness is not-applicable, never passed.
- AC-04 (REQ-01): Given incomplete analysis and blocker findings together, when exiting, incompleteness takes precedence while findings remain available.
- AC-05 (REQ-02): Given a Go test containing suspicious source only as a string/comment fixture, when analyzed, it is not flagged as executing that source.
- AC-06 (REQ-02): Given the corresponding executable bad pattern, when analyzed, the calibrated detector still reports it at the relevant location.
- AC-07 (REQ-02): Given distinct boundary values in structurally similar cases, when duplicate analysis is uncertain, it does not claim semantic redundancy or automatically delete the cases.
- AC-08 (REQ-03): Given a proposed critical test with expected output copied solely from implementation, when reviewed under updated guidance, it lacks an acceptable independent oracle and requires owner resolution.
- AC-09 (REQ-03): Given one behavior/risk, when its intent is authored, it extends the existing contract/fault/layer/cases/command record with oracle, owner, and real/mock boundary information without creating a parallel record system.
- AC-10 (REQ-04): Given document links without execution receipts, when producing assurance output, it cannot claim execution or demonstrated fault detection.
- AC-11 (REQ-04): Given a receipt whose source, test, dependency, or relevant configuration identity no longer matches, when validated, it is stale rather than current success.
- AC-12 (REQ-04): Given a correct baseline and a relevant faulty variant, when the correct run passes and the faulty run fails at the intended oracle, evidence may demonstrate that named fault only.
- AC-13 (REQ-04): Given a faulty variant that does not build, times out, or fails infrastructure/setup, when evaluated, it is not counted as a detected behavioral fault.
- AC-14 (REQ-05): Given changed expectations, skipped checks, broadened matchers, updated baselines, or fixture/selector changes that weaken the exercised behavior, when healing is proposed, green reruns alone cannot authorize acceptance.
- AC-15 (REQ-06): Given polished responses containing required terminology but endorsing oracle copying, weak assertions, or false-clean reporting, when evaluated, the critical test-quality assertions reject them.
- AC-16 (REQ-06): Given valid behavioral reasoning phrased differently, when evaluated, canonical keyword absence alone does not invalidate the response where the selected assertion is semantic/behavioral.
- AC-17 (REQ-07): Given held-out fault cases, when candidate tests are generated, their generator context excludes the held-out faulty implementation and its expected failure details; evaluator records any leakage and invalidates the affected comparison.
- AC-18 (REQ-07): Given identical approved cases and execution budgets, when comparing baseline/candidate, report separate static-finding, evidence-validity and executed-behavior strata, each with detected faults, misses, false alarms, invalid cases, runtime, review effort, eligible denominators and artifact links; evidence rejection is not behavioral fault detection.
- AC-19 (REQ-07): Given incomplete evidence or no improvement, when the pilot concludes, report inconclusive/no-go rather than claiming production protection.
- AC-20 (REQ-08): Given a proposed blocking rollout, when requesting activation, provide precision evidence, named owner, rollback procedure and human approval; documentation publication alone does not activate blocking.

## 4. Shared contract decisions and technical-design gate

These are product invariants for Task 1 to turn into one reviewed technical specification. No worker may independently invent report or receipt formats.

### Scan decision table

| Effective analysis | Findings | Required decision |
| --- | --- | --- |
| Complete supported scope | No blocker | Complete; no blocker detected, not production-safe |
| Complete supported scope | Blocker | Complete; policy failure |
| Partial/failed required scope | Any | Incomplete/error; never clean success |
| Empty scope, not explicitly allowed | Any | Missing required analysis |
| Empty scope, explicitly allowed | None | Not applicable with reason |
| Unsupported required inputs | Any | Incomplete with support explanation |

T1 must settle exact field names, versioning, exit codes, stderr/stdout behavior, machine-readable error representation and migration of existing consumers before T2 starts. Breaking JSON changes require a documented release boundary and updating discovered consumers; do not leave silent compatibility aliases.

### Evidence model invariants

Keep separate dimensions rather than one misleading linear PASS flag:

- Declared requirement/intent and oracle provenance.
- Test implementation identity and test layer.
- Actual execution status and environment/input identity.
- Named fault challenge status and intended failure evidence.
- Freshness/currentness relative to the requested revision.
- Human review/approval when required.

At minimum the technical design must bind repository identity, commit plus dirty-content identity if applicable, test/config/dependency digests, runner/version, command, result classification, artifact digests, fault identifier and oracle reference. Exact fields are decided once in T1. Hashes establish content binding, not trustworthy execution by themselves. Local receipts must be labelled local/untrusted unless produced by an independently trusted runner; no signing platform is in scope.

AGS owns the intent/evidence schema and validator. TestGuard owns its scan schema and emits static-analysis evidence only. AGS may ingest a pinned TestGuard report through a local adapter; neither tool claims the other's assurance level. Prefer existing dependencies and validators after T1 inventory.

## 5. Delegation and workspace contract

### Repository boundaries

- AGS source workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala`.
- TestGuard source checkout: `/Users/nguyenhuyhoang/OtherProjects/testguard`; confirmed origin `https://github.com/HoangNguyen0403/testguard.git`.
- Before execution, create isolated implementation worktrees for each repository using explicit base refs; record exact refs, hashes, dirty-state disposition and domain eligibility in assignments. Do not overwrite or reset existing changes.
- Never copy the user's reference screenshots or unrelated account context into worker prompts. The summarized requirements above suffice.
- Planning domain: the two user-authorized repositories only. Recheck profile/account eligibility at actual dispatch; do not send context to an ineligible account.

### Dispatch rules

1. Orchestrator finalizes task and contract versions; it does not outsource the top-level plan.
2. Use current profile discovery and host routing policy. Implementation ladder: eligible Personal - Cheap, then eligible Personal - DeepSeek on policy-defined exhaustion/quality escalation, then eligible domain Delivery. Independent reviews use eligible Analysis & Review profiles. No automatic premium escalation.
3. Assign one owner per component. No recursive delegation. Workers load required standards themselves.
4. Dispatch dependency-ready disjoint work together. No concurrent edits to a shared schema, engine, package manifest, generated mirror, or workflow.
5. Each packet carries exact owned paths, base identity, prerequisite artifact digests, requirements/ACs, allowed actions, required skills and their identities, commands, report destination, and stop conditions. Missing access/requirements is not provider exhaustion.
6. Workers implement without mid-flight build/lint/test/formatter runs. After the batch settles, freeze edits and have the orchestrator execute staged RED/GREEN verification: workers supply a test-only patch or reproducible pre-fix target and final patch, so expected RED and matching GREEN can be exercised without ambiguous concurrent state. Do not claim RED from a retrospective assertion alone.
7. An independent reviewer checks specification compliance and code quality after each task; integrated final review is separate from implementation ownership. Human authorization is not delegated.
8. Preserve packets, diffs, review snapshots, commands/results and receipts. Do not delete evidence during cleanup.

### Ownership / RACI

| Role | Responsibility |
| --- | --- |
| Repository owner / product approver | Accountable for scope, acceptable risk, budget and rollout approval |
| Orchestrator / engineering lead | Accountable for contracts, assignments, dependency integration and verification |
| T1 technical designer | Responsible for shared technical specification; no implementation |
| Task implementer | Responsible for owned component and evidence preparation |
| Independent QE reviewer | Responsible for AC validation and pilot adjudication; cannot review own implementation |
| Release owner, appointed by repository owner | Responsible for publication/activation only after separate approval |
| Business/domain oracle owner | Consulted for disputed expected behavior; required for real-domain pilot cases |
| Frontend/mobile delivery roles | Not applicable to this tooling change; consulted only for later adoption |

## 6. Task slices and worker briefs

Effort is relative planning points, not calendar or spending commitments. Total: 40 points; confidence medium-low until T1 compatibility inventory. There are eight work packages; T7 contains separately assigned generation and evaluation packets. No implementation task is ready before T1 and execution authorization.

### Task 1: Freeze technical contracts and compatibility inventory (T1)

- Owner: technical-design worker; estimate 5 points, medium confidence.
- Depends on: implementation-planning authorization only; this task creates design, not runtime code.
- Scope: both repositories read-only; write AGS `docs/srs/srs-ai-test-assurance.md` only (new file).
- Requirements: REQ-01 through REQ-08; acceptance focus AC-01 through AC-04, AC-10 through AC-13.
- Steps: inspect existing result/receipt/schema conventions and actual report consumers; map generated versus canonical skills; specify scan envelope and exit semantics; specify intent/evidence schema, trust labels and validation invocation; define TestGuard-to-AGS adapter boundary; record exact owned paths and commands for T2-T8; identify applicable release compatibility policy.
- Deliverable: one technical contract with schema examples, invalid examples, migration table, expected CLI invocations and digest-bound fixture interface for downstream tasks.
- Verification: walkthrough each scan-table row and stale/invalid-fault scenario against the contract; independent technical review before schema freeze. No production/test execution claim.
- Stop: consequential compatibility or trust decision cannot be resolved from repo policy; return alternatives and affected task only.
- Non-goals: code, dependencies, new signing system, CI activation.

### Task 2: Make TestGuard scan/report outcomes truthful (T2)

- Owner: TestGuard engine/report worker; 5 points, medium confidence.
- Depends on: reviewed T1.
- Owned existing paths: `pkg/engine/engine.go`, `pkg/engine/discovery.go`, engine tests, `pkg/models/violation.go`, `pkg/reporter/`, `cmd/testguard/main.go`; new report-model files only as approved by T1. This owner alone edits the engine during this wave.
- Requirements: REQ-01; AC-01 through AC-04.
- Steps: propagate discovery/read/parse failures; account for effective selection and unsupported scope; emit reviewed envelope in JSON and consistent console/Azure verdicts; implement empty-scope policy and precedence; report tool/source identity without fabricating unavailable build metadata; migrate discovered consumers and relevant CLI documentation.
- Verification: focused Go regression cases for complete, unreadable, parse-failed, unsupported, empty-allowed, empty-disallowed and incomplete-plus-blocker inputs. After freeze: `rtk proxy go test ./pkg/engine ./pkg/reporter ./cmd/testguard` plus actual freshly built CLI invocations on temporary fixtures using T1 exact flags. OS permission cases use deterministic fault injection where chmod cannot reproduce denial.
- Non-goals: AST rewrite, rule catalog expansion, implementing advertised diff/config features unless necessary to the frozen contract; unsupported diff mode must fail explicitly or honestly identify full scope, never claim changed-files-only.

### Task 3: Calibrate Go parsing and rule precision (T3)

- Owner: TestGuard Go-parser/rule worker; 5 points, medium confidence.
- Depends on: T2 integration (shared engine ownership), reviewed T1.
- Owned paths: `pkg/parser/`, `pkg/rules/golang/`, `pkg/engine/engine.go` only for parser dispatch, relevant engine tests and `pkg/detectors/clone/` only for AC-07. Leave Dart parsing behavior unchanged except shared-contract compatibility fixes reviewed separately.
- Requirements: REQ-02; AC-05 through AC-07.
- Steps: use Go standard-library syntax facilities to distinguish executable nodes from comments/string fixtures; preserve source positions and helper limitations; add paired bad/good controls; prevent literal normalization from being presented as proven semantic duplication; report unsupported/ambiguous constructs accurately.
- Verification after freeze: `rtk proxy go test ./pkg/parser/... ./pkg/rules/golang ./pkg/detectors/clone ./pkg/engine`; run freshly built CLI on paired executable/quoted examples and the original `pkg/rules/golang/rules_test.go`. Both original fixture false positives disappear while true executable controls remain detected. Report per-rule counts, not a claimed population-wide precision rate.
- Non-goals: full compiler/dataflow semantics, all-language AST replacement, auto-deleting tests.

### Task 4: Extend AGS intent, layer and healing guidance (T4)

- Owner: AGS skill/workflow worker; 3 points, high confidence.
- Depends on: reviewed T1. May run beside T2.
- Owned paths: canonical `skills/common/common-tdd/SKILL.md` and `references/quality-contract.md`; relevant canonical QE healing/triage guidance and `.agents/workflows/test-loop.md` identified in T1. Generated mirrors are owned by T8, not this worker.
- Requirements: REQ-03, REQ-05; AC-08, AC-09, AC-14.
- Steps: extend the existing intent record by reference to the shared schema; require independent oracle provenance and risk-sensitive fault evidence; make real/fake/mock boundaries explicit; preserve justified cross-layer checks; clarify that unchanged assertion text and repeated green are insufficient if fixtures/selectors weakened the behavior; preserve real-bug and quarantine routing.
- Verification: independent review against concrete good/bad scenarios; T6 adversarial cases exercise the changed guidance. No numeric score, universal mutation threshold, or fabricated model-run result.
- Non-goals: separate checklist platform, schema changes owned by T5, blanket end-to-end testing.

### Task 5: Implement AGS evidence validation and honest trace presentation (T5)

- Owner: AGS evidence/trace worker; 8 points, medium-low confidence.
- Depends on: reviewed T1 and T2 report contract; may run beside T3, T4 and T6 if T1 paths remain disjoint.
- Owned paths: `scripts/trace/`; T1-approved evidence-validator module/schema and its tests; no edits to skill bodies or general eval scorer. Any package script edit is reserved for T8; provide required invocation as report output.
- Requirements: REQ-04; AC-10 through AC-13.
- Steps: implement reviewed schema and validator using existing conventions; ingest local pinned TestGuard reports; separate document trace from execution/fault assurance; validate required evidence presence, identity, artifact hashes and outcome classification; refuse stale evidence; label local evidence trust honestly; report missing evidence rather than upgrading absent-source success into release assurance.
- Verification: valid and invalid fixtures for absent/stale/tampered artifacts, dirty inputs, dependency/config drift, correct baseline, intended faulty failure, compile failure and timeout. After freeze use existing `rtk pnpm test:trace` and the exact focused validator command from T1; invoke actual validator CLI on one valid and several invalid bundles. No network or receipt-directed command execution: receipt commands are data, not executable instructions.
- Non-goals: executing arbitrary uploaded commands, secret-bearing receipts, remote attestation, generic mutation engine, changing unrelated trace ID semantics.

### Task 6: Add adversarial testing-quality eval controls (T6)

- Owner: AGS eval-fixture worker; 3 points, medium confidence.
- Depends on: reviewed T1; fixture design may run beside T2/T4. Final acceptance depends on T4 guidance.
- Owned paths: test-quality skill eval metadata/candidates and dedicated scorer regression fixtures selected by T1; do not edit `scripts/evals/scorer.ts` or shared behavior without orchestrator-approved scope expansion.
- Requirements: REQ-06; AC-15, AC-16.
- Steps: add wrong-but-keyword-rich controls, oracle-copying controls, tautological/mock-echo cases, empty-scan claims, weakened healing and valid paraphrase controls; prefer existing assertion primitives that actually distinguish behavior; record unsupported assertion semantics as explicit gaps rather than faking scores.
- Verification after freeze: run real existing scorer against controlled candidate transcripts using the exact local command frozen by T1. Demonstrate incorrect candidates fail and legitimate equivalents pass for the selected assertion. No paid live evals or claims of model effectiveness.
- Stop: existing primitives cannot express an AC safely; return a bounded scorer-change proposal for separate ownership before implementation.

### Task 7: Run a held-out offline assurance pilot (T7)

- Owner: independent QE pilot worker owns T7-E protocol/adjudication; separately assigned test-generation workers own T7-G-B (baseline) and T7-G-C (candidate). No individual/session may own both generation and evaluation. Estimate 8 points across these packets, low-medium confidence.
- Depends on: T2-T6 integrated and independently reviewed; T8 integration checkpoint; explicit pilot authorization and approved corpus. Execution order: T7-E protocol freeze, T7-G-B/T7-G-C in parallel, artifact freeze, T7-E execution/adjudication.
- Owned paths: T7-E owns evaluator-only corpus, faults, expected-failure details and results in its isolated evidence workspace. Each T7-G packet owns only its own test-output directory in a separate generator workspace. No production-source edits or external services.
- Requirements: REQ-05, REQ-07; AC-14, AC-17 through AC-19.
- Steps: freeze cases, oracle adjudication, baseline/candidate revisions, budgets and stratified measurement protocol before generation; independently hold out faulty variants; compare arms on identical cases; exercise real CLI and validator; adjudicate false alarms and missed faults; include an assertion-preserving but behavior-weakening fixture change.
- Proposed bounded corpus: 12 reviewed cases, 6 development and 6 held-out, plus 6 legitimate negative controls. Each six-case split contains 2 static-rule cases, 2 scan/evidence-validity cases and 2 executable behavioral-fault cases. The six negative controls contain two per stratum. Counts are proposed scope, not statistical confidence. Use actual repository defects where available; label synthetic cases separately and do not present them as historical production evidence.
- Stratum A, static analysis: freeze input tests and compare baseline/candidate TestGuard findings against adjudicated labels; denominator is supported valid cases in this stratum.
- Stratum B, evidence validity: freeze input bundles and compare baseline/candidate validation decisions; denominator is valid challenge bundles in this stratum. Rejecting stale/incomplete evidence improves evidence hygiene, not behavioral defect detection.
- Stratum C, behavioral protection: hold the correct implementation, held-out faulty variants, independent oracle and runner/environment constant; change only the frozen arm-specific generated test suite under its respective guidance. Count detection only when the correct implementation passes and the faulty implementation fails at the intended oracle under AC-12/AC-13. Denominator is valid executable non-equivalent held-out faults, excluding invalid/build/setup cases with explicit reasons.
- Proposed budget: 120 seconds per focused run and 30 minutes machine runtime per arm; record human review minutes. Generation packets require a separately approved profile/model, invocation cap and spending authority before dispatch; otherwise use already authorized frozen generation artifacts and limit claims accordingly. No nested provider API calls, live eval services or network-dependent test execution. Budget exhaustion is inconclusive, not pass.
- Go/no-go: zero false-clean decisions in Stratum B; no lost baseline detections within any valid held-out stratum; at least one additional held-out behavioral fault detected in Stratum C; zero false blocking decisions across the six legitimate controls; remain within machine budgets. Improvements only in A/B support an evidence-hygiene conclusion, not the behavioral-improvement go decision. If valid C cases are unavailable or too few for this criterion, return inconclusive. Small sample supports another bounded trial, not production reliability claims.
- Verification: the orchestrator runs the frozen per-case CLI/validator/test commands provided in T1 and the T7-E protocol, preserving correct/faulty output pairs and artifact identities. Independent QE checks stratum classification, oracle failure location, denominators, generator-input manifests and contamination exclusions before issuing a verdict.
- If historical cases or an independent oracle owner are unavailable: complete authorized synthetic evaluation but explicitly block the real-world-effectiveness claim. Do not silently replace it with a green synthetic score.

#### T7-G-B and T7-G-C: bounded generation packets

- Owner: fresh test-author worker per arm; neither is T7-E or the held-out-fault author. These are separate assignments, not recursive delegation from the evaluator.
- Inputs allowed: correct implementation snapshot, independently approved behavior contract, existing suite, declared runner/environment, development examples, and only the arm's frozen guidance/tool versions.
- Inputs excluded: evaluator-only corpus paths, held-out faulty implementations, fault IDs that reveal implementation changes, expected failure details, the other arm's output, evaluator transcripts and unredacted technical-contract annexes.
- The orchestrator supplies a digest-bound generator-safe contract excerpt instead of this full plan/T1 package when either contains evaluator-only material. Record every supplied path/artifact and tool-access boundary. Do not rely on prompt secrecy alone: keep held-out files outside generator-visible workspaces and do not grant access to them.
- Steps: generate a bounded test suite from allowed inputs; list intent/oracle and expected verification commands; publish tests and input/output digests to the assigned arm directory; stop before held-out evaluation. No retries informed by held-out results.
- Verification: orchestrator verifies manifest completeness and checks correct-implementation execution; freeze the generated suite before T7-E receives it. A failing baseline suite is an invalid case, not a killed fault.
- Return: suite, exact commands, context-access record, source/guidance identities, output digest and limitations. Any suspected held-out access invalidates affected cases. No additional model calls beyond the authorized worker invocation.

### Task 8: Integrate, document and prepare controlled adoption (T8)

- Owner: integration worker; 3 points, medium confidence. Orchestrator retains verification and commit authority.
- Depends on: T2-T6 for integration; T7 result for rollout recommendation.
- Owned paths: AGS and TestGuard manifests/CI/docs/changelog only as listed by T1; generated AGS skill exports/mirrors only through canonical tooling. No other owner edits these paths concurrently.
- Requirements: REQ-08; AC-20; integrated verification of all ACs.
- Steps: wire approved local check commands and non-blocking observation integration; update documented JSON/exit-code consumers, examples, rule naming explanations and release compatibility notes; preserve canonical SDD evidence before generators; regenerate required mirrors once and copy back only allowlisted outputs; document human ownership, quarantine expiry, removal review and sanitized incident-to-regression feedback.
- Verification: run relevant focused checks once after the integrated revision settles, then actual CLI-to-report-to-validator smoke on complete/incomplete/stale/fault-failure scenarios; independent whole-change review. State which CI configurations were edited versus actually executed. No live CI claim from YAML alone.
- Rollout: observation first. Blocking enablement requires owner approval and calibration evidence; rollback disables new blocking policy while preserving reports and existing unrelated gates. Never convert missing evidence into success as rollback.
- Non-goals: production deployment, branch protection edits, publishing packages, broad suite cleanup, live telemetry ingestion.

## 7. Dependency graph and concurrency

```text
Planning approval -> T1 technical contract -> independent review + execution authorization
                                              |
                           +------------------+------------------+
                           |                  |                  |
                          T2                 T4                 T6
                           |
                      +----+----+
                      |         |
                     T3        T5
                      +----+----+-------------+------------------+
                           |
                  integration freeze and independent task reviews
                           |
                  T8 integration/documentation portion
                           |
                T7-E protocol and corpus freeze
                           |
                T7-G-B and T7-G-C isolated generation
                           |
                frozen suites -> T7-E execution/adjudication
                           |
                T8 final adoption recommendation + whole-change review
```

T6 final acceptance waits for T4. T5 consumes the T2 report contract, not mutable runtime output from an unfinished worker. T8 is one owner with two checkpoints, not two simultaneous workers. Freeze package/CI/generator edits until all component owners settle. Reviewer findings reopen only affected tasks and invalidate only affected evidence.

T7 is a multi-packet work package: T7-E owns only evaluation artifacts, T7-G-B and T7-G-C own separate generation outputs. The full-plan reading instruction below is overridden for generation packets by their generator-safe input allowlist. T1 must partition public contract material from evaluator-only annexes; record hashes for each, never expose the latter to generators.

## 8. Copy-ready assignment template

Prepare one packet per numbered task; replace all runtime identities before dispatch. This template is not itself a valid assignment manifest.

```text
Role: implementer (or technical designer for T1 / independent evaluator for T7).
Authority: assigned task only; no delegation, commits, deployment, network or spending beyond packet authority.
Read: this plan at its recorded digest, the reviewed T1 contract at its digest,
      the exact Task N section, repository instructions and packet-listed standards.
Workspace: orchestrator-supplied isolated repo worktree and base/content identity.
Own: only the task's approved paths. Other paths are read-only.
Implement: the named requirements and ACs; reuse existing conventions.
Do not: add unrelated hardening, weaken assertions, fake evidence or alter approvals.
Verification: prepare regression cases, test-only/pre-fix reproduction and exact commands;
              do not run builds/lint/tests/formatters during concurrent edits.
Return: terminal status; changed paths; requirement/AC map; patch identities;
        expected RED and final GREEN commands; actual commands already executed;
        evidence links; assumptions; unresolved risks; required integration actions.
Stop boundary: material contract changes, inaccessible prerequisites or account ineligibility.
```

The orchestrator must use the canonical assignment-manifest/packet tools with current required fields; do not dispatch a bare task heading. Every result is reviewed independently before integration. Worker success is not acceptance evidence.

## 9. Verification and publication checklist

- Every REQ and AC has an implementation task and independent validation lane.
- Shared schemas and report migration are reviewed in T1 before dependent implementation.
- No shared path has concurrent owners; generated mirrors have one owner.
- Newly built TestGuard binary identity is recorded; existing binary evidence is not reused as source verification.
- Expected RED is a relevant assertion failure, not syntax/import/infrastructure failure; corresponding GREEN runs the same scenario.
- Complete, empty, unsupported, partial, stale and invalid-fault cases exercise real interfaces.
- Pilot generation/evaluation contexts remain separate; contaminated cases are excluded with reasons.
- Docs and report labels distinguish guidance, static analysis, local execution, trusted execution and demonstrated named fault.
- Existing consumers and generated exports are migrated or explicitly blocked, never silently broken.
- No actual release, runtime activation, production claim or cost savings asserted without evidence and authority.

## 10. Decision and readiness ledger

| Decision | State / owner | Effect |
| --- | --- | --- |
| Produce this delegatable improvement plan | Authorized by requester | Planning only |
| Use two repos with AGS policy/evidence and TestGuard static scanning | Approved scope; repository owner | Implemented across AGS (evidence contract/docs/validator) and TestGuard (engine/reporter) |
| Start with Go parser precision, not all-language rewrite | Approved scope; engineering lead | Bounded first calibration; Go parser precision implemented, non-Go support remains honestly labelled |
| Exact schema/exit codes/consumer migration | Frozen (SHA-256 `670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5`); T1 designer + independent reviewer | Core contract frozen; narrow SRS §6 engineering addendum independently reviewed under T5 |
| Execute implementation using subagents | Authorized by requester ("okay start implement the plan") | Subagent-Driven implementation active across bounded slices |
| Pilot cases, oracle owner and run budget | Authority NOT granted; repository owner/QE | Blocks pilot execution; no case, oracle, or budget approved |
| Activate blocking/release | Separate repository-owner authorization | Never implied by plan or component acceptance; remains observation-only |

No human names, release dates, production reduction percentages or budget approvals are invented. Role owners are assigned above; actual worker identities and revision hashes belong in dispatch receipts, not fabricated here.

Status note: Subagent implementation was explicitly authorized by the user ("okay start implement the plan"). Technical contract readiness was established via T1 frozen specification (original historical contract freeze SHA-256 `670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5`) and subsequent narrow SRS §6 engineering addenda reviewed under T5, clearly distinguished from the current working document. Component-level implementation acceptance has been achieved across all active engineering slices: T1 `PASS (local)`, T2 `PASS (local)`, T3 `PASS (local)` (designated review closed all findings; test oracle count 8→9 confirmed; parent full `go test ./...` passed; binary smoke passed across zero-oracle, test scope, clone detection, and scan table), T4 `PASS (local)`, T5 `PASS (local)` (assurance suite 50 passed, trace 16 passed, strict TypeScript passed), and T6 `PASS (local)` (eval regression 109 passed; test counts reported without summing overlapping suites). T8 local integration is approved as `PASS (local)` / `LOCAL PASS (reviewed)` (final cross-repository integration review approved staging generators, 67 exported files with parity, 48 resources preserved, documentation, observation wiring, and raw TestGuard scan report ingestion into AGS CLI verified against synthetic fault, stale, and tamper cases). T7 is recorded as `BLOCKED_not_executed` per `artifacts/ai-test-assurance/evidence/pilot-status.json` (pilot cases, oracle, run budget, and provider invocation authority were not granted). Tracked evidence is archived under the `artifacts/ai-test-assurance/evidence/` prefix. Release and blocking policy activation remain unauthorized, non-blocking, and separate.

## 11. Change log and planning evidence

2026-10-26: created from read-only AGS/TestGuard investigation and the user's planning request. No runtime implementation changes or pilot results are claimed. Exact token/provider cost unavailable; do not estimate savings from missing telemetry.

Independent planning review identified missing generation ownership and conflated pilot metrics. Corrected with isolated arm-specific generation packets, evaluator-only artifacts, explicit verification and three measurement strata; behavioral improvement now requires additional executed fault detection rather than an evidence-hygiene rejection.

2026-10-27 (final documentary reconciliation): Component-level local implementation accepted across all active development slices (T1, T2, T3, T4, T5, T6 `PASS (local)`). T3 corrective review closed with full Go suite and smoke passed. T8 local integration approved as `PASS (local)` / `LOCAL PASS (reviewed)` (staging generators, 67 export parity, 48 resources preserved, docs/CI reviews, and CLI smoke against TestGuard scan reports approved by final cross-repository integration review). T7 pilot execution remains `BLOCKED_not_executed` (no case, oracle, budget, or provider authority granted). Evidence archived under `artifacts/ai-test-assurance/evidence/`. No whole-plan PASS, production deployment, remote/hosted CI execution, or cost savings claimed; token and provider costs remain unavailable.
