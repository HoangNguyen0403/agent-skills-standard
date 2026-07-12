PHP 8.2+ supports readonly classes. A readonly DTO makes all declared instance properties typed and immutable after construction:

```php
final readonly class MoneyData
{
    public function __construct(
        public int $cents,
        public string $currency,
    ) {}
}
```

Use `public readonly` properties instead when only selected properties need immutability. A readonly class cannot declare non-readonly properties or be extended by a non-readonly class, and its object properties still require care because referenced objects can have mutable internal state. Validate input before construction and do not use a readonly DTO as a substitute for domain invariants.

