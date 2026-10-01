# Unit Testing Strategies

Unit tests verify the smallest parts of your application (functions, methods, classes) in isolation.

## Core Rules

1. **Isolation**: Use focused fakes or mocks only when isolation from external boundaries (network, databases, platform channels) is necessary; prefer pure domain logic and simple fakes over heavy mocks.
2. **Scope**: Select tests based on risk and observable behavior rather than mandating a 1:1 test file per source file; group related behaviors by business contract.
3. **Arrange-Act-Assert (AAA)**: Follow this structure strictly.
4. **Explicit Matching**: **FORBIDDEN**: `any()` and `registerFallbackValue()`. Always use explicit values or specific instances in `when` and `verify` calls.

## Advanced Techniques

### 1. Test Data Builders

Avoid hardcoding large objects in every test. Use a Builder pattern to generate valid default data with overrides.
```dart
class OrderBuilder {
  double _unitPrice = 100.0;
  int _quantity = 1;
  double _discount = 0.0;
  bool _isPriority = false;

  OrderBuilder withUnitPrice(double price) { _unitPrice = price; return this; }
  OrderBuilder withQuantity(int qty) { _quantity = qty; return this; }
  OrderBuilder withDiscount(double discount) { _discount = discount; return this; }
  OrderBuilder asPriority() { _isPriority = true; return this; }

  Order build() => Order.empty().copyWith(
    unitPrice: _unitPrice,
    qty: _quantity,
    discount: _discount,
    isPriority: _isPriority,
  );
}
```


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
final order = OrderBuilder().withQuantity(3).build();
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
  });

  // 2. Test Group
  group('GetUserProfileUseCase', () {

    test('GetUser_WhenRepositoryFails_ThrowsServerException', () async {
      // ARRANGE
      when(() => mockRepo.getUser('1')).thenThrow(ServerException());

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

// GOOD: Contract-specific assertion verifying business attributes
test('FetchUser_WhenUserExists_ReturnsUserWithMatchingId', () async {
  final result = await repo.fetchUser('123');
  expect(result, isA<User>().having((u) => u.id, 'id', equals('123')));
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

### 4. Forbid `any()` and `registerFallbackValue()`

Using `any()` often leads to brittle tests and requires `registerFallbackValue()` for non-primitive types. Be explicit.

```dart
// ❌ BAD
registerFallbackValue(User.empty());
when(() => mockRepo.updateUser(any())).thenAnswer((_) async => Right(user));

// ✅ GOOD (Use exact instance or managed test data)
final userToUpdate = UserBuilder().withId('123').build();
when(() => mockRepo.updateUser(userToUpdate)).thenAnswer((_) async => Right(userToUpdate));
```
