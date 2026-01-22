---
name: RxJS Interop
description: Bridging Observables and Signals using toSignal and toObservable.
metadata:
  labels: [angular, rxjs, signals, interop]
  triggers:
    files: ['**/*.ts']
    keywords: [toSignal, toObservable, takeUntilDestroyed, rxjs angular]
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

## References

- [Signals vs Observables](references/observables-vs-signals.md)
