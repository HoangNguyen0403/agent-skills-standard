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
    - flutter integration test
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

Universal anti-slop rules (naming, identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps,
shallow assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Flutter
deltas follow.

## Core Rule Anchors

- **`[MOB-TEST-02]` BLoC State Invariant**: Assert transitions with `isA<State>().having(...)`; never mirror full `copyWith`
  trees. Ban vacuous `expect: () => [isA<BaseState>()]` without `.having(...)` or `verify` (`GUARD-DART-VACUOUS-STATE`),
  seed echoes (`GUARD-DART-SEED-ECHO`), duplicate `build/seed/act/expect` scenarios (`GUARD-DART-BLOC-DUPLICATE`), and
  collaborator mock echoes (`GUARD-DART-MOCK-ECHO`).
- **`[MOB-TEST-03]` Entity Invariant & Serialization**: Test calculations, validations, domain invariants, and non-trivial
  `fromJson`/`toJson` or error mapping. Ban tests of generated code and trivial getters/`props`.
- **`[MOB-TEST-04]` Contract Testing**: Repositories and data sources prove contract compliance, golden JSON parsing, and error
  mapping; ban 1:1 pass-through echoing (`when(() => dataSource.get()).thenAnswer((_) async => x); expect(await repo.get(), x)`).
- **`[MOB-TEST-06]` Layer & Device Fidelity**: Unit > Widget > Patrol integration (`patrolTest`). Default 800×600 widget tests
  never prove device layout, native permissions, or deep links; desktop emulation never substitutes native E2E.

## Conventions

1. **Test Pyramid**: Unit > Widget > Integration; `_integration_test.dart` only in `integration_test/`.
2. **AAA**: Arrange, Act, Assert in every test.
3. **Builders**: Fluent builders when setup repetition obscures intent (`OrderBuilder`); avoid shared global mocks.
4. **Robot-First**: Route all UI interactions and assertions through the Robot pattern (extending `BaseRobot`), never raw
   `find.*`/`expect()` in a test body. Use `WidgetKeys` constants from `lib/core/keys/`; no inline `Key`.
5. **Negative Assertions**: Add `expectXxxNotVisible()` in the robot only when absence is part of the business contract.
6. **Widget Testing & Mocking**: `TestWrapper.init()` + `tester.pumpLocalizedWidget(...)`. Register mock BLoCs with `GetIt` in
   `setUpAll`; stub `state` and `stream` in `setUp` (use `whenListen`, `settle: false` for loading states). Prohibit `any()`.
7. **Integration Testing**: Use `patrolTest` with `IntegrationAuthHelper.loginOrSkip($)` for auth and `native interactions`
   (`$.native.*`) for permissions, alerts, and lifecycle. For permission flows, assert the dialog
   (`isPermissionDialogVisible`) before granting or denying, and assert granted and denied outcomes as separate tests.

## Anti-Patterns

- **BLoC slop (`GUARD-DART-*`)**: Ban vacuous `isA<State>()`, seed echoes, duplicate scenarios, and 30-property `copyWith` trees.
- **Test-body logic**: No `find.*`/`expect()` in the test body or in integration tests without a robot.
- **Fixed sleeps (`GUARD-E2E-01`)**: Ban `Future.delayed(...)`; use `pumpAndSettle()` or a condition matcher.
- **No local mocks**: Use `test/shared/`. **No missing bloc stub**: stub `state` + `stream`.
- **No unchecked text casing**: Verify `.toUpperCase()` / `.tr()` against source.

## Verification

- [ ] Repositories use fakes over mocks where appropriate.
- [ ] Distinct BLoC behaviors (loading, success, error) asserted with `isA<State>().having(...)`.
- [ ] Views with distinct UI logic covered via the robot at the proper layer.
- [ ] Critical user flows have at least one `patrolTest` integration test.
- [ ] `flutter test` passes.
- [ ] Mobile scenarios follow [Mobile Testing Methodology](../../common/common-mobile-visual-testing/SKILL.md).
