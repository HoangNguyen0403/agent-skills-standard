# BLoC State Management Reference

Detailed patterns for implementing BLoC/Cubit in production.

## References

- [**Full Auth BLoC (Union State)**](auth-bloc-example.md) - Best for distinct app phases.
- [**Property-Based State (Forms)**](property-based-state.md) - Best for persistent data and forms.
- [**Cubit Minimal**](cubit-minimal.md) - Simple state management without events.

## **Concurrency Transformer**

```dart
// Restartable prevents multiple simultaneous requests
on<SearchEvent>(
  _onSearch,
  transformer: restartable(),
);
```
