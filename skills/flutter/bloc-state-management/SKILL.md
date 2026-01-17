---
name: Flutter BLoC State Management
description: Standards for predictable state management using flutter_bloc and freezed.
metadata:
  labels: [state-management, bloc, cubit, freezed]
  triggers:
    files: ['**_bloc.dart', '**_cubit.dart', '**_state.dart', '**_event.dart']
    keywords: [BlocProvider, BlocBuilder, BlocListener, Cubit, Emitter, transformer]
---

# BLoC State Management

## **Priority: P0 (CRITICAL)**

Predictable state management separating business logic from UI using `bloc` and `freezed`.

## Structure

```text
presentation/blocs/
├── auth/
│   ├── auth_bloc.dart
│   ├── auth_event.dart # (@freezed)
│   └── auth_state.dart # (@freezed)
```

## Implementation Guidelines

- **States & Events**: Use `@freezed`. Choose strategy:
  - **Union State**: (initial, loading, success) for exclusive UI phases.
  - **Property-based State**: (Option<$Either>, bool isSubmitting) for Forms and complex data.
- **State Properties**: Use `Status` enums or sealed classes.
- **Error Handling**: Use `Failure` objects; avoid throwing exceptions.
- **Async Data**: Use `emit.forEach` or `emit.onEach` for streams.
- **Concurrency**: Use `transformer` (restartable, droppable) for event debouncing.
- **Testing**: Use `blocTest` for state transition verification.
- **Injection**: Register BLoCs as `@injectable` (Factory).

## Anti-Patterns

- **No Manual Emit**: Do not call `emit()` inside `Future.then`; always use `await` or `emit.forEach`.
- **No UI Logic**: Do not perform calculations or data formatting inside `BlocBuilder`.
- **No Cross-Bloc Reference**: Do not pass a BLoC instance into another BLoC; use streams or the UI layer to coordinate.

## Reference & Examples

For full BLoC/Cubit implementations and concurrency patterns:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

feature-based-clean-architecture | dependency-injection
