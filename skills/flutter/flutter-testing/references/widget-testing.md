# Widget Testing

Verify UI and interactions in a headless simulated environment.

## Core Rules

1. **Wrapper**: Always use `TestWrapper.init()` + `tester.pumpLocalizedWidget(...)` for proper Theme/Navigator/Localization context.
2. **Pump**:
   - `pump()`: Triggers a frame.
   - `pumpAndSettle()`: Wait for all animations to complete.
   - `settle: false` + manual `pump()`: Use when testing state transitions (`whenListen`) or loading states with infinite animations.
3. **Finders**: Use semantic finders (`find.text`, `find.byKey`, `find.byType`) to locate elements.
4. **Imports**: Always import `package:flutter/material.dart` when tests reference Material widgets (`Scaffold`, `Switch`, `Icon`, `Icons`).

## TestWrapper Setup Pattern

Every widget test file must follow this setup:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';

import '../../shared/mock_blocs.dart';
import '../../shared/widgets/test_wrapper.dart';
import '../../robots/<feature>/<screen>_robot.dart';

void main() {
  late MockFeatureBloc mockBloc;

  setUpAll(() async {
    await TestWrapper.init();
  });

  setUp(() {
    mockBloc = MockFeatureBloc();
    // ⚠️ ALWAYS stub initial state — prevents null errors
    when(() => mockBloc.state).thenReturn(const FeatureState.initial());
    when(() => mockBloc.stream).thenAnswer((_) => Stream.empty());
  });

  group('FeatureScreen', () {
    testWidgets('renders initial state', (tester) async {
      final robot = FeatureRobot(tester);
      await robot.pumpScreen(featureBloc: mockBloc);
      robot.expectScreenVisible();
    });
  });

  group('Edge cases', () {
    testWidgets('handles error state', (tester) async {
      when(() => mockBloc.state).thenReturn(
        const FeatureState(status: AppStatus.error, error: 'Network error'),
      );
      final robot = FeatureRobot(tester);
      await robot.pumpScreen(featureBloc: mockBloc);
      robot.expectTextVisible('Network error');
    });
  });
}
```

## GetIt Registration

Use when widget creates blocs via `getIt<MyBloc>()` internally:

```dart
setUpAll(() async {
  await TestWrapper.init();
  // Register mock in GetIt so widget's BlocProvider(create: ...) finds it
  getIt.registerFactory<AdBloc>(() => mockAdBloc);
});

tearDownAll(() {
  getIt.reset();
});
```

**Rule:** Constructor param → `pumpScreen(bloc: mockBloc)`. Internal `getIt<>()` → register in GetIt.

## State Transitions with whenListen

Test reactions to state changes (snackbars, navigation, loading):

```dart
testWidgets('shows snackbar on error', (tester) async {
  whenListen(
    mockBloc,
    Stream.fromIterable([
      const FeatureState(status: AppStatus.loading),
      const FeatureState(status: AppStatus.error, error: 'Failed'),
    ]),
    initialState: const FeatureState(),
  );

  final robot = FeatureRobot(tester);
  await robot.pumpScreen(featureBloc: mockBloc, settle: false);
  robot.expectSnackbarVisible();
});
```

## Common Pitfalls

### 1. Text Casing Mismatch

Widgets transform text (`.toUpperCase()`, `.tr()`, `.capitalize()`). Check widget source:

```dart
// Widget code: Text(status.name.toUpperCase())
// ❌ Wrong assertion
robot.expectTextVisible('Active');
// ✅ Correct assertion
robot.expectTextVisible('ACTIVE');
```

### 2. Missing Material Import

Required when tests reference `Scaffold`, `Switch`, `Icon`, `Icons`:

```dart
// ❌ Missing import causes "undefined" errors
import 'package:flutter_test/flutter_test.dart';

// ✅ Add flutter/material.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
```

### 3. Overflow in Tests

Default test surface: 800×600. Long text or complex layouts overflow:

```dart
// ❌ This will cause RenderFlex overflow in test
await robot.pumpDialog(message: 'A' * 500);

// ✅ Use realistic text lengths or resize surface
tester.view.physicalSize = const Size(1080, 1920);
tester.view.devicePixelRatio = 1.0;
addTearDown(() => tester.view.resetPhysicalSize());
```

### 4. Null State Errors

Mock blocs return null for `.state` by default. Always stub in `setUp`:

```dart
setUp(() {
  mockBloc = MockFeatureBloc();
  // ⚠️ Without this, widget tests crash with null errors
  when(() => mockBloc.state).thenReturn(const FeatureState.initial());
});
```

### 5. Loading State Timeout

`pumpAndSettle()` hangs on infinite animations (spinners, shimmer):

```dart
// ❌ Hangs forever on CircularProgressIndicator
await tester.pumpAndSettle();

// ✅ Use settle: false + manual pump
await robot.pumpScreen(bloc: mockBloc, settle: false);
await tester.pump();
await tester.pump();
expect(find.byType(Scaffold), findsWidgets);
```
