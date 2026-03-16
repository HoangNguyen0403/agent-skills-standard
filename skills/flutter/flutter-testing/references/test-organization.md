# Test Organization

File naming, placement, and structure rules.

## File Placement Rules

| Test Type             | Location                      | Suffix                   | Runner         | Framework                         |
| :-------------------- | :---------------------------- | :----------------------- | :------------- | :-------------------------------- |
| Unit tests            | `test/features/<feature>/`    | `_test.dart`             | `flutter test` | flutter_test, mocktail            |
| Widget tests          | `test/features/<feature>/`    | `_test.dart`             | `flutter test` | flutter_test, mocktail, bloc_test |
| **Integration tests** | `integration_test/<feature>/` | `_integration_test.dart` | `patrol test`  | patrol                            |

## 🚨 CRITICAL: File Naming & Placement

### `_integration_test.dart` belongs ONLY in `integration_test/`

The `_integration_test.dart` suffix has a **specific technical meaning**: the file uses Patrol, runs on a real device/emulator, and may interact with native OS dialogs.

**NEVER** create `_integration_test.dart` files in the `test/` directory tree.

### Classification Guide

Ask in order:

1. **Does it use `patrolTest`, `$.native.*`, or require a real device?**
   → **Integration test** → `integration_test/<feature>/<screen>_integration_test.dart`

2. **Does it render widgets with `pumpWidget` / `pumpLocalizedWidget` and assert on UI?**
   → **Widget test** → `test/features/<feature>/<screen>_test.dart`

3. **Does it test a class/function without rendering widgets?**
   → **Unit test** → `test/features/<feature>/<class>_test.dart`

### Misclassification Signs

A test is a **widget test** (NOT integration) if it:

- Uses `testWidgets(...)` instead of `patrolTest(...)`
- Imports `package:flutter_test/flutter_test.dart`
- Uses `MockBloc`, `when()`, `verify()` from mocktail
- Wraps widgets with `BlocProvider.value(value: mockBloc, ...)`
- Never touches native OS features

## Directory Structure

```text
test/
├── features/
│   ├── auth/
│   │   ├── login_screen_test.dart          ← widget tests
│   │   └── reset_password_screen_test.dart ← widget tests
│   ├── child/
│   │   └── child_profile_screen_test.dart
│   └── subscription/
│       ├── subscription_screen_test.dart
│       └── widgets/
│           └── subscription_plan_card_test.dart
├── robots/
│   ├── auth/
│   │   ├── login_robot.dart
│   │   └── reset_password_robot.dart
│   └── child/
│       └── child_profile_robot.dart
├── shared/
│   ├── mock_blocs.dart
│   ├── mock_repositories.dart
│   ├── mock_services.dart
│   └── widgets/
│       └── test_wrapper.dart
└── core/
    └── utils/
        └── input_validator_test.dart       ← unit tests

integration_test/
├── app_test.dart                           ← entry point
├── auth/
│   └── login_integration_test.dart         ← Patrol tests
└── helpers/
    └── test_helpers.dart
```

## Widget Test File Structure

Each widget test file should follow this template:

```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// Project imports
import 'package:our_children/features/.../screen.dart';
import '../../../shared/mock_blocs.dart';
import '../../../shared/widgets/test_wrapper.dart';
import '../../../robots/.../screen_robot.dart';

void main() {
  late MockFeatureBloc mockBloc;
  late ScreenRobot robot;

  setUpAll(() async => await TestWrapper.init());

  setUp(() {
    mockBloc = MockFeatureBloc();
    when(() => mockBloc.state).thenReturn(const FeatureState.initial());
    when(() => mockBloc.stream).thenAnswer((_) => Stream.empty());
  });

  // Core functionality
  group('FeatureScreen', () {
    testWidgets('should render initial state', (tester) async {
      robot = ScreenRobot(tester);
      await robot.pumpScreen(mockBloc: mockBloc);
      robot.expectScreenVisible();
    });

    // ... more core tests
  });

  // Boundary conditions, error handling, edge cases
  group('Edge cases', () {
    testWidgets('should handle empty list', (tester) async {
      when(() => mockBloc.state).thenReturn(
        const FeatureState(items: []),
      );
      robot = ScreenRobot(tester);
      await robot.pumpScreen(mockBloc: mockBloc);
      robot.expectEmptyStateVisible();
    });

    // ... more edge case tests
  });
}
```

## Audit & Migration

When misnamed/misplaced test files found:

1. **Identify**: Search for `_integration_test.dart` in `test/` directory.
2. **Classify**: Apply the classification rules above.
3. **Check for duplicates**: Compare test names with existing `_test.dart` file for the same screen.
4. **Merge unique tests**: Port any tests NOT already covered into the widget test file.
5. **Delete the misnamed file**: Remove the `_integration_test.dart` from `test/`.
6. **Verify**: Run `flutter test` on the modified widget test file.

## Related

- [Widget Testing](widget-testing.md) — TestWrapper setup, common pitfalls
- [Integration Testing](integration-testing.md) — Patrol patterns, native interactions
- [Robot Pattern](robot-pattern.md) — UI abstraction for test assertions
