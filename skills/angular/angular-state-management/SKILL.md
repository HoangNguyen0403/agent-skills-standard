---
name: angular-state-management
description: "Signals-based state management and NgRx Signal Store. Use when managing application state with Angular Signals or NgRx Signal Store. (triggers: **/*.store.ts, **/state/**, angular signals, signal store, computed, effect, linkedSignal)"
---

# State Management

## **Priority: P1 (HIGH)**

## Principles

- **Signals First**: Use Signals for all local and shared state.
- **Computed**: Derive state declaratively using `computed()`.
- **Services**: For simple apps, a service with `signal` properties is sufficient.
- **Signal Store**: For complex features, use `@ngrx/signals` (Signal Store) over Redux boilerplate.

## Modern Signal APIs

- **`linkedSignal()`**: For dependent state that resets when a source changes (e.g., reset selected item when list changes). See references.
- **`asReadonly()`**: Expose public readonly signals from private writable signals in services.
- **`untracked()`**: Read a signal inside `computed()`/`effect()` without creating a dependency.

## Guidelines

- **Immutability**: Treat signal values as immutable. Update using `.set()` or `.update()`.
- **Effects**: Use `effect()` sparingly (e.g., logging, syncing to localStorage). Do not cascade state updates in effects.

## Anti-Patterns

- **No state logic in components**: Delegate to a Signal Store or Service instead.
- **No `BehaviorSubject` for state**: Use Signals; keep RxJS only for complex event streams.

## References

- [Signal Store Pattern](references/signal-store.md)
