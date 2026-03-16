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
