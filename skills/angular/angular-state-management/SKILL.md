---
name: angular-state-management
description: Implement application state with Angular Signals, computed derivations, and NgRx Signal Store. Use when implementing reactive state with signal(), computed(), effect(), or @ngrx/signals in Angular.
metadata:
  triggers:
    files:
    - '**/*.store.ts'
    - '**/state/**'
    keywords:
    - angular signals
    - signal store
    - computed
    - effect
    - linkedSignal
---
# State Management

## **Priority: P1 (HIGH)**

## 1. Use Signals for All State

- Keep internal signals private; expose publicly via `asReadonly()`.

See [signal store pattern](references/signal-store.md) for signal-based service and store examples.

## 2. Derive State with computed()

- Use `computed()` for totals, filtered lists, derived values — pure and cached.
- Use `linkedSignal(() => source())` for dependent writable state that resets when source changes.
- Use `untracked()` to read signal inside `computed()`/`effect()` without creating dependency.

## 3. Scale with Signal Store

- For complex features, use `@ngrx/signals` (`signalStore`) with `withState`, `withComputed`, `withMethods`, and `withEntities()`.

## 4. Handle Side Effects

- Use `effect()` only for side effects (logging, localStorage sync, DOM manipulation).
- **Never update signals inside effect()** — causes circular dependencies.
- Treat signal values as immutable — update with `.set()` or `.update(v => ...)`.

## Anti-Patterns

- **No state logic in components**: Delegate to Signal Store or Service.
- **No `BehaviorSubject` for state**: Use Signals; keep RxJS only for complex event streams.

## References

- [Signal Store Pattern](references/signal-store.md)