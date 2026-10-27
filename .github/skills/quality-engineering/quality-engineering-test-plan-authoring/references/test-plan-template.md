# Test Plan Template

```md
# Test Plan: [slug]

## Scope & Lanes
Lanes: web | ios | android | api (exactly one lane per scenario)
V-Model Level: Acceptance | System | Integration | Unit
STLC Gate: Planning -> Case/Environment Setup (see skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md)

### Purpose Applicability (Contract C1)
- smoke: [applicable | not-applicable] — [risk/requirement rationale]
- functional: [applicable | not-applicable] — [risk/requirement rationale]
- contract: [applicable | not-applicable] — [risk/requirement rationale]
- integration: [applicable | not-applicable] — [risk/requirement rationale]
- regression: [applicable | not-applicable] — [risk/requirement rationale]
- load: [applicable | not-applicable] — [risk/requirement rationale]
- stress: [applicable | not-applicable] — [risk/requirement rationale]
- security: [applicable | not-applicable] — [risk/requirement rationale]
- fuzz: [applicable | not-applicable] — [risk/requirement rationale]
*(Selected unavailable capabilities are marked BLOCKED, never N/A)*

### Mobile Area Applicability (if mobile in scope per Contract C6)
- Areas [1..10]: [Functional/UI, Lifecycle/State, OS/Device Matrix, Permissions, Offline/Sync, Install/Upgrade, A11y, Performance, Security, Release Smoke]
- Applicability & Exclusions: [record applicability with risk reason or justified exclusion; selected unavailable marked BLOCKED, never N/A]

## Shared Evidence Record Reference (Contract C3)
- Source revision / digest: [git SHA or snapshot digest]
- Environment / driver version: [runtime environment, driver version]
- Limitations / exclusions: [known constraints, hardware/network bounds]
- Reviewer / date: [reviewer identity, review date]

## Web Scenarios

### Scenario 1: [name]
- @AC-[n]
- priority: high | medium | low
- lane: web
- steps:
  1. [Step 1: navigation / interaction using lazy locators]
  2. [Step 2: user input]
  3. [Step 3: submission]
- expected: [observable UI state / locator assertion from approved AC; no assertions inside page objects]
- evidence & disposition: [trace/log path, PASS | FAIL | BLOCKED | NOT_RUN]

## API Scenarios (Contract C2)

### Scenario 2: [name]
- @AC-[n]
- priority: high | medium | low
- lane: api
- purpose: smoke | functional | contract | integration | regression | load | stress | security | fuzz
- operation: [HTTP_METHOD] [path from approved contract]
- principal: [synthetic role / tenant / identity; no real credentials]
- scenario setup & state: [fixtures required, dependency mode: synthetic mock vs real external, initial DB state]
- input: [request payload / query parameters / headers from approved contract]
- expected: [status code, expected headers, response body assertions from approved contract; missing contract surfaced, never invented]
- observed result & state: [observed HTTP status, verified persisted DB/queue mutation, absence of forbidden side-effects]
- forbidden effects: [no duplicate records, no leaked secrets, no cross-tenant leakage, no unauthorized state change]
- bounds & cancellation: [timeout limit, max payload size, rate/duration limits for stress/fuzz/load, cancellation trigger]
- command & environment: [existing project test command, authorized isolated target base URL; missing command/contract surfaced, never invented]
- scenario cleanup: [scenario-specific state teardown; preserve failure evidence and prior state until assertions complete]
- evidence & disposition: [response log path, artifact location, PASS | FAIL | BLOCKED | NOT_RUN]

## Mobile Scenarios (Contract C6)

*Canonical Matrix Reference (Registry Source):* `skills/common/common-mobile-visual-testing/references/mobile-testing-matrix.md` (canonical registry source; consumers link installed project path where available)

### Scenario 3: [name]
- @AC-[n]
- priority: high | medium | low
- lane: ios | android (exactly one platform per scenario)
- mobile scope area: 1. Functional/UI | 2. Lifecycle/State | 3. OS/Device Matrix | 4. Permissions | 5. Offline/Sync | 6. Install/Upgrade | 7. A11y | 8. Performance | 9. Security | 10. Release Smoke
- app stack: native-ios | native-android | flutter | react-native
- test runner / framework: xcuitest | espresso/compose | patrol | detox | maestro
- driver & version: [appium-uiautomator2 / appium-xcuitest-driver / adb / xcrun simctl / native runner and version]
- target artifact: [build flavor, version, build number, SHA-256 digest, signing context]
- platform & device: [OS version, device model, class: simulator | emulator | physical (simulator cannot prove physical hardware/thermal/battery/biometrics)]
- precondition & install state: clean-install (fullReset) | session-reuse (noReset) | real-upgrade (install build over prior build; note: noReset != real upgrade) | state-preservation (retain prior session/offline-queue)
- scenario identity & synthetic data: [synthetic test user, local DB seed; no real credentials]
- permissions: [camera | location | notifications | storage: granted | denied | prompt (never auto-grant in permission tests)]
- network condition: online | offline (airplane mode) | throttled | packet-loss
- lifecycle transition: warm-resume (background -> foreground) | config-change (recreate) | process-death-restoration (OS kill -> relaunch; note: ActivityScenario.recreate != process death) | none
- execution command: [actual project mobile test command / driver script; missing command surfaced, never invented]
- steps & actions:
  1. [Launch app / navigate to target screen]
  2. [Perform action / gesture / state transition]
  3. [Observe outcome]
- expected: [observable UI state, accessibility focus, restored draft, or synchronization outcome per approved AC]
- observed result & state: [observed UI state, persisted SQLite/Room/KeyStore state, synchronization outcome]
- forbidden effects: [no duplicate sync, no unhandled ANR/crash, no credential leak in system logcat/os_log, no state loss on resume]
- bounds & cancellation: [action timeout, max retry count, memory/frame budget where applicable]
- scenario cleanup: [scenario-specific cleanup; do NOT execute blanket wipe/fullReset before verification and failure evidence are captured]
- evidence & disposition: [screenshot/video path, driver log path, PASS | FAIL | BLOCKED | NOT_RUN]

## Selector Gaps
- [screen]-[element]-[role] gap items: elements needing stable test IDs/accessibility locators per `quality-engineering-selector-stability`

## Data & Reset
- Web/API: scenario-specific seed fixtures and reset mechanisms; missing reset commands surfaced, never invented
- Mobile: scenario-specific setup and state fixtures; explicitly preserve prior build/session/offline queue until verification and failure evidence are captured; do NOT execute blanket app-data wipe or unconditional fullReset

## Closure & Residual Risk (STLC Stage 6)
- Executed Scenarios: [count] PASS, [count] FAIL, [count] BLOCKED, [count] NOT_RUN
- Open Defects:
  - [DEFECT-ID]: [severity] - [affected AC] - [owner]
- Residual Risks:
  - [Risk 1]: [untested physical device cell / driver gap / waived optional check] - [owner] - [rationale/expiry]
- Technical Closure Verdict: READY_FOR_UAT | BLOCKED | REJECTED
- Release Authority Note: Technical PASS validates automated/manual contract criteria only; does not replace human UAT signoff (`uat-signoff`) or release deployment authorization (`deploy-release`).
```
