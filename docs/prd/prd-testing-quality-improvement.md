# Testing Quality Improvement — Requirements and Delegation Plan

## 1. Status and authority

- Slug: `testing-quality-improvement`.
- Project: agent-skills-standard; personal project (consistent with existing `docs/plans/book-to-skill-large-source-delegation.md`).
- Authorized planning workspace: repository worktree (boring-zebra).
- Authoritative brief: this conversation's QA-role, SDLC/STLC, Playwright and nine-category API assessments, the request for a delegable plan, and the subsequent explicit request to include mobile testing.
- Status: implementation authoring completed and integrated on 2026-10-27; local verification gates executed; W8 R4 independent review approved source compliance, covering generation proof, and final inventory without reopening accepted semantics; authoritative user acceptance decision ACCEPT_DOCUMENTED_HISTORICAL_GAP (artifacts/testing-quality-improvement/pr-readiness-acceptance-decision.json) supersedes prior NO_WAIVER blocker for PR readiness with explicit disclosure; verified via artifacts/testing-quality-improvement/verification-summary.md; historical raw evidence revisions retained in unpublished local archive; PR prepared on develop.
- Execution approach: Subagent-Driven, as requested. Do not ask the user to choose inline versus delegated again.
- Operator profile: technical. Lane: direction. SNC: S=2 N=1 C=1 total=4 tier=medium for registry guidance changes; any proposed runtime security-control change requires separate design and approval and is outside this plan.
- Product/scope approver: requesting repository owner. Engineering/integration owner: orchestrator. Validation owner: independent QA/reviewer agent, with final acceptance retained by the repository owner.
- This plan does not authorize commits, push, PR publication, merge, release, production probes, third-party accounts, installations, paid evaluation campaigns, or premium advisors.

## 2. Outcome, scope and evidence

### Objective OBJ-01

Make existing testing guidance discoverable, internally consistent and executable enough that a consuming agent can select appropriate tests, preserve meaningful oracles, and report honest lifecycle evidence. Success at implementation acceptance: every AC below has PASS evidence or an explicit unresolved disposition; no unresolved required AC may be reported as complete.

### Actors and jobs

- QA planner: translate approved requirements into risk-selected test obligations and lifecycle gates.
- Test author/reviewer: produce tests that detect observable faults rather than status-only, mock-call or vocabulary checks.
- Release owner: distinguish technical verification, business acceptance and residual-risk acceptance.
- Registry maintainer: publish consistent canonical guidance, metadata, triggers and generated exports.

### Confirmed evidence ledger

| Finding | Canonical evidence |
|---|---|
| Positive/negative/edge scenarios and data reset exist | `skills/quality-engineering/quality-engineering-test-plan-authoring/SKILL.md:22-68` |
| Playwright template samples text before a non-retrying assertion | `skills/quality-engineering/quality-engineering-playwright-pom-generation/references/page-object-template.md:41-59` |
| NestJS E2E guidance shows unconditional guard override | `skills/nestjs/nestjs-testing/SKILL.md:40-45` |
| API design is not an executable contract-test procedure | `skills/common/common-api-design/SKILL.md:47-80` |
| Load/stress are generic performance guidance | `skills/common/common-performance-engineering/SKILL.md` |
| Security probes and authorization gates already exist | `skills/common/common-pentest-methodology/references/exploit-techniques.md:47-63`; `.agents/workflows/pentest.md:11-30` |
| Existing fuzz examples discover endpoints/parameter names | `skills/common/common-dast-tooling/references/implementation.md:55-63` |
| Regression guidance maintains Zephyr cases | `skills/quality-engineering/quality-engineering-zephyr-test-generation/references/impact_analysis.md:33-60` |
| Readiness already connects ACs, lanes, data and environment prerequisites | `.agents/workflows/implementation-readiness.md:14-29` |
| Current retained eval report qualifies transcript evidence, not execution | `evals-report.md:3-6` |
| Natural-language API-testing lookup missed relevant API/performance guidance | Observed MCP keyword lookup in this planning conversation; reproduce through the actual router before changing routing logic |
| Mobile methodology already covers background/reopen, offline, device sizes, orientation and accessibility scenarios | `skills/common/common-mobile-visual-testing/SKILL.md` and `references/scenarios.md`; presence does not establish complete runtime coverage |
| Native and cross-platform testing guidance exists | `skills/swift/swift-testing/SKILL.md`; `skills/android/android-testing/SKILL.md`; `skills/flutter/flutter-testing/SKILL.md`; `skills/react-native/react-native-testing/SKILL.md` |
| Device automation and mobile selector contracts exist | `skills/quality-engineering/quality-engineering-appium-mcp/SKILL.md`; `skills/quality-engineering/quality-engineering-selector-stability/SKILL.md` |

### Scope inventory

All of these leaves are in scope: correct Playwright assertions; qualify authorization overrides; connect six STLC stages; link four V-model test levels; map nine QA roles; specify all nine API-testing purposes; strengthen mobile testing across native iOS, native Android, Flutter and React Native; retain evidence-based regression selection and closure; verify activation and observable behavior; safely integrate registry exports. Mobile scope includes functional/UI, lifecycle/state, device/OS selection, permissions/platform integration, offline/synchronization, installation/upgrades, accessibility/presentation, performance/reliability, security/privacy and release verification. Select applicable scenarios by product risk rather than requiring every scenario on every change.

Excluded: nine new agents; replacement SDLC or test runner; mandatory testing of all nine API categories on every change; production/application implementation; blanket tool installation; general router rewrite; unrelated cleanup; redefining product policy; arbitrary performance thresholds. Mobile work extends existing methodology, platform testing and device-driver guidance; it does not introduce a new mobile framework, device-cloud subscription, store submission, signing-key management or production app.

## 3. Requirements and acceptance criteria

All requirements support OBJ-01, are proposed for implementation, and have the owner shown below. P0 means correctness/safety prerequisite; P1 means required completion scope, not optional work.

| Requirement | Outcome | Priority | Owner | Acceptance criteria |
|---|---|---|---|---|
| REQ-01 | Preserve live Playwright assertion semantics | P0 | W1 | AC-01, AC-02 |
| REQ-02 | Connect lifecycle and QA-role responsibilities | P1 | W2 | AC-03, AC-04, AC-05 |
| REQ-03 | Define reusable API correctness guidance | P1 | W3 | AC-06 through AC-10 |
| REQ-04 | Define bounded API performance validation | P1 | W4 | AC-11, AC-12 |
| REQ-05 | Preserve API security and fuzz-test integrity | P0 | W5 | AC-13 through AC-15 |
| REQ-06 | Demonstrate routing and behavior, not vocabulary alone | P1 | W6 | AC-16, AC-17, AC-18 |
| REQ-07 | Publish consistent, evidence-qualified registry surfaces | P1 | W7 | AC-19, AC-20 |
| REQ-08 | Make mobile test planning and evidence platform-aware | P1 | W9; W2/W6/W7 integrate their owned surfaces | AC-21 through AC-30 |

- AC-01: Given a visible banner whose text updates later, the recommended spec waits on the locator's expected text; it does not assert once on a previously sampled value.
- AC-02: Given legitimate snapshot extraction, guidance permits the scalar read but distinguishes it from a retrying live expectation; page-object assertions remain in specs and existing fixture ownership is preserved.
- AC-03: Given a delivery scope, a planner identifies entry evidence, outputs, exit decision and accountable owner for requirement analysis, test planning, case/data development, environment setup, execution/retest and closure. Case development and environment setup may proceed concurrently.
- AC-04: Given requirements/design artifacts, the plan traces requirements to acceptance tests, system design to system tests, architecture/interfaces to integration tests and module behavior to unit tests before execution. Small work may use equivalent existing evidence rather than four new documents.
- AC-05: Given closure evidence containing blocked tests or open defects, the report preserves those dispositions and residual-risk ownership; technical PASS does not impersonate human UAT or release approval.
- AC-06: Given a healthy health endpoint but a broken critical API operation, the proposed smoke suite does not treat health status alone as business readiness.
- AC-07: Given a schema-valid response with an incorrect business total or persisted result, a functional test rejects the result against the approved business rule.
- AC-08: Given an incompatible response change, contract verification identifies the broken schema/compatibility obligation; consumer-driven verification is explicitly selected when consumers require it, not equated with schema validation.
- AC-09: Given a specified dependency failure or retried operation, integration tests verify the agreed resulting state and absence of forbidden duplicate effects; merely firing calls does not pass.
- AC-10: Given a code/contract change, regression selection records affected obligations, selected tests, retained critical baseline and exclusion reasons; unknown impact broadens the suite or reports a blocker instead of claiming completeness.
- AC-11: Given an approved workload, load evaluation uses its request mix, rate/concurrency model, duration, latency percentiles, error budget and environment capacity; missing thresholds are surfaced, never invented.
- AC-12: Given authorized overload testing, the procedure defines ramp, finite caps, stop conditions and recovery evidence; observing 503 responses alone does not establish a pass.
- AC-13: Given an authorization test, real guards and synthetic identities/roles/tenants are exercised; bypassed guards may support isolated business tests but cannot count as security proof.
- AC-14: Given malformed or generated requests, fuzz guidance checks contract violations, unauthorized state changes, hangs and resource bounds, retaining reproducible seed/input and minimized failing cases. Endpoint discovery alone does not satisfy this criterion.
- AC-15: Given absent target authorization or unavailable runtime bounds, active stress/security/fuzz execution is BLOCKED while safe offline planning continues; agents cannot authorize themselves.
- AC-16: Given natural-language requests for each API purpose, the actual router retrieves the intended guidance without a new broad generic `testing` trigger; negative prompts about unrelated repository interfaces do not spuriously select API contract testing.
- AC-17: Given seeded faults and known-good controls, focused executable checks detect the relevant faults and accept the controls; reports separate fixture execution from model-generated candidate execution and from transcript scoring.
- AC-18: Given any unevaluated/generated candidate or unavailable driver, reporting uses not-run/BLOCKED rather than PASS; saved historical evaluation outcomes are not rewritten as current evidence.
- AC-19: Given settled source changes, official export generation produces verified scoped parity while preserving unrelated files and active SDD evidence.
- AC-20: Given final review, each requirement is linked to exact changed sources, verification results and unresolved risks; docs/changelog reflect only observed outcomes.
- AC-21: Given a native iOS, native Android, Flutter or React Native feature, planning selects the appropriate unit/component/widget/integration/device layers and stable selector strategy; browser viewport emulation and component-only tests cannot count as native device verification.
- AC-22: Given background/foreground, process termination/relaunch or interruption, a mobile scenario checks the approved restoration/session/data behavior; relaunch is not treated as equivalent to resume.
- AC-23: Given supported platforms and user/device risk, planning records a justified OS/device matrix and per-cell emulator/simulator/physical-device evidence, gaps and exclusions; one device result is not generalized to all platforms.
- AC-24: Given denied or revoked permissions, deep links, notifications or applicable camera/file integration, scenarios verify approved allowed and denied outcomes without auto-granting permissions or dismissing the very interruption under test.
- AC-25: Given network loss and reconnection with pending changes, scenarios verify the specified offline state and synchronization result, including forbidden duplicate effects; conflict policy is taken from requirements, not invented.
- AC-26: Given clean installation or upgrade from a supported prior build, scenarios verify the intended initial state or local-data migration. Reset/noReset behavior is explicit and must not silently change the test precondition to obtain a pass.
- AC-27: Given relevant accessibility/presentation requirements, verification covers VoiceOver/TalkBack semantics and focus, text scaling, orientation, keyboard and safe-area behavior; screenshots or web accessibility checks alone do not prove native accessibility.
- AC-28: Given approved mobile performance objectives, tests distinguish cold/warm startup, responsiveness, crashes/ANRs and memory, plus battery where applicable and measurable, with build/device conditions recorded; simulator results do not establish physical-device performance.
- AC-29: Given synthetic authenticated mobile sessions, security scenarios verify the applicable secure-storage, logout/session invalidation and sensitive-log boundaries without collecting real credentials or weakening device security.
- AC-30: Given a release candidate, mobile smoke evidence identifies the actual app artifact/build, distribution/signing context and device/OS tested; missing signed artifacts, drivers, physical devices or human accessibility checks remain BLOCKED/NOT RUN rather than being replaced by browser evidence.

## 4. Shared contracts — freeze before parallel dispatch

These are guidance contracts, not a new runtime schema or enum migration. Reuse existing representations and terminology when equivalent.

### C1: Test obligations and selection

Separate test purpose from execution layer. Purposes are smoke, functional, contract, integration, regression, load, stress, security and fuzz; one test may satisfy several purposes without duplication. Retain existing `lane: api` instead of inventing nine lanes. For each purpose, record applicable or not-applicable with a requirement/risk reason. Selected but unavailable testing is BLOCKED, not not-applicable.

### C2: API scenario record

Reference requirement/AC and operation; record purpose(s), method/path, principal/role/tenant, inputs and fixtures/reset, dependency mode, expected status/body/headers, observable state and forbidden effects, execution command/environment, resource limits where relevant, evidence and disposition. Use approved product contracts for exact error codes and performance targets. Do not universally mandate 403 rather than intentional 404 concealment.

### C3: Evidence record

Record source revision or snapshot digest, command, environment/driver version, scenario/AC, observed result, artifact location, limits and reviewer. Distinguish structural validation, routing verification, transcript scoring, executable fixture behavior and actual generated-candidate behavior. Never infer the last category from the others.

### C4: Execution safety

Only synthetic data and explicitly authorized isolated targets for active demonstrations. Finite duration/concurrency/payload/resource limits and cancellation required for stress/fuzz/security activity. No production or public targets; no real credentials; no automatic downloads or paid calls. Missing authority/control blocks only dependent execution. Keep credentials out of artifacts.

### C5: Canonical ownership

Canonical skills live in `skills/`; workflows in `.agents/workflows/`. W1-W5 and W9 own guidance and reference files only; W6 alone owns their `evals/**` changes and new synthetic evidence assets; W7 alone owns category metadata, generated indices/mirrors, central docs and changelog. Do not hand-edit generated mirrors. Workers request shared-file changes through the orchestrator.

### C6: Mobile scenario and evidence record

Retain existing `ios`/`android` lanes; record framework and test layer separately. Extend the shared plan with requirement/AC, app artifact digest/build/version, platform/OS/device class, emulator/simulator/physical designation, driver/version, installation/reset state, synthetic identity/data, permissions, network state, lifecycle transition, actions, observable result/forbidden effects, cleanup and evidence. Select checks across all ten mobile scope areas with applicability reasons; unsupported required execution is BLOCKED, not not-applicable. Preserve platform-specific semantics and limitations. Human-provided device evidence must be labeled and tied to the build/scenario. Never equate responsive web, a mocked native module or component tests with native-device E2E. W2 owns the shared template; W9 owns mobile methodology; W6 owns evidence fixtures; W7 owns execution/integration.

## 5. Delegation and dependency graph

The orchestrator owns this plan and all top-level decisions. Workers do not delegate or expand scope.

1. Preflight: recheck source freshness, profile eligibility, working-tree ownership, dependency availability and existing skill-name collisions. Freeze C1-C6 and the file allowlists, including mobile artifact/driver/device availability without installing or provisioning anything.
2. Wave A: dispatch W1, W2, W3, W4, W5 and W9 together; each has exclusive paths. W6 may prepare independent fixture/oracle design concurrently, without changing unsettled eval files or running checks.
3. Wave B: after guidance settles, W6 finalizes evals and fixtures; independent reviewers inspect each W1-W5 and W9 package without changing it. Corrections return to the owning worker.
4. Wave C: after all authors settle, W7 performs focused verification and safe generation; W8 conducts independent integrated review. The orchestrator verifies evidence and resolves findings through owners.
5. Delivery: return per-AC results and remaining blockers. No release or activation without separate authorization.

Implementation routing at execution time: discover profiles; use eligible `Personal - Cheap` first, then the configured eligible fallback chain only on policy-defined exhaustion or corrective failure. Research/review uses eligible analysis/review profiles, never implementation pricing shortcuts. Premium is never an automatic fallback. Preserve selected profile model, effort, mode and features. Enable completion notifications; no status polling.

### Universal worker brief

Every dispatch includes this plan path, workspace, work-package ID, owned paths, dependencies, shared contracts, ACs, non-goals, expected artifacts and verification scenarios. First read AGENTS.md and load applicable skills. Do not change unrelated work, spawn agents, commit, regenerate exports or install dependencies. While authors are active, skip builds/lint/tests/formatters; supply exact proposed commands. After the source barrier the verification owner runs checks once, with reruns only for a changed hypothesis or correction. Record edits and any unresolved decision in the completion report.

### W1 — Correct Playwright state assertions

- Size: S; confidence high. Dependencies: C1-C5 only. Own REQ-01.
- Own `skills/quality-engineering/quality-engineering-playwright-pom-generation/SKILL.md`, its `references/page-object-template.md` and other directly linked POM references only if needed; `skills/specialists/specialist-integration-test-generator/SKILL.md`.
- Explicitly exclude `evals/**`, metadata, mirrors and other specialist files.
- Explain lazy locators versus sampled scalar state; use locator assertions for eventual text/count/visibility/enabled expectations. Keep intentional snapshots valid. Align generator instructions and the example without moving assertions into page objects.
- Handoff: changed files; AC-01/02 mapping; candidate delayed-text and DOM-replacement scenarios for W6.

### W2 — Connect STLC, roles and closure

- Size: M; confidence medium. Dependencies: C1-C6 only. Own REQ-02 and shared lifecycle/template integration for REQ-08.
- Own `skills/quality-engineering/quality-engineering-test-plan-authoring/SKILL.md` and its `references/**`; `.agents/workflows/{test-loop,implementation-readiness,verify-work,traceability-audit,uat-signoff,deploy-release,publish-notes,retro-learn}.md`.
- Put the lifecycle and role matrix in one lazy reference under test-plan-authoring; workflows link to it rather than duplicate prose. Extend the existing scenario template with C2 and C6. Keep current business signoff/Zephyr ownership; explicitly add mobile device/build/data/permission readiness and release/closure evidence, not merely preserved lane names.
- Map all nine roles: requirement review, test-case generation, API contract review, automation review, failure triage, flaky analysis, defect drafting, regression selection and release summary. Name existing owning skill/workflow and handoff artifact for each; do not create nine specialists.
- Cover all six STLC stages, the four V-model pairings, strategy/scope/risk/roles/scheduling, environment/build/data smoke readiness, defect/retest feedback, coverage/defects/residual-risk closure and retrospective routing.
- Handoff: AC-03/04/05 evidence cases; mobile template/gate support for AC-21 through AC-30; exact references to W3-W5 and W9 capabilities, without editing their files.

### W3 — Specify API correctness and regression selection

- Size: M; confidence medium. Dependencies: C1-C5 only. Own REQ-03.
- Proposed new canonical root: `skills/quality-engineering/quality-engineering-api-testing/` (guidance and `references/**`, not evals). Preflight checks for an equivalent existing skill; reuse it if equivalent and notify all workers before changing the agreed root.
- Also own `skills/common/common-api-design/SKILL.md` for a narrow testing cross-reference only, and `skills/quality-engineering/quality-engineering-zephyr-test-generation/references/impact_analysis.md` for linking executable regression selection without replacing Zephyr maintenance or approval gates.
- Define smoke, functional, schema/compatibility/consumer contract, integration and regression selection procedures. Reuse C2. Include one coherent synthetic order example; its business rules are fixture-specific, never universal product policy.
- Distinguish real dependency outcomes from mocked service calls. Define safe reset and retention of failure evidence. Preserve approved status/error contracts and explicit uncertainty in selection.
- Handoff: AC-06 through AC-10 cases, exact commands supported by nearest existing consumer patterns, trigger proposals for W6/W7.

### W4 — Specify API load, stress and recovery

- Size: M; confidence medium. Dependencies: C1-C5 only. Own REQ-04.
- Proposed new root: `skills/quality-engineering/quality-engineering-api-performance-testing/` (guidance and references, not evals); narrow cross-reference in `skills/common/common-performance-engineering/SKILL.md`.
- Define workload source, arrival-rate versus closed-concurrency assumptions, request mix, warmup/measurement duration, success and error latency, percentiles, throughput, error rate and saturation indicators. Thresholds come from approved SLOs, not invented defaults.
- Separate representative load from overload; require C4 limits, degradation and recovery checks, stop conditions, environment caveats and reproducible evidence. Spike/soak are optional workload shapes selected by risk, not additional mandatory skills.
- Tool-neutral core; select existing installed project driver for examples, otherwise document the missing driver. No new load service or production benchmark.
- Handoff: AC-11/12 examples and deliberately failing threshold/recovery cases for W6.

### W5 — Specify API security and structured fuzzing

- Size: M; confidence medium. Dependencies: C1-C5 only. Own REQ-05.
- Proposed new root: `skills/quality-engineering/quality-engineering-api-fuzz-testing/` (guidance and references, not evals).
- Own narrow clarifications/cross-links in `skills/nestjs/nestjs-testing/SKILL.md`, `skills/common/common-security-audit/SKILL.md`, and `skills/common/common-dast-tooling/SKILL.md` plus its `references/implementation.md` only where needed. Do not edit cyber authorization or pentest workflow controls.
- Qualify guard overrides; connect existing BOLA/tenant/role, mass-assignment and authentication checks to real-guard API testing. Clarify static SAST/SCA is not dynamic authorization proof.
- Define schema/property-based fuzzing, boundary and malformed inputs, sequence/state preconditions where applicable, deterministic seeds, bounded payloads/time, failure minimization and promotion of distinct failures into regressions. Distinguish content discovery from robustness verification.
- Handoff: AC-13/14/15 cases; authorized synthetic controls; no live exploit execution.

### W9 — Strengthen mobile testing methodology and platform handoffs

- Size: L; confidence medium. Dependencies: C1-C6 only. Own REQ-08. W9 is appended as a stable ID; its authoring runs in Wave A, not after W8.
- Primary ownership: `skills/common/common-mobile-visual-testing/SKILL.md` and `references/**`; `skills/quality-engineering/quality-engineering-appium-mcp/SKILL.md` and its `references/**`; `skills/quality-engineering/quality-engineering-selector-stability/SKILL.md` and its `references/**` for mobile-specific clarifications only. Preserve web selector behavior.
- Bounded platform ownership: `SKILL.md` and `references/**` under `skills/swift/swift-testing/`, `skills/android/android-testing/`, `skills/flutter/flutter-testing/` and `skills/react-native/react-native-testing/`, only for missing mobile-testing rules or links to the canonical methodology. Exclude evals, metadata, workflows, test-plan references, generated exports and implementation fixtures.
- Start with a source-backed coverage matrix for all ten mobile areas and four stacks. Extend existing rules before adding references; do not label an area absent merely because no dedicated skill exists. Reuse platform security/performance/deployment guidance as read-only sources; request any necessary out-of-allowlist changes from the orchestrator before editing.
- Implement AC-21 through AC-30 as concise scenario/evidence guidance: functional/UI gestures/navigation/synchronization; lifecycle/restoration; device/OS matrix; permission/platform interactions; offline/sync; installation/upgrade/reset; native accessibility/presentation; performance/reliability; security/privacy; release artifact smoke.
- Preserve real-device versus simulator limits, native versus cross-platform layer distinctions, deterministic data/reset and session teardown. A generic recovery action must not suppress the tested permission dialog, erase migration data or switch clean-install semantics to noReset. No new Appium wrapper, mobile runner or framework.
- Coordinate C6 handoffs to W2 without editing shared templates. Request any mobile integration-generator clarification from W1, the sole owner of that specialist file. Supply focused mobile routing prompts and negative controls to W6; metadata changes go to W7.
- Handoff: source coverage matrix, changed paths, per-AC scenarios and expected outcomes, required local drivers/build artifacts and physical-device/manual checks, supported commands from existing projects, remaining evidence gaps. Do not provision cloud devices, sign/distribute apps or claim device execution during authoring.

### W6 — Own evaluation cases and behavioral evidence fixtures

- Size: L; confidence medium. Dependencies: C1-C6 for oracle design; W1-W5 and W9 settled for final case authoring. Own REQ-06 and executable evidence for REQ-08.
- Own `evals/**` under all skills changed by W1-W5 and W9, and proposed `scripts/skill-tests/testing-quality-improvement/**` for bounded synthetic checks. Do not modify shared eval engine, router implementation, package scripts or historical run records.
- Discover and reuse existing test/eval harness conventions before authoring. Keep case metadata valid; outcome checks must reject plausible incorrect candidates, not reward keyword mentions alone.
- Cover nine API-purpose trigger prompts, unrelated-contract negatives, Playwright sampled-state misuse and authorization bypass. Add mobile prompts for native iOS, native Android, Flutter and React Native plus lifecycle/offline/permission/upgrade scenarios; negative controls must reject browser-only evidence for native claims. Reproduce routing misses through the actual router; propose narrow metadata changes to W7, not a router rewrite.
- Create known-good and seeded-fault controls for delayed UI text, wrong business result, breaking schema, duplicate effects/partial failure, cross-tenant access, workload threshold/recovery failure and malformed-input invariant failure. Use actual local execution for behavioral claims; model-generated artifacts must be separately identified and executed before claiming candidate effectiveness.
- For mobile, author platform-appropriate scenarios and fault/control pairs for lifecycle restoration, permission denial/revocation, reconnect duplicate prevention and installation/upgrade reset semantics. Cover AC-21 through AC-30 with explicit executable or manual evidence lanes. Exercise iOS and Android separately when supported artifacts/drivers are available; do not infer Flutter, React Native or physical-device coverage from another stack. Use existing synthetic/sample artifacts where suitable; small fixture apps stay inside W6's fixture ownership and are not production implementations.
- Use existing Playwright/browser and mobile driver/device dependencies if available; no installation, cloud provisioning or app signing without approval. No paid model campaign is assumed. If an indispensable driver, app artifact, physical device, manual accessibility check or model-run authorization is unavailable, finish independent work and record precisely which AC and matrix cell is blocked.
- Handoff: source/fixture digests, exact single-run commands, independent oracles, expected failure classification and evidence taxonomy. Synthetic fixtures do not prove production capacity or cross-framework effectiveness.

### W7 — Integrate metadata, exports and verification

- Size: M; confidence medium. Dependencies: W1-W6 and W9 settled and task review findings resolved. Own REQ-07; execute mobile evidence scenarios from W6 and W9.
- Sole owner of category metadata/version records, new-skill registration, trigger metadata reconciliations, generated indices/mirrors, appropriate changelog and central documentation. Discover exact metadata files from current conventions; never guess or hand-edit generated files.
- Check final skill names against W2 links. Apply only justified narrow trigger changes; run positive and negative routing checks using the real implementation.
- Run scoped checks below, then official generation in disposable staging with allowlisted copy-back. Read `ags-generator-safety` and `sdd-evidence-preservation` first. Preserve `.agent/sdd`, canonical workflows, unrelated orphans and historical evidence; never adopt/copy a generated ownership lockfile from staging.
- Keep active ledgers outside generator-migrated paths or archive before generation. Capture source identity only after source writers stop.
- Handoff: per-path generated parity, dependency provenance, command outcomes, AC matrix and exact unresolved blockers. No package/release version bump beyond repository-required skill metadata; no release commands.

### W8 — Independent review and acceptance recommendation

- Size: M; confidence medium. Dependencies: settled task packages; final integration for whole-change verdict.
- Read-only; no implementation ownership. Review spec compliance and quality for every package; review the integrated revision separately after W7.
- Verify all nine QA roles, six STLC stages, four V-model links, nine API purposes, Playwright correction, ten mobile areas and four mobile stacks remain represented. Inspect safety, realistic negative cases, nonduplicated rules, source/evidence identity, device/build provenance, simulator/physical and component/device distinctions, generated parity and truthfulness of claims.
- Return findings with exact file/line, affected AC, severity and concrete remedy; do not implement fixes or approve human-only release/business decisions.
- Orchestrator sends concrete corrections to the original owner; one corrective attempt before routing escalation under the active policy. Quality failure is not provider exhaustion.

## 6. Verification and delivery gates

### Source and structural checks

Commands confirmed in root `package.json` (execution owner W7; prefix shell commands with `rtk`):

- `rtk pnpm audit:skills` — registry structure.
- `rtk pnpm audit:keywords` — trigger collision diagnostics; not behavioral routing proof.
- `rtk pnpm audit:sdlc` — lifecycle alignment.
- `rtk pnpm test:evals` — evaluation engine regression suite, not proof of new skill effectiveness.
- `rtk pnpm mcp:test` — MCP regression suite; use actual router scenarios as additional evidence.
- `rtk pnpm docs:capabilities:check` — after scoped generation, not during parallel edits.

W6 resolves exact focused commands from existing harnesses and records them before execution. Do not invent unsupported CLI flags. W7 may narrow suites to existing supported commands after reading package scripts. Unrelated pre-existing failures remain failures with ownership recorded; do not repair unrelated code or relabel the gate green.

### Required behavioral checks

- Execute a real delayed-text Playwright case with good and sampled-value controls; record browser availability and result.
- Execute local synthetic API correctness/security/fuzz scenarios with real assertions against responses and state.
- Exercise load/stress measurement and recovery on an authorized isolated fixture with finite bounds; a deterministic threshold calculator alone does not prove actual load behavior.
- Exercise actual skill routing with all purpose prompts and negative controls.
- Exercise mobile routing for all four stacks and platform-specific scenarios. Verify the C6 template retains build/device/reset/permission/network provenance and unavailable matrix cells.
- Run selected mobile scenarios on identified iOS/Android simulator/emulator or physical devices against synthetic artifacts, including state restoration, denied permission, offline reconnect and install/upgrade behavior, with fault/control comparisons. Treat missing artifacts or drivers as blocked evidence, not permission to simulate a device result in a unit test.
- Record native accessibility/manual and physical-device performance/security/release checks separately. Automated screenshots, mocked native modules and responsive browser sessions cannot substitute for these results. Exact mobile commands are selected from the existing stack/driver and recorded by W6/W9 before W7 executes them.
- Separate fixture correctness from generated-candidate effectiveness. Current transcript evaluations remain transcript evidence. Any model-run cost/authorization is resolved before dispatch, not hidden in a check command.

### Report contract

Each worker returns: work-package ID; changed paths; mapped REQ/ACs; decisions within scope; proposed or executed commands clearly distinguished; exact evidence; missing prerequisites; risks; and files requested from another owner. After W7 executes checks, attach results to each originating work package.

Final statuses: PASS, FAIL, BLOCKED, NOT RUN; not-applicable requires an approved scope/risk reason. No completion claim with unresolved required behavior. Human approval cannot be supplied by another agent.

## 7. Risks, transitions and readiness

- New skill roots are planned outputs, not claims that those files exist. Preflight collision check owns any reuse decision.
- Broad trigger keywords may introduce false positives: W6 owns negative cases; W7 owns metadata integration. A router-code defect is a separately scoped decision, not permission to refactor the router.
- Existing examples may be copied into consumer projects: update canonical examples and officially generated mirrors together. No compatibility aliases or duplicate rule copies.
- Fixture tests can pass while generated agents fail: preserve separate evidence classes; do not advertise effectiveness from fixture-only results.
- Dependency/browser/mobile driver and app-artifact availability, physical devices, manual accessibility participation and model-run authorization are execution prerequisites, currently unverified. W6/W7/W9 own resolution; only dependent checks block. Native iOS, native Android, Flutter and React Native guidance is all in scope even if execution evidence for a particular platform remains unavailable.
- Source authoring can proceed without live targets. No permission to weaken runtime safety gates to obtain green evidence.
- No new runtime telemetry or analytics service; use existing evaluation/verification artifacts and report observed counts/cost only when exposed.
- Scope correction: the initial plan explicitly excluded new mobile improvements despite the broader testing intent. The user has now requested their inclusion. This revision appends REQ-08, AC-21 through AC-30, C6 and W9 without renumbering prior IDs. Planning lesson: expose platform coverage and exclusions before calling a cross-SDLC testing plan complete; no registry-wide workflow change is authorized by this correction.

## 8. Handoff

Planning output: this single canonical document combines requirements and executable work-package briefs to avoid parallel requirement databases. No separate BRD is necessary; the conversation is the equivalent intake.

Next workflow: `implementation-readiness`, then `subagent-driven-development` using the already selected delegated approach when the user instructs execution. Readiness must verify owner assignments, unchanged contracts, profile eligibility and source/dependency state; it must not repeat product intake.

Plan approval: approved by user instruction “okay start implement the plan”. Implementation status: INTEGRATED (R2 Corrective Complete, R3 corrective integration applied, R4 destination-seal correction applied, PR preparation complete) — W1-W5 and W9 source settled and approved; W6 eval/behavior corrections accepted (R5); W7 R2 metadata, staging generation, sealed inventory, and verification complete; W7 R3 resolved the six W8 final-review residuals; W7 R4 resolved the one remaining Major that the W8 R3 review left open; W8 R4 independent review approved source compliance, covering generation proof, and final inventory; authoritative user acceptance decision ACCEPT_DOCUMENTED_HISTORICAL_GAP (artifacts/testing-quality-improvement/pr-readiness-acceptance-decision.json) supersedes prior NO_WAIVER blocker for PR readiness with explicit disclosure; fixture runner made environment/project portable. Verification status: Local synthetic checks PASS (18/18 with real Chromium browser via portable runner); Router matrix PASS (31/31 authored keyword cases on final generated metadata); TypeScript syntax parsing PASS (4/4 blocks, syntax-only); Candidate Scorer calibration PASS (R2: 44/44 on candidate repo scorer 5f254 with matchesRepo=true; historical R1 42/44 FAIL on divergent engine preserved separately); Full supported eval regression suite PASS (89/89 across 6 discovered scripts/evals/*.test.ts entrypoints, 0 failures, superseding historical partial 2/2 run); audit:injection PASS with no error-level patterns and one warn-only body finding; R4 staged generation PARITY_VERIFIED against a 2209-path destination surface sealed before any generator ran (2174 emitted targets, all identical, 0 copied/created/refused, per-path baseline/pre-write/final digests retained; drift-refusal rule exercised on 5 synthetic cases and fails closed), with 103 SDD files and 42 protected assets unchanged and .skills-lock.json absent before and after; R1 parse receipt restored to its sealed hash 5efa937e… from a retained original tool transcript. Observed non-zero warnings retained: CLI validation 56, freshness 17 (0 high/10 medium/7 low), alignment 2 below 90%, the Vite config warning, and the injection warn-only finding. Complete verification summary committed to artifacts/testing-quality-improvement/verification-summary.md; historical raw evidence archives preserved in unpublished local storage. Native physical device execution, app binary provisioning, and model candidate runs remain BLOCKED/NOT RUN.

Change log: 2026-10-26 — created from the combined QA/STLC/Playwright/API assessment; amended on explicit user request to include mobile methodology, platform applicability, delegated ownership and device-qualified verification; implementation subsequently approved and delegated. 2026-10-27 — W7 R1 integration; W8 evidence audit (I1-I6); W7 R2 corrective pass executed resolving all audit findings with sealed inventory, candidate scorer calibration (44/44 PASS), direct execution capture, and full surface parity; W8 final review raised six residual evidence defects; W7 R3 corrective integration closed them with a new immutable evidence revision (retained in unpublished local archive); W8 R3 review accepted five of six and left the destination-baseline defect open; W7 R4 closed it with pre-generation sealing, per-path destination proof and a fail-closed drift rule in an immutable revision (retained in unpublished local archive); W8 R4 independent review approved source compliance, generation proof, and final inventory; authoritative user acceptance decision accepted documented historical gap (ACCEPT_DOCUMENTED_HISTORICAL_GAP) for PR readiness; fixture runner updated with portable resolver; PR prepared on develop. Execution ledger retained in local orchestrator progress log.
