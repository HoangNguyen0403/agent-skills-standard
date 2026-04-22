---
name: flutter-testing
description: Write unit, widget, and integration tests with robot patterns, widget keys, and Patrol in Flutter. Use when writing tests or implementing test automation.
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

## Core Rules

1. **Test Pyramid**: Unit > Widget > Integration.
2. **Naming**: `should <behavior> when <condition>`.
3. **AAA**: Arrange, Act, Assert in all tests.
4. **Shared Mocks**: `test/shared/` only — no local mocks.
5. **File Placement**: `_integration_test.dart` ONLY in `integration_test/`.
6. **Robot-First**: ALL UI assertions/interactions via **Robot pattern** (e.g., `CheckoutRobot`) — never raw `find.*`/`expect()` in test body.

## Widget Testing & Mocking

- **Setup**: Use `TestWrapper.init()` in `setUpAll` and `tester.pumpLocalizedWidget(...)`.
- **Mocking**: Use **GetIt registration** of Mock BLoCs in `setUpAll` if created internally. Use **blocTest** for BLoC logic and **whenListen** for state transitions.
- **Stubbing**: Always stub **bloc.state** and **bloc.stream** in `setUp`. Prohibit `any()` / `anyNamed()`.
- **Async**: Use **settle: false** for loading or stream states to verify mid-process transitions.

## Robot Pattern

- All interactions and assertions belong in `*Robot` (e.g., `expectFirstOrderVisible()`).
- Symmetric: every `expectXxxVisible()` needs **expectXxxNotVisible()** pairs.
- **BaseRobot Centralization**: Extract standard scrolling (`scrollDown`, `scrollToEnd`) and screen visibility assertions (`expectScreenVisible`, `expectScreenNotVisible`) into common `BaseRobot` or parent class to avoid duplication.
- Widget tests: include `pumpScreen(bloc:, settle:)` helper.
- **Widget Keys**: Use **WidgetKeys** constants from `lib/core/keys/` — never inline `Key('string')`.

## Integration Testing

- Use **patrolTest** with **IntegrationAuthHelper.loginOrSkip($)** for authenticated flows.
- Use **$.native.tap()** or `$.native.*` for native interactions (e.g., system dialogs).
- Create robot: `final robot = OrdersRobot($.tester)` — share same class as widget tests.
- Only `$.native.*` and navigation helpers may remain inline in test body.

## Anti-Patterns

- **No inline Key**: Use `WidgetKeys` constant. **No `any()`**: Use typed matchers.
- **No local mocks**: Use `test/shared/`. **No missing bloc stub**: Stub `state` + `stream`.
- **No test-body logic**: Move `find.*`/`expect()` to robot. **No raw find in integration tests**.
- **No `_integration_test.dart` in `test/`**: Rename or merge.
- **No unused imports**: Remove `v_dls` when robots handle assertions. Check Material import needs.
- **No happy-path-only**: Add `Edge cases` group. **No one-sided assertions**: Add `expectNotVisible` pairs.
- **No unchecked text casing**: Verify `.toUpperCase()`, `.tr()` in source.

## Verification

- [ ] Fakes used over Mocks for Repositories (well-defined inputs/outputs).
- [ ] Every ViewModel has unit tests covering loading, success, and error states.
- [ ] Every View has widget tests with faked ViewModel.
- [ ] Critical user flows have at least one integration test.
- [ ] `flutter test` passes.