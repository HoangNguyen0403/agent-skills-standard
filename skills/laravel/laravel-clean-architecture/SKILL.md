---
name: laravel-clean-architecture
description: Implement Domain-Driven Design with typed DTOs, repository interfaces, and single-responsibility Action classes in Laravel. Use when creating domain folders, binding repository contracts in providers, or passing DTOs between layers.
metadata:
  triggers:
    files:
    - 'app/Domains/**/*.php'
    - 'app/Providers/*.php'
    keywords:
    - domain
    - dto
    - repository
    - contract
    - adapter
---
# Laravel Clean Architecture

## **Priority: P1 (HIGH)**

## Workflow: Add Domain Feature

1. **Create domain folder** — `app/Domains/Order/{Actions,DTOs,Contracts}/`.
2. **Define DTO** — Create `readonly class` with typed constructor properties.
3. **Create contract** — Define repository interface in `Contracts/`.
4. **Implement repository** — Build Eloquent implementation; bind in `AppServiceProvider`.
5. **Write Action class** — Single-responsibility use-case logic consuming DTO.
6. **Verify bindings** — Run `php artisan tinker` and resolve interface to confirm DI works.

## Action + DTO Example

See [implementation examples](references/implementation.md#action--dto-example) for Action class with DTO and domain structure patterns.

## Implementation Guidelines

### Domain-Driven Design (DDD)

- **Grouping**: Organize code in **`app/Domains/Order/{Actions,DTOs,Contracts}/`**. Group by business domain (**`User, Order, Payment`**) — not by type (Controllers, Models).
- **Core Models**: Keep standard Eloquent models in **`app/Models/`**.
- **Separation**: **Never put Eloquent queries in controllers**; delegate to **Action classes** for use-case logic.

### Data Transfer Objects (DTOs)

- **Immutability**: Use `readonly class` (PHP 8.2+) or `readonly` properties (PHP 8.1+). DTOs cross boundaries — pass between layers instead of raw arrays or Eloquent models.

### Repository Pattern & Decoupling

- **Interfaces**: Create **`Contracts/OrderRepository interface`** and implement **`EloquentOrderRepository`**.
- **Binding**: Bind interfaces to implementations in **`AppServiceProvider`** via **`$this->app->bind(OrderRepository::class, EloquentOrderRepository::class)`**.
- **Usage**: **Inject interfaces** into your actions/services.
- **Layer Flow**: Controller → Action → Repository Interface → Eloquent. DTOs cross boundaries at every layer transition.

## Anti-Patterns

- **No Eloquent in Controllers**: Bridge layers with DTOs and Actions.
- **No raw arrays across layers**: Use typed `readonly` DTOs.
- **No God Services**: Break into single-responsibility Actions.
- **No concrete dependencies**: Depend on Interfaces, not implementations.

## References

- [DDD & Repository Patterns](references/implementation.md)