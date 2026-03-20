---
name: angular-directives-pipes
description: "Composition patterns using HostDirectives and Pure Pipes. Use when creating attribute directives with HostDirectives or writing pure pipes in Angular. (triggers: **/*.directive.ts, **/*.pipe.ts, hostDirectives, PipeTransform, pure)"
---

# Directives & Pipes

## **Priority: P2 (MEDIUM)**

## Principles

- **Composition**: Use `hostDirectives` to compose behaviors onto components/directives without inheritance.
- **Pure Pipes**: Pipes must be `pure: true` (default). They cache results based on input reference.
- **Directive Logic**: Encapsulate reusable DOM manipulation or behavioral logic in Directives (e.g., `appFocusTrap`, `appTooltip`).

## Guidelines

- **Signal Inputs**: Directives also support signal inputs.
- **Standalone**: All Pipes and Directives must be standalone.

## Anti-Patterns

- **No @HostBinding/@HostListener**: Use `host: {}` object in `@Directive` decorator instead.
- **No impure pipes for static transforms**: Keep `pure: true` (default); use `async` pipe for Observables.
- **No structural directives for conditionals**: Use native `@if`/`@for`/`@switch` block syntax.

## References

- [Composition](references/composition.md)
