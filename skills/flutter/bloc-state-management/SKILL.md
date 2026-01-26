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

- **No .then()**: Use `await` or `emit.forEach()` to emit states.
- **No Logic in Builder**: Perform calculations in BLoC, not inside `BlocBuilder`.
- **No BLoC-to-BLoC**: Use streams to coordinate BLoCs, not direct references.

## Related Topics

layer-based-clean-architecture | dependency-injection | error-handling
