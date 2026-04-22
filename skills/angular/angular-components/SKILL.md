---
name: angular-components
description: Build standalone Angular components with Signals inputs, OnPush change detection, Control Flow, and Smart/Dumb patterns. Use when building standalone Angular components, implementing @if/@for control flow, applying OnPush change detection, or implementing Signals in Angular components.
metadata:
  triggers:
    files:
    - '**/*.component.ts'
    - '**/*.component.html'
    keywords:
    - angular component
    - standalone
    - input signal
    - output
    - "@if"
    - "@for"
    - ChangeDetectionStrategy
    - OnPush
    - Input
    - Output
---
# Angular Components

## **Priority: P0 (CRITICAL)**

## Standalone & Structure

- **Standalone**: `standalone: true`. Import all deps in `imports` array. No NgModule. (Angular 20+: standalone default.)
- **Smart/Dumb Split**: **Smart (Container)** → inject services, manage state. **Presentational (Dumb)** → accept inputs and emit events via outputs only; no service dependencies.
- **Host Bindings**: Define in `host: { }` on `@Component` (e.g., `'[class.active]': 'isActive()'`) — never use @HostBinding/@HostListener.
- **View Encapsulation**: Default `Emulated`. Use `None` carefully.

## Signals & Change Detection

- **OnPush**: ALWAYS use `ChangeDetectionStrategy.OnPush`. No exceptions.
- **Signal Inputs**: `input.required<T>()` or `input<T>()` not `@Input()`. Access as functions: `{{ userId() }}`. Use `booleanAttribute`/`numberAttribute` transforms.
- **Signal Outputs**: `output<T>()` (v17.3+) not `@Output() EventEmitter`. Two-way binding: `model()`.
- **State**: `signal()` local, `computed()` derived, `effect()` side effects only.
- **Cleanup**: `toSignal()` (auto-unsubscribes), `takeUntilDestroyed()`, or `DestroyRef`. Never `subscribe()` without cleanup.

## Control Flow

- Use `@if (condition)`, `@for (item of items; track item.id)`, `@switch`, `@empty { }` instead of `*ngIf`/`*ngFor` (new control flow syntax, Angular 17+).

## Anti-Patterns

- **No default CD**: OnPush only — default re-checks every component every event.
- **No functions in templates**: `{{ calculate() }}` re-evaluates every cycle → `computed()` instead.
- **No manual subscribe**: `async` pipe or `toSignal`. Never `subscribe()` without cleanup.
- **No ElementRef mutation**: Directives or Renderer2.
- **No class inheritance**: Compose with Directives and Services.

## References

- [Standalone Pattern](references/standalone-pattern.md)
- [Control Flow](references/control-flow.md)
