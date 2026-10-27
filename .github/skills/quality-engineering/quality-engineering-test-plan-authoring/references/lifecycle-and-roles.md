# STLC Lifecycle, V-Model, Roles, and Closure Matrix

## 1. Six STLC Stages

| Stage | Entry Evidence | Activities & Concurrency | Key Outputs | Exit Gate Decision | Accountable Role |
|---|---|---|---|---|---|
| **1. Requirement Analysis** | Approved PRD, SRS/FRS, ACs, design specs | Analyze AC testability, boundary clarity, error paths, HALT triggers | Testable requirement trace, lane assignments (web/ios/android/api), selector/data needs | Testability signed off; HALT triggers resolved | Requirement Review |
| **2. Test Planning** | Testable requirements, architectural scope | Define strategy, V-model levels, risk analysis, role allocation, execution schedule, environment/driver matrix | Test plan (`docs/srs/test-plan-[slug].md`), C1/C2/C6 scenario matrix | Test strategy and plan approved | QA Planner |
| **3. Test Case & Data Development** | Approved test plan, stable ACs | Author scenarios (P/N/E classes; C1, C2 API, C6 Mobile), generate seed data, define state reset, log selector gaps *(Runs concurrently with Stage 4)* | Executable test specs, page objects, fixtures, reset scripts, seed data | Test cases reviewed & dry-run validated | Test-Case Generation, Automation Review |
| **4. Test Environment Setup** | Architecture specs, environment requirements, build artifacts | Provision environments, deploy test builds, configure mocks/data, run driver preflight (`playwright-cli`, `appium-mcp`) *(Runs concurrently with Stage 3)* | Smoke-verified environment, active driver connections, accessible endpoints/devices | Environment smoke checks PASS; build verified | Environment Setup, Test Runner |
| **5. Test Execution & Retest** | Verified test cases, smoke-verified environment, build artifact | Execute automated & manual suites, triage failures, quarantine flaky tests, draft defect reports, retest fixes | Execution logs, evidence artifacts (`<AC>-<before/after>.*`), defect tickets, heal verdicts | All planned scenarios executed or accounted for | Test Runner, Failure Triage, Flaky Analysis, Defect Drafting |
| **6. Test Cycle Closure** | Execution logs, defect dispositions, retest proofs | Analyze test coverage, evaluate exit criteria, compile residual-risk ledger, calculate automation health, route retro | Test summary report, residual-risk ledger, automation health metrics, retro inputs | Technical closure achieved; formal handoff to UAT/Release | Release Summary (QA Lead / Release Owner) |

## 2. Four V-Model Test Levels & Traceability

1. **Requirements (BRD / PRD) <--> Acceptance Testing (UAT / Signoff)**
   - Focus: Business workflows, user outcomes, contractual acceptance criteria.
   - Owning Workflow: `uat-signoff`.
   - Gate: Evaluates business acceptance. Technical PASS does not replace business signoff.
2. **System Design (SRS / FRS, Architecture) <--> System Testing (End-to-End, System-Level)**
   - Focus: End-to-end user journeys, cross-service workflows, mobile app lifecycle/device behavior, performance, security.
   - Owning Workflows: `test-loop`, `verify-work`.
3. **Architecture & Interfaces (APIs, Schemas, Inter-service) <--> Integration Testing (API Contracts, Data Flows)**
   - Focus: API schema/compatibility/consumer contracts, database integration, message queue flows, failure-state propagation.
   - Owning Skills: `quality-engineering-api-testing`, `quality-engineering-api-fuzz-testing`.
4. **Module & Low-Level Design (Components, Functions) <--> Unit Testing (Isolated Units)**
   - Focus: Component isolation, state transitions, algorithmic logic, internal error branches.
   - Owning Skills: Stack-specific unit testing skills (e.g., `typescript-testing`, `swift-testing`, `android-testing`).

*Sizing Note:* Small/low-risk work may use equivalent existing evidence (e.g. inline tests and brief acceptance criteria) rather than four distinct documents.

## 3. Nine QA Roles & Capabilities Mapping

| Role | Core Focus | Owning Skill / Workflow | Handoff Artifact | Downstream Consumer |
|---|---|---|---|---|
| **1. Requirement Review** | Analyze AC testability, boundary coverage, HALT triggers, risk level | `quality-engineering-test-plan-authoring`, `implementation-readiness` | `docs/srs/test-plan-[slug].md` (or readiness verdict) | Implementation planner, test-case generator |
| **2. Test-Case Generation** | Expand ACs into positive (P), negative (N), edge (E) scenarios across web, API, mobile | `quality-engineering-test-plan-authoring`, `test-loop` | Test plan scenarios, test specs | Automation author, manual tester |
| **3. API Contract Review** | Verify schema compatibility, consumer obligations, error handling, security constraints | `quality-engineering-api-testing`, `quality-engineering-api-fuzz-testing` | API scenario records, contract diffs | Backend implementer, integration tester |
| **4. Automation Review** | Review locator stability, assertions (lazy vs sampled), page object structure, isolation | `quality-engineering-playwright-pom-generation`, `quality-engineering-selector-stability` | Reviewed POMs, test review notes | Automation maintainer, CI runner |
| **5. Failure Triage** | Categorize failures: real product bug vs test code flaw vs environment/driver outage | `test-loop` (step 5 healer), `verify-work` | Triage classification (`REAL_BUG_DO_NOT_HEAL`, `HEALED`, `driver_blocked`) | Bug fixer (`dev-fix`), test healer |
| **6. Flaky Analysis** | Identify non-deterministic tests, quarantine, set expiration, analyze timing/concurrency | `quality-engineering-flaky-triage`, `test-loop` | Flake quarantine ticket / entry | Quality engineering, test maintainer |
| **7. Defect Drafting** | Capture reproducible steps, before/after evidence, logs, environment context, severity | `dev-fix` (intake), `test-loop` (`real_bugs[]`), `verify-work` | Defect record with minimal repro and artifacts | Bug triage, developer |
| **8. Regression Selection** | Select tests based on code/contract impact, preserve baseline suite, document exclusions | `quality-engineering-api-testing`, `quality-engineering-zephyr-test-generation` | Impact-selected regression suite, exclusion ledger | CI runner, release gate |
| **9. Release Summary** | Consolidate execution results, defect status, residual risks, automation health | `quality-engineering-automation-health`, `traceability-audit`, `uat-signoff`, `deploy-release` | Test closure report, residual-risk ledger, release confidence | Release owner, business approver |

## 4. Test Cycle Closure and Residual Risk Protocol

- **Technical PASS vs Release Authority:** Technical PASS certifies verification against automated and manual test contracts. It NEVER impersonates or replaces human UAT signoff (`uat-signoff`) or production deployment authorization (`deploy-release`).
- **Dispositions:**
  - `PASS`: Proven with fresh, executable evidence.
  - `FAIL`: Defect identified with evidence; blocks release unless formally waived.
  - `BLOCKED`: Dependency, environment, driver, or credential missing. Explicitly listed under `missing_evidence`. Never marked as not-applicable or PASS.
  - `RISK_ACCEPTED`: Explicit waiver by a named authorized human with business rationale, scope boundaries, and expiration date.
- **Open Defect Ledger:** All unresolved defects from execution must be recorded with issue ID, severity, affected AC, and assigned owner.
- **Feedback Loop:** Defects and regressions route to `dev-fix`; process gaps, flaky patterns, and tooling friction route to `retro-learn`.

## 5. Mobile Readiness and Closure Gates (C6)

*Canonical Matrix Reference:* [Mobile Testing Coverage Matrix & Platform Methodology](../../../common/common-mobile-visual-testing/references/mobile-testing-matrix.md)

- **Readiness Checklist:**
  1. Target app build identified with flavor, build number, version, and artifact checksum/digest.
  2. Target OS and device matrix defined (supported OS versions, screen sizes, simulator/emulator vs physical device).
  3. Driver preflight verified (`appium-mcp` or native runner `xcrun simctl` / `adb`).
  4. Platform permissions prerequisites configured (synthetic permissions granted/denied per scenario; no auto-grant bypass).
  5. Test data seeded and scenario-specific setup/reset/cleanup semantics defined:
     - `fullReset`: fresh install and pristine app data only when authorized by a clean-install precondition.
     - `noReset`: reuse existing app session and container state.
     - Real upgrade: install new binary build directly over previous version (note: `noReset != real upgrade`).
     - State preservation: explicitly preserve prior-build data, active user session, or queued offline mutations through verification and failure-evidence capture; never execute blanket wipe or fullReset before evidence is secured.
  6. Lifecycle transitions separated by true mechanism:
     - Warm resume: app moved to background and restored without process death.
     - Config change: `ActivityScenario.recreate()` or orientation change.
     - Cold process death: OS process termination (`adb shell am kill`) and state restoration (note: `ActivityScenario.recreate != process death`).
- **Closure Criteria:**
  1. Results qualified by tested device/OS cells; simulator results cannot substitute for physical device requirements.
  2. Scenarios spanning the 10 mobile scope areas (Functional/UI, Lifecycle/State, OS/Device Matrix, Permissions, Offline/Sync, Install/Upgrade, Accessibility, Performance, Security, Release Smoke) are accounted for; unsupported tests remain `BLOCKED`.
  3. Accessibility checks (VoiceOver / TalkBack focus and labels) verified or explicitly flagged if requiring manual physical evaluation.
