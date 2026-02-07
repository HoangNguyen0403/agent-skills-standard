# Mocking Standards

## Overview

To maintain a clean and maintainable test suite, we follow strict guidelines for defining and using mock classes. This skill enforces the use of shared mocks for common components to avoid duplication and inconsistencies.

## Rules

### 1. No Local Mocks for Shared Components (CRITICAL)

Do NOT define mock classes (e.g., `MockMyBloc`, `MockMyRepository`) inside individual test files if the component is used across multiple features or is a core architectural component (like Blocs, Repositories, Services).

### 2. Use Shared Mock Files

All mocks for shared components must be defined in the `test/shared/` directory.

| Component Type   | Shared Mock File                     |
| :--------------- | :----------------------------------- |
| **Blocs**        | `test/shared/mock_blocs.dart`        |
| **Data Sources** | `test/shared/mock_datasources.dart`  |
| **Repositories** | `test/shared/mock_repositories.dart` |
| **Services**     | `test/shared/mock_services.dart`     |

### 3. Check Before Creating

Before creating a new mock, check the `test/shared/` directory to see if it already exists.

### 4. Add to Shared

If a mock is needed and doesn't exist, add it to the appropriate shared file in `test/shared/` and then import it in your test file.

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

Avoid using `any()` and `registerFallbackValue` as they bypass type safety and can lead to silent failures or brittle tests.

### ❌ BAD: Unsafe Matchers

```dart
// Requires registerFallbackValue(MyParams()) if MyParams is a custom class
when(() => repository.fetchData(any())).thenAnswer(...);

// Unsafe: bypasses parameter verification
verify(() => service.logAction(any())).called(1);
```

### ✅ GOOD: Explicit Matchers

```dart
// Use specific values when possible
when(() => repository.fetchData(const MyParams(id: '123'))).thenAnswer(...);

// Use anyNamed() for named parameters
verify(() => service.performTask(
  id: anyNamed('id'),
  priority: 1,
)).called(1);

// Use type-specific matchers or equality
verify(() => logger.log(
  message: argThat(startsWith('Error')),
  level: LogLevel.error,
)).called(1);
```

### Why avoid `registerFallbackValue`?

It often indicates that the test is not being specific enough about the data it expects. Relying on global fallback values makes tests harder to follow and can hide bugs where the wrong type of object is being passed to a mock.
