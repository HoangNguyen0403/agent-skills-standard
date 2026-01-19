# Testing Standards Reference

Practical patterns for Unit, Widget, and Golden tests.

## References

- [**Unit Testing**](unit-testing.md) - Mocking, AAA pattern, Repository testing.
- [**Widget Testing**](widget-testing.md) - UI interactions, Finders, Pumping frames.
- [**BLoC Testing**](bloc-testing.md) - Using `blocTest` for state transitions.

## **Quick Assertions**

```dart
// Mocktail Stub
when(() => repository.fetchData()).thenAnswer((_) async => right(data));

// Expect Matchers
expect(state.isLoading, isTrue);
expect(find.text('Hello'), findsOneWidget);
verify(() => repository.fetchData()).called(1);
```
