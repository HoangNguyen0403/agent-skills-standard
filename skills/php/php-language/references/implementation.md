# PHP Language Standards Reference

## Modern PHP 8.x Patterns

### Constructor Property Promotion & Readonly

```php
<?php

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

`readonly` (8.1+) blocks ordinary writes after initialization; it does not restrict initialization to the constructor signature. 8.1–8.3 allow the initializing write only from the declaring class, 8.4+ from child classes (`protected(set)`), and 8.6 allows a declaration default.

### Union Types (8.0)

```php
public function find(string|int $id): ?User
{
    return is_int($id)
        ? $this->repository->findByKey($id)
        : $this->repository->findByUuid($id);
}
```

### Intersection Types (8.1)

Only class and interface types may be intersected; scalar types such as `string&Countable` are a compile-time error.

```php
<?php

declare(strict_types=1);

namespace App\Core;

class Report
{
    /** @param \Countable&\Traversable<int, string> $items */
    public function joinLabels(\Countable&\Traversable $items): string
    {
        $labels = [];

        foreach ($items as $item) {
            $labels[] = $item;
        }

        if (count($items) !== count($labels)) {
            throw new \LengthException('Countable and Traversable disagree');
        }

        return implode(',', $labels);
    }
}

// \ArrayObject implements both \Countable and \Traversable.
$items = new \ArrayObject(['a', 'b']);
echo (new Report())->joinLabels($items); // a,b
```

### DNF Types (8.2)

Combine union and intersection only with parentheses:

```php
<?php

declare(strict_types=1);

function labelCount((\Countable&\Traversable)|null $items): int
{
    return $items === null ? 0 : count($items);
}
```
