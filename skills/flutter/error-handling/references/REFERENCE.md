# Error Handling Reference

Detailed patterns for functional error management in Flutter.

## References

- [**Error Mapping**](error-mapping.md) - Mapping Dio/Network exceptions to Failures.
- [**Consumption Patterns**](consumption.md) - Using `.fold()` in Clean Architecture.

## **Quick Syntax**

```dart
// Result handling in BLoC
final failureOrData = await repository.getData();
emit(failureOrData.fold(
  (failure) => State.error(failure),
  (data) => State.success(data),
));
```
