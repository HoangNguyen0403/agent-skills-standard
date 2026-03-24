---
name: laravel-clean-architecture
description: "Implement Domain-Driven Design with typed DTOs, repository interfaces, and single-responsibility Action classes in Laravel. Use when creating domain folders, binding repository contracts in providers, or passing DTOs between layers. (triggers: app/Domains/**/*.php, app/Providers/*.php, domain, dto, repository, contract, adapter)"
---

# Laravel Clean Architecture

## **Priority: P1 (HIGH)**

## Workflow: Add a Domain Feature

1. **Create domain folder** — `app/Domains/Order/{Actions,DTOs,Contracts}/`.
2. **Define DTO** — Create a `readonly class` with typed constructor properties.
3. **Create contract** — Define a repository interface in `Contracts/`.
4. **Implement repository** — Build Eloquent implementation; bind in `AppServiceProvider`.
5. **Write Action class** — Single-responsibility use-case logic consuming the DTO.
6. **Verify bindings** — Run `php artisan tinker` and resolve the interface to confirm DI works.

## Action + DTO Example

```php
// app/Domains/Order/DTOs/CreateOrderData.php
readonly class CreateOrderData {
    public function __construct(
        public string $customerId,
        public int $amount,
    ) {}
}

// app/Domains/Order/Actions/CreateOrderAction.php
class CreateOrderAction {
    public function __construct(private OrderRepository $repo) {}

    public function execute(CreateOrderData $data): Order {
        return $this->repo->create(['customer_id' => $data->customerId, 'amount' => $data->amount]);
    }
}
```

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
