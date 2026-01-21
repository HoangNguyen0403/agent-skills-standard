---
name: Flutter BLoC State Management
description: Standards for predictable state management using flutter_bloc, freezed, and equatable.
metadata:
  labels: [flutter, state-management, bloc, cubit, freezed, equatable]
  triggers:
    files: ['**_bloc.dart', '**_cubit.dart', '**_state.dart', '**_event.dart']
    keywords:
      [
        BlocProvider,
        BlocBuilder,
        BlocListener,
        Cubit,
        Emitter,
        transformer,
        Equatable,
      ]
---

# BLoC State Management

## **Priority: P0 (CRITICAL)**

Predictable state management separating business logic from UI using `flutter_bloc`, `freezed`, or `equatable`.

## Structure

```text
lib/features/auth/
├── bloc/
│   ├── auth_bloc.dart
│   ├── auth_event.dart # (@freezed or Equatable)
│   └── auth_state.dart # (@freezed or Equatable)
```

## Implementation Guidelines

- **States & Events**: Use `@freezed` for union states. See [references/bloc_templates.md](references/bloc_templates.md).
- **Error Handling**: Use `Failure` objects; avoid throwing exceptions.
- **Async Data**: Use `emit.forEach` for streams.
- **Concurrency**: Use `transformer` for event debouncing.
- **Testing**: Use `blocTest` for state transition verification.
- **Injection**: Register BLoCs as `@injectable` (Factory).

## Anti-Patterns

- **No Manual Emit**: Do not call `emit()` inside `Future.then`; always use `await` or `emit.forEach`.
- **No UI Logic**: Do not perform calculations or data formatting inside `BlocBuilder`.
- **No Cross-Bloc Reference**: Do not pass a BLoC instance into another BLoC; use streams or the UI layer to coordinate.

## Related Topics

layer-based-clean-architecture | dependency-injection | error-handling
