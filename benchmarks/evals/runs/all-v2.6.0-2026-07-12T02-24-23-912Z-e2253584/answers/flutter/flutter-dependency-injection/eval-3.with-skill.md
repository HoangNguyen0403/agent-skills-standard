The simplest approach is to replace the `AuthRepository` registration in `GetIt` before you pump the widget, then reset the locator after the test. That matches the skill’s test-mock swap pattern.

If production code looks like this:

```dart
abstract class IAuthRepository {
  Future<bool> isLoggedIn();
}

@LazySingleton(as: IAuthRepository)
class AuthRepository implements IAuthRepository {
  @override
  Future<bool> isLoggedIn() async => true;
}
```

Then your widget test can override it with a mock:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

class MockAuthRepository extends Mock implements IAuthRepository {}

final getIt = GetIt.instance;

void main() {
  late MockAuthRepository mockAuthRepository;

  setUp(() async {
    mockAuthRepository = MockAuthRepository();

    if (getIt.isRegistered<IAuthRepository>()) {
      getIt.unregister<IAuthRepository>();
    }

    getIt.registerLazySingleton<IAuthRepository>(
      () => mockAuthRepository,
    );
  });

  tearDown(() async {
    await getIt.reset();
  });

  testWidgets('shows signed-in state', (tester) async {
    when(() => mockAuthRepository.isLoggedIn())
        .thenAnswer((_) async => true);

    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    expect(find.text('Welcome'), findsOneWidget);
  });
}
```

The important parts are:

- override the abstract type (`IAuthRepository`), not the concrete class
- register the mock before building the widget
- clean up with `getIt.reset()` so one test does not leak into the next

This follows the skill’s preferred DI style:

- inject abstractions, not concrete implementations
- keep production registration annotation-driven
- use targeted test overrides when you need mocks

If your test needs the normal graph plus one replacement, the pattern is:

```dart
await getIt.reset();
await configureDependencies(); // or your normal setup
getIt.unregister<IAuthRepository>();
getIt.registerLazySingleton<IAuthRepository>(() => mockAuthRepository);
```

That lets the rest of the app resolve normally while `IAuthRepository` is swapped for the mock.

One last rule: avoid calling `getIt` from widget `build()` methods just to fetch dependencies on demand. Constructor injection plus provider wiring makes test overrides much easier and keeps the widget tree predictable.

