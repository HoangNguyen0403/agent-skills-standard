# Advanced Integration Testing

Expert strategies for running Patrol integration tests with Robot Pattern enforcement.

## 🚨 File Placement

Integration tests (`*_integration_test.dart`) belong **ONLY** in `integration_test/`.

- **NEVER** place `_integration_test.dart` in `test/features/`.
- Widget tests using `testWidgets`, `MockBloc`, `flutter_test` are **widget tests** — use `_test.dart`.
- Only `patrolTest`, `$.native.*`, or real device tests belong here.
- See [Test Organization](test-organization.md) for full classification.

## 🚨 Robot Pattern is MANDATORY

Integration tests MUST use robot classes for ALL assertions and interactions.

**Allowed in test body:**

- `$.native.*` — native OS interactions (never in robot)
- Navigation helper calls returning `bool`
- Robot instantiation: `final robot = FeatureRobot($.tester)`
- Robot method calls: `robot.expectXxxVisible()`, `await robot.tapXxx()`

**NOT allowed in test body:**

**NOT allowed in test body:**

- `find.byType(...)` — move to robot method
- `expect(find.*, ...)` — move to robot method
- `$.tester.tap(find.*)` — move to robot method
- Direct `v_dls` widget references — robot handles DLS awareness

## Integration Test File Structure

```dart
import 'package:flutter/material.dart';         // Only if BackButton/Icons needed
import 'package:flutter_test/flutter_test.dart'; // Only if test body uses find/Finder
import 'package:our_children/main.dart' as app;
import 'package:patrol/patrol.dart';

import '../../test/robots/<feature>/<robot>.dart';
import '../helpers/auth_helper.dart';

void main() {
  // ── Navigation Helper (infrastructure — raw find OK) ──────────
  Future<bool> navigateToFeature(PatrolIntegrationTester $) async {
    app.main();
    await $.pumpAndSettle(timeout: const Duration(seconds: 10));
    final loggedIn = await IntegrationAuthHelper.loginOrSkip($);
    if (!loggedIn) return false;
    await IntegrationAuthHelper.waitForDashboard($);
    // ... scroll + find entry point ...
    return true;
  }

  // ── Tests (robot-only assertions) ─────────────────────────────
  patrolTest('screen renders with app bar', ($) async {
    final ok = await navigateToFeature($);
    if (!ok) return;
    final robot = FeatureRobot($.tester);
    robot.expectVAppBarVisible();
    robot.expectContentVisible();
  });

  patrolTest('back returns to previous screen', ($) async {
    final ok = await navigateToFeature($);
    if (!ok) return;
    final robot = FeatureRobot($.tester);
    await robot.tapBackButton();
    final navRobot = NavigationBarScreenRobot($.tester);
    navRobot.expectBottomNavBarVisible();
  });
}
```

## Auth Helper Pattern (REQUIRED)

Shared `IntegrationAuthHelper` in `integration_test/helpers/auth_helper.dart`:

```dart
class IntegrationAuthHelper {
  IntegrationAuthHelper._();
  static const _testEmail = String.fromEnvironment('TEST_EMAIL', defaultValue: '');
  static const _testPassword = String.fromEnvironment('TEST_PASSWORD', defaultValue: '');
  static bool get hasCredentials => _testEmail.isNotEmpty && _testPassword.isNotEmpty;

  /// Returns true on success, false if no credentials.
  static Future<bool> loginOrSkip(PatrolIntegrationTester $) async {
    if (!hasCredentials) return false;
    final robot = LoginRobot($.tester);  // ← Uses robot, not raw find
    try { robot.verifyLoginScreenVisible(); } catch (_) { return true; }
    await robot.loginWith(email: _testEmail, password: _testPassword);
    return true;
  }

  static Future<void> waitForDashboard(PatrolIntegrationTester $) async {
    await $.pumpAndSettle(timeout: const Duration(seconds: 15));
  }
}
```

### Credential Passing

```bash
patrol test \
  --target integration_test/app_test.dart \
  --dart-define=TEST_EMAIL=user@staging.com \
  --dart-define=TEST_PASSWORD=StrongPass1!
```

## Navigation Helper Patterns

### Tab Navigation (Bottom Nav)

```dart
Future<bool> navigateToTab(PatrolIntegrationTester $, int tabIndex) async {
  app.main();
  await $.pumpAndSettle(timeout: const Duration(seconds: 10));
  final loggedIn = await IntegrationAuthHelper.loginOrSkip($);
  if (!loggedIn) return false;
  await IntegrationAuthHelper.waitForDashboard($);
  final navBar = find.byType(VBottomNavBar);
  if (navBar.evaluate().isEmpty) return false;
  await $.tester.tap(find.byIcon(tabIcons[tabIndex]));
  await $.pumpAndSettle();
  return true;
}
```

### Deep Screen (via dashboard scroll)

```dart
Future<bool> navigateToDeepScreen(PatrolIntegrationTester $) async {
  // ... login + wait for dashboard ...
  final refreshIndicator = find.byType(RefreshIndicator);
  if (refreshIndicator.evaluate().isNotEmpty) {
    await $.tester.drag(refreshIndicator, const Offset(0, -300));
    await $.pumpAndSettle();
  }
  final target = find.textContaining('Feature');
  if (target.evaluate().isEmpty) return false;
  await $.tester.ensureVisible(target.first);
  await $.tester.tap(target.first);
  await $.pumpAndSettle();
  return true;
}
```

### Navigation Helper Rules

- Return `bool` — `false` means skip test gracefully.
- Place at top of test file, NOT inside `patrolTest`.
- Navigation infrastructure may use raw `find.*` — test body must NOT.
- One helper per deep screen; reuse across all tests in the file.

## Patrol Tips

- `$.native.tap()` for OS-level dialogs — never in robot class.
- `waitUntilVisible()` instead of `pumpAndSettle()` for screens with spinners.
- `nativeAutomation: true` to enable native interactions (permissions, notifications).
- Run: `patrol test -t integration_test/app_test.dart --dart-define=ENV=staging`

## Import Hygiene

```dart
// ✅ Minimal — robot handles DLS widget references
import 'package:patrol/patrol.dart';
import '../../test/robots/feature/feature_robot.dart';
import '../helpers/auth_helper.dart';

// ❌ Avoid — robot handles VTextField/VAppBar assertions
import 'package:v_dls/v_dls.dart';

// Only import material.dart when test body uses BackButton/Icons
// Only import flutter_test when test body uses find/Finder/expect
```

## Integration Test Coverage Checklist

Each feature integration test should cover:

- [ ] Screen renders (app bar, content, or empty state)
- [ ] Primary action works (FAB, submit button, etc.)
- [ ] Secondary navigation (tabs, history, filters)
- [ ] Back navigation returns to previous screen
- [ ] Auth-protected: uses `IntegrationAuthHelper.loginOrSkip($)`
- [ ] All assertions via robot — zero raw `find.*` in test body

## Related Topics

[Robot Pattern](./robot-pattern.md) | [Widget Testing](./widget-testing.md) | [Test Organization](./test-organization.md)
