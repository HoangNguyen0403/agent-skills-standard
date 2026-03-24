---
name: laravel-eloquent
description: "Write performant Eloquent queries with eager loading, reusable scopes, and strict lazy-loading prevention in Laravel. Use when defining model relationships, creating query scopes, or processing large datasets with chunk/cursor. (triggers: app/Models/**/*.php, scope, with, eager, chunk, model)"
---

# Laravel Eloquent

## **Priority: P0 (CRITICAL)**

## Workflow: Add a Model with Safe Queries

1. **Define model** — Set `$fillable`, `$casts`, and relationships.
2. **Enable strict loading** — Call `preventLazyLoading(!app()->isProduction())` in AppServiceProvider.
3. **Add scopes** — Create `scopeActive()`, `scopeVerified()` for reusable filters.
4. **Eager-load in queries** — Use `with()` for all relationship access.
5. **Process large datasets** — Use `chunk()` or `cursor()` instead of `get()`.

## Scope + Eager Loading Example

See [implementation examples](references/implementation.md#scope--eager-loading-example) for model scopes, eager loading, and directory structure.

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
