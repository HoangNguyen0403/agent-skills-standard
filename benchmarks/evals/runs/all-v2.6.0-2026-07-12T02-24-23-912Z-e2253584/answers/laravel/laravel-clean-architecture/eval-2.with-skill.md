Use a typed immutable DTO at the boundary between HTTP and the use case:

```php
namespace App\Domains\Order\DTOs;

readonly class CreateOrderData
{
    public function __construct(
        public int $userId,
        public array $lines,
    ) {}
}
```

Create the DTO from `$request->validated()`, then pass it to a focused Action. DTOs make the contract explicit and prevent raw arrays or mutable Eloquent models from becoming the cross-layer API. For PHP 8.2, prefer a `readonly class`; for PHP 8.1, use readonly properties. Keep the DTO in a domain folder such as `app/Domains/Order/DTOs/`, and validate before construction.

