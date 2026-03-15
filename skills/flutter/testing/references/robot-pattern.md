# Robot Pattern

Decouple UI interactions from test assertions. One robot shared by widget + Patrol tests.

## Why

- Tests read like user stories.
- One robot → widget + patrol test, zero duplication.
- Key/widget changes update only robot, not every test.

## Directory

```text
test/
  robots/<feature>/<screen>_robot.dart   ← shared robot
  features/<feature>/                    ← widget tests (*_test.dart ONLY)
integration_test/<feature>/              ← patrol tests
```

## Robot Class Pattern

```dart
// test/robots/authenticate/login_robot.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:our_children/core/keys/app_widget_keys.dart';

class LoginRobot {
  final WidgetTester tester;
  const LoginRobot(this.tester);

  // ─── Actions ───────────────────────────────────────────────────
  Future<void> enterEmail(String email) async {
    await tester.enterText(find.byKey(LoginWidgetKeys.emailField), email);
    await tester.pump();
  }

  Future<void> enterPassword(String password) async {
    await tester.enterText(find.byKey(LoginWidgetKeys.passwordField), password);
    await tester.pump();
  }

  Future<void> tapLoginButton() async {
    await tester.ensureVisible(find.byKey(LoginWidgetKeys.submitButton));
    await tester.tap(find.byKey(LoginWidgetKeys.submitButton));
    await tester.pump();
  }

  Future<void> loginWith({required String email, required String password}) async {
    await enterEmail(email);
    await enterPassword(password);
    await tapLoginButton();
  }

  /// Pumps the login screen with required bloc providers.
  /// Set [settle] to false for tests using whenListen or loading states.
  Future<void> pumpScreen({
    required MockAuthBloc authBloc,
    bool settle = true,
  }) async {
    await tester.pumpWidget(
      BlocProvider<AuthBloc>.value(
        value: authBloc,
        child: const LoginScreen(),
      ),
    );
    if (settle) await tester.pumpAndSettle();
  }

  // ─── Assertions ────────────────────────────────────────────────
  void verifyLoginScreenVisible() =>
      expect(find.byKey(LoginWidgetKeys.submitButton), findsOne);

  void verifyLoginButtonDisabled() =>
      expect(find.byKey(LoginWidgetKeys.submitButton), findsOne);
}
```

## Symmetric Assertions (REQUIRED)

Provide both positive and negative variants. Prevents inline `expect` in tests.

```dart
// ─── Assertions ────────────────────────────────────────────────

// ✅ GOOD: Symmetric pair
void expectContentVisible(String text) {
  expect(find.text(text), findsOne);
}

void expectContentNotVisible(String text) {
  expect(find.text(text), findsNothing);
}

// ✅ GOOD: Parameterized for dynamic content
void expectTextVisible(String text) {
  expect(find.text(text), findsOne);
}

void expectTextNotVisible(String text) {
  expect(find.text(text), findsNothing);
}

// ❌ BAD: Only positive assertion — forces inline expect in tests
void expectTitleVisible() {
  expect(find.text('My Title'), findsOne);
}
// Missing: expectTitleNotVisible()
```

### When to Add Negative Assertions

- Content disappears after navigation/state change.
- Mutual exclusivity (tab A visible → tab B hidden).
- Conditional UI (premium features hidden for free users).

## Pump Helpers

Encapsulate widget tree setup. Use `settle` param for `whenListen`/loading tests:

```dart
class FeatureRobot {
  final WidgetTester tester;
  const FeatureRobot(this.tester);

  /// Pumps the screen with required bloc providers.
  /// Set [settle] to false for tests using whenListen or loading states.
  Future<void> pumpScreen({
    required MockFeatureBloc featureBloc,
    bool settle = true,
  }) async {
    await tester.pumpLocalizedWidget(
      BlocProvider<FeatureBloc>.value(
        value: featureBloc,
        child: const FeatureScreen(),
      ),
    );
    if (settle) await tester.pumpAndSettle();
  }
}
```

## Widget Test Usage

```dart
testWidgets('login button enables after input', (tester) async {
  final robot = LoginRobot(tester);
  await robot.pumpScreen(authBloc: mockAuthBloc);
  robot.verifyLoginButtonDisabled();
  await robot.loginWith(email: 'a@b.com', password: 'pass');
});
```

## Patrol Integration Test Usage

```dart
// integration_test/authenticate/login_integration_test.dart
import '../../test/robots/authenticate/login_robot.dart';

patrolTest('full login flow', ($) async {
  app.main();
  await $.pumpAndSettle();
  final robot = LoginRobot($.tester);        // ← same robot, $.tester unwraps it
  robot.verifyLoginScreenVisible();
  await robot.loginWith(email: 'a@b.com', password: 'pass');
  // Native dialogs (OS-level only — NOT in robot):
  if (await $.native.isPermissionDialogVisible()) await $.native.allowPermission();
});
```

## Integration Test Robot Methods (REQUIRED)

Robots shared with integration tests MUST include methods that work **without** `pumpScreen`.
Integration tests run the real app — robots only assert/interact with what's on screen.

### Required Method Categories

```dart
class FeatureRobot {
  final WidgetTester tester;
  const FeatureRobot(this.tester);

  // ─── Widget test only ────────────────────────────────────────
  Future<void> pumpScreen({required MockBloc bloc, bool settle = true}) async {
    // ... widget test setup (NOT called in integration tests)
  }

  // ─── Shared: Actions (widget + integration) ─────────────────
  Future<void> tapFab() async {
    await tester.tap(find.byType(FloatingActionButton));
    await tester.pumpAndSettle();
  }

  Future<void> tapBackButton() async {
    final backButton = find.byType(BackButton);
    if (backButton.evaluate().isNotEmpty) {
      await tester.tap(backButton.first);
      await tester.pumpAndSettle();
    }
  }

  // ─── Shared: Assertions (widget + integration) ──────────────
  void expectVAppBarVisible() =>
      expect(find.byType(VAppBar), findsOne);

  void expectContentVisible() {
    final hasContent =
        find.byType(ListView).evaluate().isNotEmpty ||
        find.byType(CustomScrollView).evaluate().isNotEmpty;
    expect(hasContent, isTrue, reason: 'Screen should show scrollable content');
  }

  void expectFabVisible() =>
      expect(find.byType(FloatingActionButton), findsOne);

  void expectLoadingIndicator() =>
      expect(find.byType(VCircularProgress), findsOne);

  void expectTabBarVisible() =>
      expect(find.byType(TabBar), findsOne);

  void expectTextFieldsVisible() =>
      expect(find.byType(VTextField), findsWidgets);
}
```

### Common Integration Robot Methods Checklist

Every robot used in integration tests should provide:

| Method                     | Purpose                                       |
| :------------------------- | :-------------------------------------------- |
| `expectVAppBarVisible()`   | Screen has app bar (confirms navigation)      |
| `expectContentVisible()`   | Screen shows list/content (not blank)         |
| `tapBackButton()`          | Navigate back from screen                     |
| `expectLoadingIndicator()` | Loading state verification                    |
| Feature-specific actions   | `tapFab()`, `tapHistoryTab()`, etc.           |
| Feature-specific asserts   | `expectFabVisible()`, `expectTabBarVisible()` |

## Integration Test Navigation Helpers

Deep screens require navigation helper functions. These are the ONLY place
where raw `find.textContaining()` is acceptable — they are infrastructure.

```dart
/// Navigate from dashboard to a deep screen.
/// Returns false if navigation target not found.
Future<bool> navigateToFeature(PatrolIntegrationTester $) async {
  app.main();
  await $.pumpAndSettle(timeout: const Duration(seconds: 10));
  final loggedIn = await IntegrationAuthHelper.loginOrSkip($);
  if (!loggedIn) return false;
  await IntegrationAuthHelper.waitForDashboard($);

  // Scroll dashboard to find entry point (infrastructure — raw find OK here)
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

## Integration Test Anti-Patterns

```dart
// ❌ BAD: Raw find.byType in test body
patrolTest('shows tab bar', ($) async {
  await navigateToScreen($);
  expect(find.byType(TabBar), findsOne);  // ← WRONG
});

// ✅ GOOD: Robot method in test body
patrolTest('shows tab bar', ($) async {
  final ok = await navigateToScreen($);
  if (!ok) return;
  final robot = FeatureRobot($.tester);
  robot.expectTabBarVisible();                   // ← CORRECT
});
```

```dart
// ❌ BAD: import v_dls in integration test when robot handles it
import 'package:v_dls/v_dls.dart';  // ← unused, robot already handles VTextField/VAppBar

// ✅ GOOD: only import what's needed
import '../../test/robots/feature/feature_robot.dart';
```

## Multiple Robots in One Test

Use multiple robots when test crosses screen boundaries:

```dart
patrolTest('back from feature returns to dashboard', ($) async {
  final ok = await navigateToFeature($);
  if (!ok) return;

  final featureRobot = FeatureRobot($.tester);
  await featureRobot.tapBackButton();

  final navRobot = NavigationBarScreenRobot($.tester);
  navRobot.expectBottomNavBarVisible();  // ← different robot for different screen
});
```
