# Laravel Clean Architecture Reference

## Domain-Driven Design (DDD) Structure

```text
app/
└── Domains/
    └── User/
        ├── Actions/        # Business logic
        ├── DTOs/           # Data Transfer Objects
        ├── Events/
        ├── Listeners/
        ├── Models/
        └── Repositories/   # Data access abstraction
```

## Data Transfer Objects (DTOs)

```php
// app/Domains/User/DTOs/UserRegistrationData.php
readonly class UserRegistrationData {
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
    ) {}

    public static function fromRequest(Request $request): self {
        return new self(...$request->validated());
    }
}
```

## Dependency Inversion (Repository Pattern)

```php
// app/Providers/RepositoryServiceProvider.php
public function register(): void {
    $this->app->bind(
        \App\Domains\User\Contracts\UserRepositoryInterface::class,
        \App\Domains\User\Repositories\EloquentUserRepository::class
    );
}
```

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

## Domain Structure

```text
app/
├── Domains/            # Logic grouped by business domain
│   └── {Domain}/
│       ├── Actions/    # Single use-case logic
│       ├── DTOs/       # Immutable data structures
│       └── Contracts/  # Interfaces for decoupling
└── Providers/          # Dependency bindings
```
