# PHP Language Standards Refence

## Modern PHP 8.x Patterns

### Constructor Property Promotion & Readonly

```php
declare(strict_types=1);

namespace App\Core;

class UserProfile
{
    // Promotion combines declaration, typing, and assignment
    public function __construct(
        public readonly int $id,
        public string $username,
        private ?string $role = null,
    ) {}

    // Match expression for exhaustive value mapping
    public function getPermissions(): array
    {
        return match ($this->role) {
            'admin' => ['all'],
            'editor' => ['edit', 'publish'],
            default => ['read'],
        };
    }
}
```

### Type Safety & Union Types

```php
public function process(string|int $input): string&Countable
{
    // ... logic
}
```
