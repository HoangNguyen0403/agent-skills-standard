---
name: laravel-eloquent
description: "Advanced Eloquent ORM patterns for performance and query reuse. Use when working with Eloquent relationships, scopes, or advanced query optimization in Laravel. (triggers: app/Models/**/*.php, scope, with, eager, chunk, model)"
---

# Laravel Eloquent

## **Priority: P0 (CRITICAL)**

## Structure

```text
app/
└── Models/
    ├── {Model}.php
    └── Scopes/         # Advanced global scopes
```

## Implementation Guidelines

- **N+1 Prevention**: Always use `with()` or `$with` for relationships.
- **Eager Loading**: Set strict loading via `Eloquent::preventLazyLoading()`.
- **Reusable Scopes**: Define `scopeName` methods for common query filters.
- **Mass Assignment**: Define `$fillable` and use `$request->validated()`.
- **Performance**: Use `chunk()`, `lazy()`, or `cursor()` for large tasks.
- **Casting**: Use `$casts` for dates, JSON, and custom types.

## Anti-Patterns

- **No lazy loading**: Eager-load with `with()` or `$with`; never in loops.
- **No business logic in Models**: Move to Services or Actions.
- **No raw SQL strings**: Use Query Builder or Eloquent methods.
- **No `select *`**: Specify required columns to limit data transfer.

## References

- [Eloquent Performance Guide](references/implementation.md)
