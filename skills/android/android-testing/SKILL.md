---
name: android-testing
description: Write Android unit, Compose UI, and Hilt-integrated tests. Use when designing test behavior with MockK or coroutine test utilities; defer database/WorkManager-specific recipes to the owning feature skill.
metadata:
  triggers:
    files:
    - '**/*Test.kt'
    - '**/*Rule.kt'
    keywords:
    - "@Test"
    - runTest
    - composeTestRule
    - HiltAndroidTest
    - MockK
    - createAndroidComposeRule
    - MainDispatcherRule
    - "@TestInstallIn"
---
# Android Testing Standards

## **Priority: P0 (CRITICAL)**

## The Four-Pillar Test Value Framework

Qualitative reasoning framework to evaluate unit test value:
- **Protection against Regressions**: Catches real defects; a test passing during failure offers zero protection.
- **Resistance to Refactoring**: Decoupled from internal implementation; zero false alarms on internal refactorings.
- **Fast Feedback**: Executes in milliseconds; rapid local TDD feedback loop.
- **Maintainability**: Clean AAA structure, high readability, zero boilerplate duplication.
Avoid inventing arbitrary numeric scores (e.g. P * R * F * M) statically without empirical measurement.

## Core Rule Anchors

- **`[MOB-TEST-01]` Tripartite Naming**: Name tests `Method_Scenario_ExpectedBehavior` (e.g. `submitOrder_whenCreditLimitExceeded_displaysBlockedBanner`).
- **`[MOB-TEST-02]` State & ViewModel Invariant Rule**: Assert UI state transitions (e.g. `StateFlow`/`UiState` via Turbine `test {}`); ban asserting 30-property boilerplate state copies.
- **`[MOB-TEST-03]` Entity Invariant & Serialization Rule**: Test calculations, validations, domain invariants, and non-trivial serialization/parsing or error mapping. Ban testing auto-generated code, trivial getters, or echo tests repeating literal assignments.
- **`[MOB-TEST-04]` Contract Testing Rule**: Repositories and data sources must be tested for contract compliance and error mapping. Ban 1:1 pass-through mock echoing (`coEvery { dataSource.get() } returns x; repo.get() == x`).
- **`[MOB-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a failing test reproducing the defect before fixing it.

## Implementation Guidelines

### Unit Tests
- **Scope & Async**: ViewModels, Usecases, Repositories, Utils. Use `runTest` with `MainDispatcherRule`. Mock with MockK or fakes.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

### UI Integration Tests (Instrumentation)
- **Scope & DI**: Composable Screens, Navigation flows. Use `createAndroidComposeRule` + Hilt (`HiltAndroidRule`). Fake repositories via `@TestInstallIn`.
- **Negative Assertions**: Add negative assertions only when absence is part of the business contract.

## Anti-Patterns & Banned Smells

- **`[MOB-TEST-01]` Vague names**: Banish non-descriptive test names.
- **`[MOB-TEST-02]` Brittle state copies**: Ban asserting 30-property boilerplate state copies; use focused state assertions or Turbine.
- **`[MOB-TEST-03]` Echo tests**: Ban testing auto-generated code, trivial getters, or repeating literal assignments.
- **`[MOB-TEST-04]` Pass-through mock echoing**: Ban 1:1 pass-through mock echoing and shallow assertions without contract checks.
- **`[MOB-TEST-05]` Missing bug reproduction**: Ban bug fix PRs without reproduction tests.
- **No Real Network / Thread.sleep**: Fake repositories in DI; use IdlingResource or `composeTestRule.waitUntil` for async timing.

## References

- [Test Rules](references/implementation.md)
