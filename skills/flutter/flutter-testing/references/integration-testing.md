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

## Native Platform Interactions & Lifecycle (Patrol)

### Permission Handling (Dual-Path)

Two tests, one per path, each from a declared permission state. The dialog is asserted before it is answered; the granted/denied outcome comes from the approved requirement.

```dart
patrolTest('camera permission - allowed path shows approved enabled outcome', ($) async {
  // Precondition: camera permission NOT yet granted (fresh install / OS permission reset).
  final robot = ScannerRobot($.tester);
  await robot.tapScanButton();

  // Assert the OS prompt exists before answering it.
  expect(
    await $.native.isPermissionDialogVisible(timeout: const Duration(seconds: 10)),
    isTrue,
    reason: 'OS permission prompt did not appear',
  );
  await $.native.grantPermissionWhenInUse();

  robot.expectCameraPreviewVisible(); // substitute the requirement's own granted outcome
});

patrolTest('camera permission - denied path shows approved denied outcome', ($) async {
  // Precondition: OS permission reset to "not determined" before this run (see the
  // reset mechanisms below). Denying is only possible while the dialog is showing,
  // and a grant from the allowed test must not leak into this test.
  final robot = ScannerRobot($.tester);
  await robot.tapScanButton();

  expect(
    await $.native.isPermissionDialogVisible(timeout: const Duration(seconds: 10)),
    isTrue,
    reason: 'OS permission prompt did not appear',
  );
  await $.native.denyPermission();

  robot.expectPermissionDeniedBannerVisible(); // substitute the requirement's own denied outcome
});
```

- Each test needs the **OS** permission returned to "not determined" first. Ordering the tests is not a reset: on iOS a denial persists, so a later allowed test still gets no prompt.
  - Simulator: `xcrun simctl privacy <device> reset all <bundleId>` before each test (or `reset location`/`reset camera` for one resource).
  - Emulator/device: revoke via system settings or `adb shell pm revoke <pkg> <permission>` / `pm reset-permissions`, then verify the state before launching.
  - Fresh install with `fullReset` also yields "not determined" on Android; on iOS Keychain/preference state may survive, so verify rather than assume.
  - If none of these controls is available in the environment, the cell is `BLOCKED (device: permission control)` — never fall back to ordering.
- If `nativeAutomation` is unavailable in the runner, record the case as `partial`/`BLOCKED` rather than claiming permission coverage.
- Cleanup: restore the original grant state for the app under test after the run.

### App Lifecycle & State Restoration

Assert the **approved** restoration outcome; retained drafts are a product decision.

```dart
patrolTest('background and foreground meet the approved state outcome', ($) async {
  final robot = CheckoutRobot($.tester);
  await robot.enterDeliveryNotes('Ring doorbell twice');

  // Warm background (no process kill), then foreground
  await $.native.pressHome();
  await Future.delayed(const Duration(seconds: 3));
  await $.native.openApp();

  // Replace with the approved expectation (draft retained, or intentional reset).
  robot.expectDeliveryNotesEqual('Ring doorbell twice');
});
```

`openApp()` returns the app to the foreground; it does not prove process replacement. Termination/restoration semantics need an explicit terminate step plus evidence that a new process started (see the mobile matrix §3), otherwise the case is `BLOCKED`.

## Patrol Tips

- `$.native.tap()` for OS-level dialogs — never in robot class.
- `waitUntilVisible()` instead of `pumpAndSettle()` for screens with spinners.
- `nativeAutomation: true` in `patrolTest` config to enable native OS interactions (permissions, notifications).
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
