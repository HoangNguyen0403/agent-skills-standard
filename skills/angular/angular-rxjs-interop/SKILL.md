---
name: angular-rxjs-interop
description: "Bridging Observables and Signals using toSignal and toObservable. Use when converting between RxJS Observables and Angular Signals. (triggers: toSignal, toObservable, takeUntilDestroyed, rxjs angular)"
---

# RxJS Interop

## **Priority: P1 (HIGH)**

## Principles

- **Async to Sync**: Use `toSignal` to convert Observables (HTTP, Events) to Signals for template rendering.
- **Sync to Async**: Use `toObservable` when you need RxJS operators (debounce, switchMap) on a Signal.
- **Auto-Unsubscribe**: `toSignal` automatically unsubscribes.
- **Cleanup**: Use `takeUntilDestroyed` for manual subscriptions in injection contexts.

## Guidelines

- **HTTP Requests**:
  - GET: `http.get().pipe(...)` -> `toSignal()`
  - POST/PUT: Trigger explicit subscribe() or lastValueFrom().
- **Race Conditions**: Handle async loading states. `toSignal` requires an `initialValue` or handles `undefined`.

## Anti-Patterns

- **No manual subscribe in templates**: Use `toSignal()` for Observables rendered in templates.
- **No BehaviorSubject for state**: Replace with `signal()` + `toObservable()` for RxJS interop.
- **No global takeUntil**: Use `takeUntilDestroyed()` scoped to the injection context.

## References

- [Signals vs Observables](references/observables-vs-signals.md)
