---
name: angular-components
description: 'Standards for Standalone Components, Signals inputs, and Control Flow. Use when building standalone Angular components or implementing @if/@for control flow. (triggers: **/*.component.ts, **/*.component.html, angular component, standalone, input signal, output, @if, @for)'
---

# Angular Components

## **Priority: P0 (CRITICAL)**

## Principles

- **Standalone**: `standalone: true`. **Import all dependencies directly** in `imports` array. **Do not declare in NgModule**. (Angular 20+: standalone is the default — `standalone: true` is not needed.) Use `ng generate c` to scaffold automatically.
- **Signal Inputs**: Use `input()` and **input.required<T>()** instead of `@Input()`. Use **booleanAttribute** or `numberAttribute` transforms where applicable (e.g., `input(false, { transform: booleanAttribute })`). Access value as a function: **this.disabled()**.
- **Signal Outputs**: Use **output<T>()** (from v17.3+) instead of `@Output() EventEmitter`. Emit with: **this.selected.emit(value)**. For two-way binding use **model()** which creates a writable signal.
- **Control Flow**: Use **@if (condition)**, **@for (item of items; track item.id)**, **@switch**, and **@empty { }** blocks inside @for for empty state instead of `*ngIf`, `*ngFor`.
- **Host Bindings**: Define in the **host: { }** object on `@Component` (e.g., `'[class.active]': 'isActive()'`, `'(click)': 'onClick()'`) — **Never use @HostBinding or @HostListener decorators**.
- **View Encapsulation**: Default `Emulated`. Use `None` carefully.

## Signals Integration

- Use **computed()** for derived state and display values.
- Use `effect()` strictly for side effects (logging, manual DOM manipulation), NEVER for state propagation.
- **Avoid logic in templates** — move to `computed()` or component methods. Set **ChangeDetectionStrategy.OnPush**.

## Anti-Patterns

- **No logic in template**: Replace with `computed()` signals or component method calls.
- **No ElementRef mutation**: Encapsulate DOM changes in a Directive or use Renderer2.
- **No class inheritance**: Compose behavior using Directives and Services instead.

## References

- [Standalone Pattern](references/standalone-pattern.md)
- [Control Flow](references/control-flow.md)
