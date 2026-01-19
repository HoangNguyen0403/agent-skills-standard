# Robot Pattern (Page Object Model)

For maintainable widget and integration tests, decouple the "what" (business logic/asserts) from the "how" (finding widgets).

## Why?

- **Readability**: Tests read like user stories.
- **Reusability**: One Robot works for both **Widget Tests** and **Integration Tests** (shared API).
- **Resilience**: If a widget key changes, you update only the Robot, not 50 tests.

## Directory Structure

Place robots in `test/robots/` so they can be imported by `test/widget/` and `integration_test/` folders.

```text
test/
  robots/
    login_robot.dart
  widget/
    login_test.dart
integration_test/
  full_app_test.dart
```

## Example

### The Robot Class (`test/robots/login_robot.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class LoginRobot {
  final WidgetTester tester;

  LoginRobot(this.tester);

  // Finders (Private)
  final _emailField = find.byKey(const Key('emailKey'));
  final _passwordField = find.byKey(const Key('passwordKey'));
  final _loginButton = find.byType(ElevatedButton);

  // Actions
  Future<void> enterEmail(String email) async {
    await tester.enterText(_emailField, email);
    await tester.pump();
  }

  Future<void> enterPassword(String password) async {
    await tester.enterText(_passwordField, password);
    await tester.pump();
  }

  Future<void> tapLogin() async {
    await tester.tap(_loginButton);
    await tester.pumpAndSettle();
  }

  // Assertions
  void expectErrorShown() {
    expect(find.text('Invalid credentials'), findsOneWidget);
  }
}
```

### The Test (`test/widget/login_screen_test.dart`)

```dart
testWidgets('Login failure flow', (tester) async {
  // 1. Init
  await tester.pumpWidget(myApp());
  final robot = LoginRobot(tester);

  // 2. Interact (Readable DSL)
  await robot.enterEmail('bad@email.com');
  await robot.enterPassword('wrong');
  await robot.tapLogin();

  // 3. Verify
  robot.expectErrorShown();
});
```
