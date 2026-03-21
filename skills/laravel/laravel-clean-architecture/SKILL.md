---
name: laravel-clean-architecture
description: 'Expert patterns for DDD, DTOs, and Ports & Adapters in Laravel. Use when applying Domain-Driven Design, DTOs, or ports-and-adapters patterns in Laravel. (triggers: app/Domains/**/*.php, app/Providers/*.php, domain, dto, repository, contract, adapter)'
---

# Laravel Clean Architecture

## **Priority: P1 (HIGH)**

## Structure

```text
app/
├── Domains/            # Logic grouped by business domain
│   └── {Domain}/
│       ├── Actions/    # Single use-case logic
│       ├── DTOs/       # Immutable data structures
│       └── Contracts/  # Interfaces for decoupling
└── Providers/          # Dependency bindings
```

## Implementation Guidelines

### Domain-Driven Design (DDD)

- **Grouping**: Organize code in **`app/Domains/Order/{Actions,DTOs,Contracts}/`**. Group by business domain (**`User, Order, Payment`**) — not by type (Controllers, Models).
- **Core Models**: Keep standard Eloquent models in **`app/Models/`**.
- **Separation**: **Never put Eloquent queries in controllers**; delegate to **Action classes** for use-case logic.

### Data Transfer Objects (DTOs)

- **Immutability**: Create typed readonly DTOs:
  ```php
  readonly class OrderData {
      public function __construct(
          public readonly string $title,
          public readonly int $amount
      ) {}
  }
  readonly class CreateOrderData {
      public function __construct(
          public readonly string $customerId,
          public readonly int $amount
      ) {}
  }
  ```
  Immutable by default in PHP 8.1+. DTOs cross boundaries — pass between layers instead of raw arrays or Eloquent models. No raw arrays between layers.

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
