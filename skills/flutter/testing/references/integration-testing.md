# Advanced Integration Testing

Expert strategies for running "hard" tests (Native, Network, Time) reliably on CI.

## The Core Problem

Standard flutter `integration_test` struggles with:

1. **Native UI**: Permission dialogs, Notifications, Dark Mode toggles.
2. **WebViews**: Logging in via 3rd party identity providers.
3. **Flakiness**: `pumpAndSettle` hanging on infinite animations.

## Recommended Tool: Patrol

[Patrol](https://pub.dev/packages/patrol) extends Flutter's testing capabilities to interact with the OS.

### Why Patrol?

- **Native Interactions**: `$.native.tap()` to query OS/native views.
- **Improved Finders**: `$(#email)` instead of `find.byKey(Key('email'))`.
- **Better Waiters**: `waitUntilVisible()` handles spinners correctly (unlike `pumpAndSettle`).

### Setup

1. Add dependency: `dev_dependencies: patrol: ^3.0.0`
2. Create test file: `integration_test/app_test.dart`

```dart
import 'package:patrol/patrol.dart';

void main() {
  patrolTest(
    'Login and accept permissions',
    nativeAutomation: true, // Enable native controls
    ($) async {
      await $.pumpWidgetAndSettle(MyApp());

      // 1. Flutter Interaction (Concise Syntax)
      await $(#emailField).enterText('user@test.com');
      await $(#passwordField).enterText('password123');
      await $('Login').tap();

      // 2. Native Interaction (The Killer Feature)
      if (await $.native.isPermissionDialogVisible()) {
        await $.native.grantPermissionWhenInUse();
      }

      // 3. WebViews (if needed)
      // await $.native.tap(Selector(text: 'Accept Cookies'));
    },
  );
}
```

## Strategy 1: Real Environment (End-to-End)

Run tests against a real staging/dev backend to verify the full system. Do **not** mock the HTTP client in Integration Tests unless strictly necessary for hermeticity.

```bash
# Run with Patrol
patrol test -t integration_test/app_test.dart --dart-define=ENV=staging
```

```dart
// main.dart
void main() {
  final env = String.fromEnvironment('ENV', defaultValue: 'prod');
  runApp(MyApp(config: Config.fromEnv(env)));
}
```

## Strategy 2: Robust Waiters

Avoid `pumpAndSettle()` for any screen with a `CircularProgressIndicator` or Lottie animation, as it will timeout waiting for the "animation" to settle.

**Use Patrol's `waitUntilVisible`**:

```dart
// BAD
// await $.pumpAndSettle(); // Times out if a spinner is running

// GOOD
await $('Welcome Home').waitUntilVisible(timeout: Duration(seconds: 10));
```

**Legacy (If not using Patrol)**:
You must write a custom extension to pump frames manually.

```dart
extension PumpUntilFound on WidgetTester {
  Future<void> pumpUntilFound(Finder finder) async {
    while (!any(finder)) {
      await pump(const Duration(milliseconds: 100));
    }
  }
}
```

## Strategy 3: Handling Long Delays

For flows involving long waits (e.g., "Verification code expires in 5 minutes"), waiting real time is impractical.

**Approach**: Configure the app to use shorter durations in non-production environments.

```dart
// Code
class TimerWidget extends StatelessWidget {
  final Duration duration; // Configurable
  const TimerWidget({this.duration = const Duration(minutes: 5)});
}

// Test
await $.pumpWidget(TimerWidget(duration: Duration(seconds: 1)));
await $('Resend Code').waitUntilVisible(); // Done instantly
```

## Strategy 4: Debugging Failures

Patrol automatically handles taking screenshots on failure if configured, but you can also do it manually.

```dart
// Patrol automatically captures screenshots on failure in `patrol test` output.
// No boilerplate needed.
```

## Related Topics

[Robot Pattern](./robot-pattern.md) | [Github Actions](../../cicd/references/github-actions.md)
