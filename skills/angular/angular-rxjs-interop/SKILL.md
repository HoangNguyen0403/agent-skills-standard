---
name: angular-rxjs-interop
description: 'Bridging Observables and Signals using toSignal and toObservable. Use when converting between RxJS Observables and Angular Signals. (triggers: toSignal, toObservable, takeUntilDestroyed, rxjs angular)'
---

# RxJS Interop

## **Priority: P1 (HIGH)**

## Principles

- **Async to Sync**: Use **toSignal(observable$, { initialValue: defaultValue })** from **@angular/core/rxjs-interop** to convert Observables (HTTP, Events) to Signals for template rendering. Call in an **injection context** (class field or constructor). **toSignal auto-unsubscribes** on component destroy. Provide **initialValue** to avoid `undefined`.
- **Sync to Async**: Use **toObservable(this.query)** when you need RxJS operators (**debounceTime**, **switchMap**, **distinctUntilChanged**) on a Signal. Then wrap back with **toSignal()** if rendering.
- **Auto-Unsubscribe**: `toSignal` automatically unsubscribes.
- **Cleanup**: Use **takeUntilDestroyed()** for manual subscriptions in **injection contexts**. For use outside, **inject(DestroyRef)** and call `takeUntilDestroyed(destroyRef)`.

## Guidelines

- **HTTP Requests**:
  - GET: `http.get<User[]>(...).pipe(catchError(() => of([])))` -> `toSignal(..., { initialValue: [] })`. Use in templates as **{{ users() }}**.
  - Consider **httpResource()** for simpler reactive HTTP in newer versions.
  - POST/PUT: Trigger explicit subscribe() or lastValueFrom().
- **Race Conditions**: Handle async loading states. `toSignal` requires an `initialValue` or handles `undefined`.

## Anti-Patterns

- **No manual subscribe in templates**: Use `toSignal()` for Observables rendered in templates.
- **No BehaviorSubject for state**: Replace with `signal()` + `toObservable()` for RxJS interop.
- **No global takeUntil**: Use `takeUntilDestroyed()` scoped to the injection context. **Never use a global Subject** with takeUntil — it leaks if Subject is never completed.

## References

- [Signals vs Observables](references/observables-vs-signals.md)
