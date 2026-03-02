# Mocking Standards

Strict guidelines for mock classes. Use shared mocks for all cross-feature components — no duplication.

## Rules

### 1. No Local Mocks for Shared Components (CRITICAL)

Do NOT define `MockMyBloc`, `MockMyRepository` in individual test files. Shared components (Blocs, Repositories, Services) use shared mocks only.

### 2. Shared Mock Files

Define all mocks in `test/shared/`:

| Component Type   | Shared Mock File                          |
| :--------------- | :---------------------------------------- |
| **Blocs**        | `test/shared/mock_blocs.dart`             |
| **Data Sources** | `test/shared/mock_datasources.dart`       |
| **Repositories** | `test/shared/mock_repositories.dart`      |
| **Services**     | `test/shared/mock_services.dart`          |
| **External**     | `test/shared/mock_external_services.dart` |

### 3. Check Before Creating

Check `test/shared/` before adding a new mock. Add to the appropriate shared file if missing.

## Bloc State Stubbing (CRITICAL)

Mock blocs return `null` for `.state` by default → widget crashes. **Always** stub in `setUp`:

```dart
setUp(() {
  mockBloc = MockFeatureBloc();
  // ⚠️ CRITICAL: Without these, widget tests crash with null errors
  when(() => mockBloc.state).thenReturn(const FeatureState.initial());
  when(() => mockBloc.stream).thenAnswer((_) => Stream.empty());
});
```

### Stub All Dependent Blocs

```dart
setUp(() {
  mockAuthBloc = MockAuthBloc();
  mockSubscriptionBloc = MockSubscriptionBloc();

  when(() => mockAuthBloc.state).thenReturn(const AuthState(...));
  when(() => mockSubscriptionBloc.state).thenReturn(const SubscriptionState.initial());
});
```

### Override Per Test

```dart
testWidgets('premium user sees premium UI', (tester) async {
  // Override the default state set in setUp
  when(() => mockBloc.state).thenReturn(
    const FeatureState(isPremium: true),
  );
  // ... rest of test
});
```

## GetIt Registration

Use when widget creates bloc via `getIt<MyBloc>()` internally:

```dart
setUpAll(() async {
  await TestWrapper.init();
  // Register mock so widget's BlocProvider(create: ...) finds it
  getIt.registerFactory<AdBloc>(() => mockAdBloc);
});

tearDownAll(() {
  getIt.reset();
});
```

**Rule:** Constructor param → `BlocProvider.value`. Internal `getIt<>()` → register in GetIt.

## External Service Mocking

Create Fake implementations for non-bloc services:

```dart
// test/shared/mock_external_services.dart
class FakeImagePickerService implements ImagePickerService {
  int pickImageCallCount = 0;

  @override
  Future<String?> pickImage() async {
    pickImageCallCount++;
    return 'test.jpg';
  }
}
```

Register in `setUpAll`:

```dart
fakeImagePickerService = FakeImagePickerService();
getIt.registerLazySingleton<ImagePickerService>(() => fakeImagePickerService);
```

## Examples

### ❌ BAD: Local Mock Definition

```dart
// test/features/my_feature/my_test.dart
import 'package:bloc_test/bloc_test.dart';

class MockMyBloc extends MockBloc<MyEvent, MyState> implements MyBloc {} // <--- AVOID THIS

void main() {
  late MockMyBloc mockBloc;
  ...
}
```

### ✅ GOOD: Shared Mock Usage

**1. Define in Shared File:**

```dart
// test/shared/mock_blocs.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:my_app/features/my_feature/bloc/my_bloc.dart';

class MockMyBloc extends MockBloc<MyEvent, MyState> implements MyBloc {}
```

**2. Import in Test:**

```dart
// test/features/my_feature/my_test.dart
import '../../../../shared/mock_blocs.dart';

void main() {
  late MockMyBloc mockBloc;
  ...
}
```

## Safe Argument Matching

Prohibit `any()` / `anyNamed()` — bypass type safety, cause silent failures. Use specific values or typed matchers.

```dart
// ❌ BAD: Unsafe Matchers
when(() => repository.fetchData(any())).thenAnswer(...);
verify(() => service.logAction(any())).called(1);
verify(() => service.performTask(id: anyNamed('id'))).called(1);
```

### ✅ GOOD: Explicit Matchers

```dart
// Use specific values when possible
when(() => repository.fetchData(const MyParams(id: '123'))).thenAnswer(...);

// For named parameters, use specific values or type matchers
verify(() => service.performTask(
  id: 'task_1',
  priority: 1,
)).called(1);

// Use isA<Type>() for broad but type-safe matching
verify(() => service.performTask(
  id: isA<String>(),
  priority: isA<int>(),
)).called(1);

// Use type-specific matchers or equality
verify(() => logger.log(
  message: argThat(startsWith('Error')),
  level: LogLevel.error,
)).called(1);
```

### Flexible Verification

Use `greaterThan` when bloc events fire multiple times (e.g., rebuilds):

```dart
// ✅ Handles multiple calls from widget rebuilds
verify(
  () => mockBloc.add(const FeatureEvent.init(isPremium: false)),
).called(greaterThan(0));
```
