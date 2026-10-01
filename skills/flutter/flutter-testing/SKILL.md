---
name: flutter-testing
description: Write unit, widget, and integration tests with robot patterns, widget keys, and Patrol in Flutter. Use when implementing test behavior; defer CI-only configuration without test changes.
metadata:
  triggers:
    files:
    - '**/test/**.dart'
    - '**/integration_test/**.dart'
    - '**/robots/**.dart'
    - 'lib/core/keys/**.dart'
    keywords:
    - test
    - patrol
    - robot
    - WidgetKeys
    - patrolTest
    - blocTest
    - mocktail
---
# Flutter Testing Standards

## **Priority: P0 (CRITICAL)**

## The Four-Pillar Test Value Framework

The Four Pillars provide a qualitative reasoning framework to assess test value:
- **Protection against Regressions ($P$)**: Catches real defects; evaluated qualitatively or via mutation kill score. A test that passes when defects exist has zero protection.
- **Resistance to Refactoring ($R$)**: Decoupled from implementation details; zero false alarms on internal refactorings or domain additions. Tests coupled to private state or mock sequences score low on resistance.
- **Fast Feedback ($F$)**: Executes in milliseconds; rapid local TDD feedback loop.
- **Maintainability ($M$)**: Clean AAA structure, fluent test data builders when setup repetition obscures intent, high readability, zero boilerplate duplication.

Avoid calculating or inventing arbitrary numeric scores (e.g. $P \times R \times F \times M$) statically without measured mutation or runtime evidence.

## Core Rule Anchors

- **`[MOB-TEST-01]` Tripartite Naming**: Name tests `Method_Scenario_ExpectedBehavior`.
- **`[MOB-TEST-02]` BLoC State Invariant Rule**: Assert state transitions using `isA<State>().having(...)` predicates; BAN full copyWith mirrors.
- **`[MOB-TEST-03]` Entity Invariant & Serialization Rule**: Test calculations, validations, domain invariants, and non-trivial serialization/parsing or error mapping. BAN testing generated code, trivial getters/setters, `props`, or echo tests (`expect(item.discount, equals(5))`) where the test merely repeats literal assignments.
- **`[MOB-TEST-04]` Contract Testing Rule**: Repositories and data sources must be tested for contract compliance, golden JSON parsing, and error mapping. BAN 1:1 pass-through mock echoing (`when(() => dataSource.get()).thenAnswer((_) async => x); expect(await repo.get(), x)`).
- **`[MOB-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a failing test reproducing the defect before fixing it.

## Core Rules

1. **Test Pyramid**: Unit > Widget > Integration.
2. **Naming**: Follow `[MOB-TEST-01]` (`Method_Scenario_ExpectedBehavior`).
3. **AAA**: Arrange, Act, Assert in all tests.
4. **Isolated Builders**: Fluent builders when setup complexity warrants (`OrderBuilder`); avoid brittle shared global mocks.
5. **File Placement**: `_integration_test.dart` ONLY in `integration_test/`.
6. **Robot-First**: All UI assertions/interactions via **Robot pattern** (extending `BaseRobot`) — never raw `find.*`/`expect()` in test body. Use `WidgetKeys` constants from `lib/core/keys/`.
7. **Negative Assertions**: Add `expectXxxNotVisible()` in robot only when absence is part of the business contract (e.g. restricted action hidden), not blanket pairs for unrelated content.
8. **Widget Testing & Mocking**: Setup with `TestWrapper.init()` and `tester.pumpLocalizedWidget(...)`. Register mock BLoCs with `GetIt` in `setUpAll`; stub `state` and `stream` in `setUp` (use `whenListen` and `settle: false` for loading/transition states). Prohibit `any()`.
9. **Integration Testing**: Use `patrolTest` with `IntegrationAuthHelper.loginOrSkip($)` for auth flows and `native interactions` (`$.native.*`).

## Anti-Patterns & Banned Smells

- **`[MOB-TEST-01]` Vague names**: Banish non-descriptive names (`testCart`).
- **`[MOB-TEST-02]` Brittle state mirrors**: Ban 30-property `copyWith` trees in `blocTest`; use `isA<State>().having(...)`.
- **`[MOB-TEST-03]` Entity echo tests**: Ban asserting trivial field assignments or auto-generated boilerplate (`discount: 5`). Meaningful serialization/parsing error handling remains valid.
- **`[MOB-TEST-04]` Pass-through mock echoing**: Ban 1:1 repository-to-datasource pass-through mocks without contract assertions.
- **`[MOB-TEST-05]` Missing bug reproduction**: Ban bug fix PRs without reproduction tests.
- **No blanket negative assertions**: Avoid asserting absence of unrelated content.
- **No inline Key**: Use `WidgetKeys` constant. **No `any()`**: Use typed matchers.
- **No local mocks**: Use `test/shared/`. **No missing bloc stub**: Stub `state` + `stream`.
- **No test-body logic**: Move `find.*`/`expect()` to robot. No raw find in integration tests.
- **No unchecked text casing**: Verify `.toUpperCase()`, `.tr()` in source.

## Verification

- [ ] Repositories use fakes over mocks where appropriate.
- [ ] Distinct BLoC/ViewModel behaviors covered (loading, success, error) with `isA<State>().having(...)`.
- [ ] Views with distinct UI logic tested via Robot pattern at proper layer.
- [ ] Critical user flows have at least one integration test using `patrolTest`.
- [ ] `flutter test` passes.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- GetIt registration
- Register the mock with `GetIt` in `setUpAll` before building the widget under test.
- native interactions
