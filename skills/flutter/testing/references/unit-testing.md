# Unit Testing Strategies

Unit tests verify the smallest parts of your application (functions, methods, classes) in isolation.

## Core Rules

1. **Isolation**: External dependencies (API, Database, SharedPreferences) **must** be mocked.
2. **Scope**: One test file per source file (e.g., `user_repository.dart` -> `user_repository_test.dart`).
3. **Arrange-Act-Assert (AAA)**: Follow this structure strictly.

## Advanced Techniques

### 1. Test Data Builders

Avoid hardcoding large objects in every test. Use a Builder pattern to generate valid default data with overrides.

```dart
class UserBuilder {
  String _id = '1';
  String _name = 'Default User';

  UserBuilder withId(String id) {
    _id = id;
    return this;
  }

  User build() => User(id: _id, name: _name);
}

// Usage in test
final user = UserBuilder().withId('99').build();
```

### 2. Mocking with Mocktail

We prefer `mocktail` over `mockito` for its null-safety and simplicity.

```dart
import 'package:mocktail/mocktail.dart';
import 'package:test/test.dart';

// 1. Create Mock
class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockUserRepository mockRepo;
  late GetUserProfileUseCase useCase;

  setUp(() {
    mockRepo = MockUserRepository();
    useCase = GetUserProfileUseCase(mockRepo);

    // Register fallback values if needed
    registerFallbackValue(User.empty());
  });

  // 2. Test Group
  group('GetUserProfileUseCase', () {
    test('should return User when repository succeeds', () async {
      // ARRANGE
      final user = UserBuilder().build();
      when(() => mockRepo.getUser('1')).thenAnswer((_) async => Right(user));

      // ACT
      final result = await useCase('1');

      // ASSERT
      expect(result, Right(user));
      verify(() => mockRepo.getUser('1')).called(1);
    });

    test('should return Failure when repository fails', () async {
      // ARRANGE
      when(() => mockRepo.getUser(any())).thenThrow(ServerException());

      // ACT
      final call = useCase('1');

      // ASSERT
      expect(call, throwsA(isA<ServerException>()));
    });
  });
}
```

## Best Practices & Anti-Patterns (DCM)

Avoid common testing mistakes identified by Dart Code Metrics.

### 1. Assertions are Mandatory

Never write a test that just "runs" without verifying anything.

```dart
// BAD
test('fetchUser runs', () async {
  await repo.fetchUser();
  // ❌ No assertion - test passes even if logic is broken
});

// GOOD
test('fetchUser returns data', () async {
  final result = await repo.fetchUser();
  expect(result, isNotNull); // ✅ Always verify result
});
```

### 2. Use Proper Matchers

Use specific matchers for better error messages.

```dart
// BAD
expect(list.length, 1); // Message: "Expected: <1> Actual: <0>"

// GOOD
expect(list, hasLength(1)); // Message: "Expected: list with length <1> Actual: list with length <0> [...]"
```

### 3. Async Expectations

When testing Streams or Futures validation, use `expectLater` to ensure the test waits.

```dart
// BAD
expect(stream, emits(1)); // Might finish test before stream emits

// GOOD
await expectLater(stream, emits(1));
```
