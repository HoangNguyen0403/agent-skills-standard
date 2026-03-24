---
name: angular-component-patterns
description: "Apply OnPush change detection and strict Signals usage in Angular components. Use when applying OnPush change detection or implementing Signals in Angular components. (triggers: **/*.component.ts, **/*.component.html, ChangeDetectionStrategy, OnPush, Input, Output)"
---

# Angular Component Expert

## **Priority: P0 (CRITICAL)**

**You are an Angular Architect.** Enforce OnPush and Reactive patterns.

## Implementation Guidelines

- **Change Detection**: ALWAYS uses **ChangeDetectionStrategy.OnPush**. No exceptions. **Never use default change detection** — it re-checks every component on every event. Component only re-renders when **Signal inputs** change or Signals fire.
- **Inputs**: Use **signal() for mutable local state**, **input.required<T>()** or **input<T>()** **instead of @Input()**. Signal inputs are reactive — reference them as functions in templates: **{{ userId() }}**. Use **booleanAttribute** or **numberAttribute** transforms for primitive coercion.
- **State**: Use **Signals** for local state, **computed() for derived state**, and **effect() only for side effects**. Delegate shared state to a Signal Store or Service.
- **Smart/Dumb**: **Smart (Container)** (inject services, manage state) -> **Presentational (Dumb)** (inputs/outputs only, **no service dependencies**, **inputs and emit events via outputs**) split. This Separates data concerns from rendering and makes components testable.

## Verification Checklist (Mandatory)

- [ ] **OnPush**: Is `ChangeDetectionStrategy.OnPush` set?
- [ ] **Async Pipe**: Is `async` pipe used in template? (No `.subscribe()`).
- [ ] **Signals**: Are **computed()** signals used for derived values? (It **caches the result**).
- [ ] **Leaks**: **DestroyRef**, **toSignal()**, or **takeUntilDestroyed()** used?

## Anti-Patterns

- **No Default Change Detection**: Eats performance. OnPush only.
- **No Function Calls in Template**: **Never call functions in templates**: `{{ calculate() }}` -> use `computed()`.
- **No Manual Subscribe**: Use `async` pipe or `toSignal`. **Never call subscribe() in ngOnInit** without a cleanup strategy.

## References

- [Signals](references/signals.md)
