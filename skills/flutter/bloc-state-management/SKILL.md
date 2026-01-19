---
name: Flutter BLoC State Management
description: Standards for predictable state management using flutter_bloc, freezed, and equatable.
metadata:
  labels: [state-management, bloc, cubit, freezed, equatable]
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

Predictable state management separating business logic from UI using `bloc`, `freezed`, or `equatable`.

## Structure

```text
presentation/blocs/
├── auth/
│   ├── auth_bloc.dart
│   ├── auth_event.dart # (@freezed or Equatable)
│   └── auth_state.dart # (@freezed or Equatable)
```

## Implementation Guidelines

- **States & Events**: Default to `@freezed` (Priority). Use `Equatable` if the library is present in `pubspec.yaml`.
  - **freezed**: Use for union states (initial, loading, success) and automatic `copyWith`.
  - **Equatable**: Apply if code generation (build_runner) is avoided or `equatable` is the only comparison library in `pubspec.yaml`.
  - Choose strategy:
    - **Union State**: Exclusive UI phases (loading vs data).
    - **Property-based State**: Complex forms (Option<$Either>, flags).
- **State Properties**: Use enums, sealed classes, or `Status` objects.
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
