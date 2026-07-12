In widget tests, the cleanest approach is to override the `GetIt` registration before building the widget, then reset it after the test so the mock replaces the real implementation only inside that test.

Example:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

final getIt = GetIt.instance;

abstract class AuthRepository {
  Future<bool> isLoggedIn();
}

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late MockAuthRepository mockAuthRepository;

  setUp(() async {
    await getIt.reset();

    mockAuthRepository = MockAuthRepository();

    getIt.registerSingleton<AuthRepository>(mockAuthRepository);
  });

  tearDown(() async {
    await getIt.reset();
  });

  testWidgets('uses mocked auth repository', (tester) async {
    when(() => mockAuthRepository.isLoggedIn())
        .thenAnswer((_) async => true);

    await tester.pumpWidget(
      MyApp(),
    );

    await tester.pumpAndSettle();

    expect(find.text('Welcome'), findsOneWidget);
  });
}
```

If your app has a normal `configureDependencies()` call for production, do not blindly call that inside the test and then try to replace a singleton afterward unless you know the type has not already been resolved. Safer patterns are:

1. Reset `GetIt`
2. Register only the dependencies needed by the test, with mocks where appropriate
3. Build the widget

If you do need the full graph, you can still override explicitly:

```dart
await getIt.reset();
configureDependenciesForTest(); // or production-like setup
getIt.unregister<AuthRepository>();
getIt.registerSingleton<AuthRepository>(mockAuthRepository);
```

With `injectable`, many teams create a dedicated test environment so the generated registrations can swap implementations automatically. Conceptually:

- annotate test-only bindings for a `test` environment
- initialize `GetIt` with that environment in tests
- use mock or fake implementations there

That is helpful for larger apps, but for straightforward widget tests, direct `GetIt` override is often enough.

Important test hygiene:

- Always call `getIt.reset()` between tests to avoid leaked registrations
- Register the mock before pumping the widget
- Stub every method the widget will call
- Prefer mocks/fakes for repositories, while keeping the widget tree as real as possible

So the short answer is: reset the service locator, register `MockAuthRepository` as `AuthRepository`, pump the widget, and clean up afterward.

