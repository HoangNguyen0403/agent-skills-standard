---
name: flutter-bloc-state-management
description: 'BLoC/Cubit state management standards. ALWAYS consult when writing, modifying, reviewing, or testing any BLoC, Cubit, state, or event Dart file — even for small changes. (triggers: **_bloc.dart, **_cubit.dart, **_state.dart, **_event.dart, BlocProvider, BlocBuilder, BlocListener, Cubit, Emitter)'
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

- **States & Events**: Use **@freezed** for union types (e.g., `Initial`, `Loading`, `Success`, `Failure` states).
- **Error Handling**: Emit `Failure` states with a specific error message; never throw exceptions in `on<Event>`.
- **Async Data**: Use **emit.forEach** for streams or **await** with `emit` call.
- **Concurrency**: Use **transformer: restartable()** from `bloc_concurrency` for search/typeahead to debounce and cancel previous requests.
- **UI Connectivity**: Use **BlocBuilder** for UI rebuilds (e.g., loading spinner, data list, error message) and **BlocListener** for side effects (navigation, snackbars).
- **Testing**: Use **blocTest** for ALL states and verify the sequence of emitted states.

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
