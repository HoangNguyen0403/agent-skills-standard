---
name: angular-state-management
description: 'Signals-based state management and NgRx Signal Store. Use when managing application state with Angular Signals or NgRx Signal Store. (triggers: **/*.store.ts, **/state/**, angular signals, signal store, computed, effect, linkedSignal)'
---

# State Management

## **Priority: P1 (HIGH)**

## Principles

- **Signals First**: Use **signal()** for all local and shared state. Keep internal signals private: `private _user = signal<User | null>(null)`.
- **Computed**: Derive state declaratively using **computed() for derived state** (totals, filtered lists) — it's pure and **cached**.
- **Services**: For simple apps, a service with signal properties is sufficient. Expose publicly **asReadonly()** (e.g., `user = this._user.asReadonly()`). This **enforces that only the service mutates** state while consumers can still react to changes.
- **Signal Store**: For complex features, use **@ngrx/signals** (**signalStore**) with **withState**, **withComputed**, **withMethods**, and **withEntities()** for normalized collections.

## Modern Signal APIs

- **`linkedSignal(() => source())`**: For dependent **writable** state that **resets when source changes** (e.g., reset selected item when list changes).
- **`asReadonly()`**: Expose public readonly signals from private writable signals in services.
- **`untracked()`**: Read a signal inside `computed()`/`effect()` without creating a dependency.

## Guidelines

- **Immutability**: Treat signal values as immutable. **Never mutate state directly** — update using **.set()** or **.update(v => v + 1)**.
- **Effects**: Use **effect() only for side effects** (e.g., logging, **localStorage sync**, manual DOM manipulation). **Never update signals inside effect()** — this causes circular dependency and is an anti-pattern.

## Anti-Patterns

- **No state logic in components**: Delegate to a Signal Store or Service instead.
- **No `BehaviorSubject` for state**: Use Signals; keep RxJS only for complex event streams.

## References

- [Signal Store Pattern](references/signal-store.md)
