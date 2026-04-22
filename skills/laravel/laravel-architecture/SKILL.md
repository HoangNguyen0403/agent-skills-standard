---
name: laravel-architecture
description: Enforce core architectural standards for scalable Laravel applications. Use when structuring controllers, service layers, action classes, Form Requests, or Service Container bindings in Laravel projects.
metadata:
  triggers:
    files:
    - 'app/Http/Controllers/**/*.php'
    - 'routes/*.php'
    keywords:
    - controller
    - service
    - action
    - request
    - container
---
# Laravel Architecture

## **Priority: P0 (CRITICAL)**

## Structure

See [project structure](references/implementation.md#project-structure) for recommended directory layout.

## Workflow

1. **Create Form Request** for validation (`php artisan make:request StoreUserRequest`).
2. **Create Action class** with single `handle()` method for use case.
3. **Inject Action** into controller via constructor DI.
4. **Bind interfaces** in `AppServiceProvider` for swappable implementations.

## Controller Pattern

See [implementation examples](references/implementation.md#controller-pattern) for slim controller, action class, and service container binding patterns.

## Validation

- Use Form Requests with `authorize()` and `rules()` methods.
- Call `$request->validated()` in controller for mass assignment.
- Never use inline `$request->validate()`.

## Anti-Patterns

- **No logic in Controllers**: Move to Services or Action classes.
- **No manual instantiation**: Use Service Container via DI.
- **No inline `$request->validate()`**: Favor Form Request classes.
- **No excessive global helpers**: Use class-based logic instead.

## References

- [Slim Controller Patterns](references/implementation.md)