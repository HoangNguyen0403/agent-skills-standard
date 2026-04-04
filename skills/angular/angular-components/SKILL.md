---
name: angular-components
description: "Build standalone Angular components with Signals inputs, OnPush change detection, Control Flow, and Smart/Dumb patterns. Use when building standalone Angular components, implementing @if/@for control flow, applying OnPush change detection, or implementing Signals in Angular components. (triggers: **/*.component.ts, **/*.component.html, angular component, standalone, input signal, output, @if, @for, ChangeDetectionStrategy, OnPush, Input, Output)"
---

# Angular Components

## **Priority: P0 (CRITICAL)**

## Standalone & Structure

- **Standalone**: `standalone: true`. Import all dependencies in `imports` array. Do not declare in NgModule. (Angular 20+: standalone is the default.)
- **Smart/Dumb Split**: **Smart (Container)** → inject services, manage state. **Presentational (Dumb)** → inputs/outputs only, no service dependencies, emit events via outputs.
- **Host Bindings**: Define in `host: { }` on `@Component` (e.g., `'[class.active]': 'isActive()'`) — never use @HostBinding/@HostListener.
- **View Encapsulation**: Default `Emulated`. Use `None` carefully.

## Signals & Change Detection

- **OnPush**: ALWAYS use `ChangeDetectionStrategy.OnPush`. No exceptions.
- **Signal Inputs**: Use `input.required<T>()` or `input<T>()` instead of `@Input()`. Access as functions: `{{ userId() }}`. Use `booleanAttribute`/`numberAttribute` transforms.
- **Signal Outputs**: Use `output<T>()` (v17.3+) instead of `@Output() EventEmitter`. For two-way binding use `model()`.
- **State**: `signal()` for local state, `computed()` for derived state, `effect()` only for side effects.
- **Cleanup**: Use `toSignal()` (auto-unsubscribes), `takeUntilDestroyed()`, or `DestroyRef`. Never `subscribe()` without cleanup.

## Control Flow

- Use `@if (condition)`, `@for (item of items; track item.id)`, `@switch`, `@empty { }` instead of `*ngIf`/`*ngFor`.

## Anti-Patterns

- **No default change detection**: OnPush only — default re-checks every component on every event.
- **No functions in templates**: `{{ calculate() }}` re-evaluates every cycle → use `computed()`.
- **No manual subscribe**: Use `async` pipe or `toSignal`. Never `subscribe()` in ngOnInit without cleanup.
- **No ElementRef mutation**: Use Directives or Renderer2.
- **No class inheritance**: Compose with Directives and Services.

## References

- [Standalone Pattern](references/standalone-pattern.md)
- [Control Flow](references/control-flow.md)
