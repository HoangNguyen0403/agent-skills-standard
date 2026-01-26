---
name: PHP Language Standards
description: Core PHP language standards and modern 8.x features.
metadata:
  labels: [php, language, 8.x]
  triggers:
    files: ['**/*.php']
    keywords: [declare, readonly, match, constructor, promotion, types]
---

# PHP Language Standards

## **Priority: P0 (CRITICAL)**

Core PHP language standards and modern 8.x features for safety and performance.

## Implementation Guidelines

- **Strict Typing**: Always declare `declare(strict_types=1);` at the top of every file.
- **Type Hinting**: Use scalar type hints (string, int, bool, float) and return types for all functions/methods.
- **Modern Types**: Leverage Union Types (`string|int`) and Intersection Types (`Iterator&Countable`).
- **Read-only Properties**: Use `readonly` for class properties that shouldn't change after initialization.
- **Constructor Promotion**: Use constructor property promotion to combine declaration and assignment.
- **Match Expressions**: Use `match` instead of verbose `switch` statements for value-based logic.
- **Named Arguments**: Use named arguments to improve readability for optional parameters.

## Anti-Patterns

- **No Type Context**: Avoid functions without return types or parameter types.
- **Sloppy Comparison**: Avoid `==` for truthiness; always use `===` for strict comparison.
- **Legacy Syntax**: Avoid `switch` for simple value mapping; avoid manual property assignment in constructors.
- **Global Scope**: Never define functions or variables in the global namespace.

## Code

```php
declare(strict_types=1);

namespace App\Core;

class UserProfile
{
    // Constructor Property Promotion + Readonly
    public function __construct(
        public readonly int $id,
        public string $username,
        private ?string $role = null,
    ) {}

    // Type Hinting & Match Expression
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
