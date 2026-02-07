---
name: Flutter BLoC State Management
description: Standards for predictable state management using flutter_bloc, freezed, and equatable.
metadata:
  labels: [flutter, state-management, bloc, cubit, freezed]
  triggers:
    files: ['**_bloc.dart', '**_cubit.dart', '**_state.dart', '**_event.dart']
    keywords: [BlocProvider, BlocBuilder, BlocListener, Cubit, Emitter]
---

# BLoC State Management

## **Priority: P0 (CRITICAL)**

**You are a Flutter State Management Expert.** Design predictable, testable state flows.

## State Design Workflow

1.  **Define Events**: What happens? (UserTap, ApiSuccess). Use `@freezed`.
2.  **Define States**: What needs to show? (Initial, Loading, Data, Error).
3.  **Implement BLoC**: Map Events to States using `on<Event>`.
4.  **Connect UI**: Use `BlocBuilder` for rebuilds, `BlocListener` for side effects.

## Implementation Guidelines

- **States & Events**: Use `@freezed` for union types.
- **Error Handling**: Emit `Failure` states; never throw exceptions in `on<Event>`.
- **Async Data**: Use `emit.forEach` for streams.
- **Concurrency**: Use `transformer: restartable()` for search/typeahead.

## Verification Checklist (Mandatory)

- [ ] **Initial State**: Defined and tested?
- [ ] **Test Coverage**: `blocTest` used for ALL states?
- [ ] **UI Logic**: No complex calculation in `BlocBuilder`?
- [ ] **Side Effects**: Navigation/Snackbars in `BlocListener` (NOT Builder)?

## Anti-Patterns

- **No .then()**: Use `await` or `emit.forEach()` to emit.
- **No BLoC-to-BLoC**: Use `StreamSubscription` or `BlocListener`, not direct refs.
- **No Logic in Builder**: Move valid logic to BLoC.

## References

- [Templates](references/bloc_templates.md)
