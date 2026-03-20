---
name: angular-components
description: "Standards for Standalone Components, Signals inputs, and Control Flow. Use when building standalone Angular components or implementing @if/@for control flow. (triggers: **/*.component.ts, **/*.component.html, angular component, standalone, input signal, output, @if, @for)"
---

# Angular Components

## **Priority: P0 (CRITICAL)**

## Principles

- **Standalone**: `standalone: true`. Import dependencies directly in `imports` array. (Angular 20+: standalone is the default — `standalone: true` is not needed.)
- **Signal Inputs**: Use `input()` and `input.required()` instead of `@Input()`. Use `booleanAttribute`/`numberAttribute` transforms where applicable.
- **Signal Outputs**: Use `output()` (from v17.3+) instead of `@Output() EventEmitter`.
- **Control Flow**: Use `@if`, `@for (item of items; track item.id)`, `@switch`, `@empty` instead of `*ngIf`, `*ngFor`.
- **Host Bindings**: Define in the `host: {}` object on `@Component` — do NOT use `@HostBinding`/`@HostListener` decorators.
- **View Encapsulation**: Default `Emulated`. Use `None` carefully.

## Signals Integration

- Use `computed()` for derived state.
- Use `effect()` strictly for side effects (logging, manual DOM manipulation), NEVER for state propagation.

## Anti-Patterns

- **No logic in template**: Replace with `computed()` signals or component method calls.
- **No ElementRef mutation**: Encapsulate DOM changes in a Directive or use Renderer2.
- **No class inheritance**: Compose behavior using Directives and Services instead.

## References

- [Standalone Pattern](references/standalone-pattern.md)
- [Control Flow](references/control-flow.md)
