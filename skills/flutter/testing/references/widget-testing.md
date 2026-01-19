# Widget Testing Strategies

Widget tests verify the UI and interaction of valid widgets in a simulated environment (headless).

## Core Rules

1. **Wrapper**: Always wrap widgets in `MaterialApp`/`CupertinoApp` to provide Theme/Navigator context.
2. **Pump**:
   - `pump()`: Triggers a frame.
   - `pumpAndSettle()`: Wait for all animations to complete.
3. **Finders**: Use semantic finders (`find.text`, `find.byKey`, `find.byType`) to locate elements.

## Advanced: The Robot Pattern

For complex screens, avoid scattering `find.by...` references throughout your tests. Use a **Robot** to encapsulate UI interactions.

Reference: [Robot Pattern Implementation](./robot-pattern.md)

### Updated Example: Testing a Login Screen

````dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';
import 'test_robots/login_robot.dart'; // Import your robot

void main() {
  late MockAuthBloc mockAuthBloc;

  setUp(() {
    mockAuthBloc = MockAuthBloc();
    when(() => mockAuthBloc.state).thenReturn(AuthInitial());
  });

  Widget createWidget() {
    return MaterialApp(
      home: BlocProvider<AuthBloc>.value(
        value: mockAuthBloc,
        child: LoginScreen(),
      ),
    );
  }

  testWidgets('shows loading indicator when state is Loading', (tester) async {
    // ARRANGE
    when(() => mockAuthBloc.state).thenReturn(AuthLoading());
    final robot = LoginRobot(tester);

    // ACT
    await tester.pumpWidget(createWidget());

    // ASSERT
    robot.expectLoadingVisible();
  });

  testWidgets('triggers login event on button tap', (tester) async {
    // ARRANGE
    final robot = LoginRobot(tester);
    await tester.pumpWidget(createWidget());

    // ACT
    await robot.enterEmail('test@example.com');
    await robot.enterPassword('password123');
    await robot.tapLogin();

    // ASSERT
    verify(() => mockAuthBloc.add(LoginSubmitted(
      email: 'test@example.com',
      password: 'password123'
    ))).called(1);
  });
}

## Handling Screen Variability

One of the most common mistakes is testing only on the default 800x600 surface.

### 1. Multi-Screen Golden Tests
Use `golden_toolkit` to verify responsive layouts across multiple devices.

```dart
testGoldens('Login Screen responsive layout', (tester) async {
  final builder = DeviceBuilder()
    ..overrideDevicesForAllScenarios(devices: [
      Device.phone,
      Device.iphone11,
      Device.tabletPotrait,
      Device.tabletLandscape,
    ])
    ..addScenario(
      widget: LoginScreen(),
      name: 'Default State',
    );

  await tester.pumpDeviceBuilder(builder);
  await screenMatchesGolden(tester, 'login_screen_responsive');
});
````

### 2. Manual Screen Resizing

If not using goldens, explicitly force screen sizes to test overflows.

```dart
testWidgets('Login on small screen', (tester) async {
  // Set Surface Size to a small phone
  tester.binding.window.physicalSizeTestValue = Size(320, 480);
  tester.binding.window.devicePixelRatioTestValue = 1.0;
  addTearDown(tester.binding.window.clearPhysicalSizeTestValue);

  await tester.pumpWidget(createWidget());

  // Verify no overflow errors
  expect(tester.takeException(), isNull);
  // Using a custom finder to check if something is visible only on scroll
  await tester.scrollUntilVisible(find.text('Login'), 50);
});
```
