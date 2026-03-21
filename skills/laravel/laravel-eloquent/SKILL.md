---
name: laravel-eloquent
description: 'Advanced Eloquent ORM patterns for performance and query reuse. Use when working with Eloquent relationships, scopes, or advanced query optimization in Laravel. (triggers: app/Models/**/*.php, scope, with, eager, chunk, model)'
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

### Query Efficiency & Performance

- **N+1 Prevention**: **Always use `with()`** or `$with` for relationships. Never access relationship properties in a loop without eager loading (**N+1 Prevention**).
- **Strict Loading**: Call **`Eloquent::preventLazyLoading(!app()->isProduction())`** in **`AppServiceProvider::boot()`** to throw **`LazyLoadingViolationException`** in local/dev.
- **Large Datasets**: Use **`chunk()`**, **`lazy()`**, or **`cursor()`** for processing many records without memory issues (**Memory Efficiency**).

### Query Logic & Scopes

- **Reusable Scopes**: Define **`scopeName(Builder $query): Builder`** methods in models for **reusable query filters**.
- **Chaining**: Chain scopes (e.g., `User::active()->verified()->get()`) to keep controllers from duplicating query logic.

### Models & Security

- **Mass Assignment**: Always define **`protected $fillable`** array; use **`$request->validated()`** for **`Model::create()`**.
- **Casting**: Use **`protected $casts`** for dates, JSON, and custom types to ensure data consistency.

## Anti-Patterns

- **No lazy loading**: Eager-load with `with()` or `$with`; never in loops.
- **No business logic in Models**: Move to Services or Actions.
- **No raw SQL strings**: Use Query Builder or Eloquent methods.
- **No `select *`**: Specify required columns to limit data transfer.

## References

- [Eloquent Performance Guide](references/implementation.md)
