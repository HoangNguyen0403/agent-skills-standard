---
name: quality-engineering-test-plan-authoring
description: Turn acceptance criteria into an executable test plan (scenarios, seed, selector gaps) before generating E2E code. Use when ACs exist but no runnable test plan does yet.
guardrail: true
metadata:
  triggers:
    files:
      - "specs/**/*.md"
      - "tests/seed.spec.*"
    keywords:
      - test plan
      - executable test plan
      - seed spec
      - scenario matrix
      - ac to scenario
      - planner
---
# Quality Engineering: Test Plan Authoring

## **Priority: P1 (HIGH)**

## Input

`AC-*` IDs and SRS lanes (unit/integration/E2E-web/E2E-mobile/API) from the approved PRD/SRS. Trace across 4 V-Model pairings (Requirements <-> Acceptance, System Design <-> System, Architecture/API <-> Integration, Module <-> Unit) before execution. Never derive scenarios from reading code.

## Output

`docs/srs/test-plan-[slug].md` (and `specs/[slug].md`). Each scenario block: `Steps`, `Expected`, `@AC-n` tag, `priority`, exactly one `lane` (web|ios|android|api). Web uses Playwright locators; API follows C2 contract (purpose, principal, setup/reset, dependency mode, expected vs forbidden effects, bounds, observed state, evidence); Mobile follows C6 contract (app stack distinct from runner/driver, build artifact digest, OS/device matrix, permissions, lifecycle, install/upgrade state, observed state, evidence). One scenario covers one AC condition in exactly one lane. Unavailable selected capabilities are marked BLOCKED, never N/A.

## STLC Lifecycle & Roles

Connects the 6 STLC stages (Requirement Analysis, Test Planning, Test Case/Data Dev, Environment Setup, Execution/Retest, Cycle Closure) and maps 9 QA roles (Requirement Review, Test-Case Generation, API Contract Review, Automation Review, Failure Triage, Flaky Analysis, Defect Drafting, Regression Selection, Release Summary). See `references/lifecycle-and-roles.md`. Case dev and environment setup may run concurrently.

## Seed, Selector Gaps & Reset

`tests/seed.spec.ts` (or platform equivalent) carries shared prerequisites (auth/navigation, no assertions). `Selector Gaps` follow `<screen>-<element>-<role>`. `Data & Reset` defines scenario-specific state fixtures and state preservation; no blanket data wipe or fullReset before verification and failure evidence are secured.

## Scenario Classes & Closure

Each AC condition expands to `P` (positive), `N` (negative), and `E` (edge). Classes differ by precondition or input, not phrasing. Every `Expected` cites its AC/rule or is tagged `ASSUMED`. On HALT triggers, stop and ask (`HALT: <trigger>`). Closure records executed/blocked counts, open defect ledger, and residual risk. Technical PASS validates contract criteria only; it never replaces human UAT signoff (`uat-signoff`) or release approval (`deploy-release`).

## Relationship to Zephyr

Manual Zephyr TCs stay the system of record for business sign-off (`quality-engineering-zephyr-test-generation`); scenarios carry bidirectional TC-key references and are additive.

## Anti-Patterns

- A scenario without an `Expected` outcome or spanning multiple `lane` values.
- A plan derived from source code instead of `AC-*`.
- Duplicating unit-level coverage in an E2E scenario or omitting seed references.
- Technical PASS impersonating human UAT signoff or release authorization.
- Marking an unavailable required test as not-applicable instead of BLOCKED.
- Blanket app-data wipe or fullReset that destroys upgrade/restoration state before verification.
- Concealing open defects, missing drivers, or unverified device cells at closure.
## References

- [Test Plan Template](references/test-plan-template.md)
- [Playwright Agents Artifacts](references/playwright-agents-artifacts.md)
- [STLC, V-Model, Roles & Closure Matrix](references/lifecycle-and-roles.md)
- [AC to Scenario Mapping](references/ac-scenario-mapping.md)
- [Mobile Lane Matrix](references/mobile-lane-matrix.md)
- [Scenario Expansion: P/N/E, ASSUMED, HALT](references/scenario-expansion.md)
- [Golden Requirements Fixtures](references/golden-requirements.md)
- Connected Skills: API Testing (`quality-engineering-api-testing`), Mobile Testing (`common-mobile-visual-testing`, `quality-engineering-appium-mcp`)
