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
    - android instrumentation test
---
# Android Testing Standards

## **Priority: P0 (CRITICAL)**

Universal anti-slop rules (naming, identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps,
shallow assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Android
deltas follow.

## Core Rule Anchors

- **`[MOB-TEST-02]` State & ViewModel Invariant**: Assert UI state transitions (`StateFlow`/`UiState` via Turbine `test {}`); ban
  asserting copies of 30-property state. Under `runTest` with `StandardTestDispatcher`, advance virtual time with
  `advanceUntilIdle()` or Turbine before asserting (`GUARD-KT-02`).
- **`[MOB-TEST-03]` Entity Invariant & Serialization**: Test calculations, validations, domain invariants, and non-trivial
  serialization/parsing or error mapping. Ban tests of generated code and trivial getters.
- **`[MOB-TEST-04]` Contract Testing**: Repositories and data sources must prove contract compliance and error mapping; ban 1:1
  stub-return echoes (`GUARD-KT-01`: `coEvery { dataSource.get() } returns x; repo.get() == x`).
- **`[MOB-TEST-06]` Layer & Device Fidelity**: Select layer (Unit > Compose UI > UiAutomator). In-memory tests cannot prove device
  behavior. Activity recreation (`recreate()`) is same-process only; true OS process death requires external device termination
  and relaunch.

## Implementation Guidelines

### Unit Tests
- **Scope & Async**: ViewModels, Usecases, Repositories, Utils. Use `runTest` with `MainDispatcherRule`; inject
  `DispatcherProvider` rather than reading `Dispatchers.Main`. Mock with MockK or fakes.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths.

### UI Integration Tests (Instrumentation)
- **Scope & DI**: Composables, navigation flows. Use `createAndroidComposeRule` + `HiltAndroidRule`; replace modules with
  `@TestInstallIn` fakes.
- **TalkBack Semantics**: Assert `onNodeWithContentDescription` on interactive nodes (semantic tree only; does not prove device
  TalkBack focus traversal or audio announcements); verify touch bounds ≥ 48dp.
- **Negative Assertions**: Add negative assertions only when absence is part of the business contract.

## Anti-Patterns

- **Brittle state copies & unadvanced virtual time (`MOB-TEST-02`, `GUARD-KT-02`)**: Ban whole-state `copy` assertions and
  assertions on uncompleted coroutines without `advanceUntilIdle()` or Turbine.
- **Pass-through mock echoing (`MOB-TEST-04`, `GUARD-KT-01`)**: Ban shallow assertions without contract checks.
- **No real network, no `Thread.sleep`**: Fake repositories in DI; use IdlingResource or `composeTestRule.waitUntil` for async
  timing.

## References

- [Test Rules](references/implementation.md)
- [Mobile Testing Methodology](../../common/common-mobile-visual-testing/SKILL.md) — 10 mobile scope areas & C6 contract
