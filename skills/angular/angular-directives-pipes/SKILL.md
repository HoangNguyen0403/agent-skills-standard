---
name: angular-directives-pipes
description: Build custom Angular attribute directives, HostDirectives, and pure pipes. Use for Angular directive or pipe implementation, including custom attribute directives; defer React/CSS middleware and unrelated framework work.
metadata:
  triggers:
    files:
      - "**/*.directive.ts"
      - "**/*.pipe.ts"
    keywords:
      - hostDirectives
      - PipeTransform
      - pure
---

# Directives & Pipes

## **Priority: P2 (MEDIUM)**

## Principles

- **Composition**: Use **hostDirectives: [TooltipDirective]** on `@Component` or `@Directive` decorators to compose behaviors without inheritance. Expose inputs/outputs via **hostDirectives: [{ directive: TooltipDirective, inputs: ['text'] }]**.
- **Pure Pipes**: Decorate with `@Pipe({ name: 'truncate', standalone: true, pure: true })`. Implement **PipeTransform** with `transform(value: string, limit = 50)` method. Pipes must **pure: true** (default) to **cache results** by input reference — Angular only re-runs them when reference changes. ** not set pure: false** unless handling Observables/Arrays that mutate.
- **Directive Logic**: Encapsulate reusable DOM manipulation or behavioral logic in **standalone: true** Directives (e.g., **selector: '[appHighlight]'**). **Inject ElementRef/Renderer2 for DOM access**.

## Guidelines

- **Signal Inputs**: Directives and Pipes support signal inputs.
- **Standalone**: All Pipes and Directives must standalone. ** not declare in NgModule**; import directly in component **imports array**. Use **ng generate directive** to scaffold.

## Anti-Patterns

- **No @HostBinding/@HostListener**: Use **host: {} object** in `@Directive` decorator — not with @HostBinding or @HostListener (e.g., **'(mouseenter)': 'show()'**, **'[attr.aria-label]': 'text()'**) — these decorators deprecated patterns.
- **No impure pipes for static transforms**: Keep `pure: true` (default); use `async` pipe for Observables.
- **No structural directives for conditionals**: Use native `@if`/`@for`/`@switch` block syntax.

## References

- [Composition](references/composition.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:

- cache results
- host: {} object
- imports array
- not set pure: false
- not with @HostBinding
