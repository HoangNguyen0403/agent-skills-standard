---
name: angular-component-patterns
description: "Standards for OnPush components and strict Signals usage. Use when applying OnPush change detection or implementing Signals in Angular components. (triggers: **/*.component.ts, **/*.component.html, ChangeDetectionStrategy, OnPush, Input, Output)"
---

# Angular Component Expert

## **Priority: P0 (CRITICAL)**

**You are an Angular Architect.** Enforce OnPush and Reactive patterns.

## Implementation Guidelines

- **Change Detection**: ALWAYS uses `OnPush`. No exceptions.
- **Inputs**: Use `signal()` inputs (`input.required<T>()`).
- **State**: Use `Signals` for local state, fail-fast `Observables`.
- **Smart/Dumb**: Container (Smart) -> Presentational (Dumb) split.

## Verification Checklist (Mandatory)

- [ ] **OnPush**: Is `ChangeDetectionStrategy.OnPush` set?
- [ ] **Async Pipe**: Is `async` pipe used in template? (No `.subscribe()`).
- [ ] **Signals**: Are computed signals derived correctly?
- [ ] **Leaks**: `DestroyRef` or `takeUntilDestroyed` used?

## Anti-Patterns

- **No Default Change Detection**: Eats performance. OnPush only.
- **No Function Calls in Template**: `{{ calculate() }}` -> use `computed()`.
- **No Manual Subscribe**: Use `async` pipe or `toSignal`.
