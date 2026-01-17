# Testing Standards Reference

Practical patterns for Unit, Widget, and Golden tests.

## References

- [**BLoC Testing**](bloc-testing.md) - Using `blocTest` for state transitions.
- [**Robot Pattern (Unit/Widget)**](robot-pattern.md) - Decoupling test logic from UI code.
- [**Mocking with Mocktail**](mocking.md) - Stubbing and Verifying service calls.

## **Quick Assertions**

```dart
// Mocktail Stub
when(() => repository.fetchData()).thenAnswer((_) async => right(data));

// Expect Matchers
expect(state.isLoading, isTrue);
verify(() => repository.fetchData()).called(1);
```
