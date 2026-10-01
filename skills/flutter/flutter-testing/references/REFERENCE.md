# Testing Standards Reference

Practical patterns for Unit, Widget, and Golden tests.

## References

- [**Test Organization**](test-organization.md) - File naming, placement rules, test classification.
- [**Unit Testing**](unit-testing.md) - Mocking, AAA pattern, Repository testing.
- [**Widget Testing**](widget-testing.md) - TestWrapper setup, GetIt registration, common pitfalls.
- [**BLoC Testing**](bloc-testing.md) - Using `blocTest` for state transitions.
- [**Mocking Standards**](mocking_standards.md) - Shared mocks, bloc state stubbing, external service mocking.
- [**Robot Pattern**](robot-pattern.md) - UI abstraction and contract-based assertions.
- [**Integration Testing**](integration-testing.md) - Patrol, Robot Pattern enforcement, auth helpers, navigation patterns.

## **Quick Assertions**

```dart
// Expect Matchers
expect(state.isLoading, isTrue);
expect(find.text('Hello'), findsOne);
```
