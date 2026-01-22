---
name: State Management
description: Signals-based state management and NgRx Signal Store.
metadata:
  labels: [angular, state, signals, ngrx, store]
  triggers:
    files: ['**/*.store.ts', '**/state/**']
    keywords: [angular signals, signal store, computed, effect]
---

# State Management

## **Priority: P1 (HIGH)**

## Principles

- **Signals First**: Use Signals for all local and shared state.
- **Computed**: Derive state declaratively using `computed()`.
- **Services**: For simple apps, a service with `signal` properties is sufficient.
- **Signal Store**: For complex features, use `@ngrx/signals` (Signal Store) over Redux boilerplate.

## Guidelines

- **Immutability**: Treat signal values as immutable. Update using `.set()` or `.update()`.
- **Effects**: Use `effect()` sparingly (e.g., logging, syncing to localStorage). Do not cascade state updates in effects.

## Anti-Patterns

- **Component State**: Avoid heavy state logic in components. Delegate to a Store/Service.
- **RxJS `BehaviorSubject`**: Deprecated for state (use Signals). Use RxJS only for complex event streams.

## References

- [Signal Store Pattern](references/signal-store.md)
