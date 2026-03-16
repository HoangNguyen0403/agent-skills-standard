---
name: flutter-testing
description: "Unit, widget, and integration testing with robots, widget keys, and Patrol. Use when writing Flutter unit tests, widget tests, or integration tests with Patrol. (triggers: **/test/**.dart, **/integration_test/**.dart, **/robots/**.dart, lib/core/keys/**.dart, test, patrol, robot, WidgetKeys, patrolTest, blocTest, mocktail)"
---

# Flutter Testing Standards

## **Priority: P0 (CRITICAL)**

## Core Rules

1. **Test Pyramid**: Unit > Widget > Integration.
2. **Naming**: `should <behavior> when <condition>`.
3. **AAA**: Arrange, Act, Assert in all tests.
4. **Shared Mocks**: `test/shared/` only — no local mocks.
5. **File Placement**: `_integration_test.dart` ONLY in `integration_test/`.
6. **Robot-First**: ALL UI assertions/interactions via `*Robot` — never raw `find.*`/`expect()` in test body.

## Test Organization ([ref](references/test-organization.md))

- Widget tests → `test/features/<feature>/*_test.dart`.
- Integration → `integration_test/<feature>/*_integration_test.dart`.
- Patrol: share robots via import; native `$.native.*` in test file, not robot.
- Group: core tests + `Edge cases` group per file.
- Cover: empty/null, errors, loading, boundary values, role variants.

## Widget Keys ([ref](references/widget-keys.md))

- `abstract final class` in `lib/core/keys/<feature>/`. Import barrel only.
- Format: `<feature>.<screen>.<element>`. Never inline `Key('string')`.

## Robot Pattern ([ref](references/robot-pattern.md))

- All interactions/assertions in `*Robot` — never inline in tests.
- Accept `WidgetTester`; shared by widget + Patrol integration tests.
- Symmetric: every `expectXxxVisible()` needs `expectXxxNotVisible()`.
- Widget tests: include `pumpScreen(bloc:, settle:)` helper.
- Integration tests: methods work without `pumpScreen` (real app running).
- Integration robots: provide `expectVAppBarVisible()`, `tapBackButton()`, `expectContentVisible()`.

## Integration Testing ([ref](references/integration-testing.md))

- Use `IntegrationAuthHelper.loginOrSkip($)` for authenticated flows.
- Extract navigation-to-deep-screen into helper functions returning `bool`.
- Create robot: `final robot = FeatureRobot($.tester)` — same class as widget tests.
- Only `$.native.*` and navigation helpers may remain inline in test body.
- No `v_dls` imports in tests when robots handle all assertions.

## Widget Testing & Mocking ([ref](references/widget-testing.md)) ([mocking](references/mocking_standards.md))

- `TestWrapper.init()` in `setUpAll` + `tester.pumpLocalizedWidget(...)`.
- Stub `bloc.state` + `bloc.stream` in `setUp`. GetIt when bloc created internally.
- `whenListen` for transitions; `settle: false` for loading/stream states.
- Shared mocks in `test/shared/`. Prohibit `any()` / `anyNamed()`.
- Stub ALL dependent blocs. Fake classes for external services.

## Anti-Patterns

- **No inline Key**: Use `WidgetKeys` constant. **No `any()`**: Use typed matchers.
- **No local mocks**: Use `test/shared/`. **No missing bloc stub**: Stub `state` + `stream`.
- **No test-body logic**: Move `find.*`/`expect()` to robot. **No raw find in integration tests**.
- **No `_integration_test.dart` in `test/`**: Rename or merge.
- **No unused imports**: Remove `v_dls` when robots handle assertions. Check Material import needs.
- **No happy-path-only**: Add `Edge cases` group. **No one-sided assertions**: Add `expectNotVisible` pairs.
- **No unchecked text casing**: Verify `.toUpperCase()`, `.tr()` in source.
