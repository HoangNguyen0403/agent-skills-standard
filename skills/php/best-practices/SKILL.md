---
name: PHP Best Practices
description: PHP best practices, PSR standards, and code quality guidelines.
metadata:
  labels: [php, psr, best-practices]
  triggers:
    files: ['**/*.php']
    keywords: [psr-12, camelCase, PascalCase, dry, solid]
---

# PHP Best Practices

## **Priority: P1 (HIGH)**

PHP best practices, PSR standards, and code quality guidelines for maintainable code.

## Implementation Guidelines

- **PSR-12**: Strictly follow PSR-12 for coding style (indentation, braces, spacing).
- **Autoloading**: Use PSR-4 for class autoloading via Composer.
- **Namespacing**: Organize code into logical namespaces reflecting the directory structure.
- **PascalCase Classes**: Use `PascalCase` for all class names (e.g., `UserRepository`).
- **camelCase Methods**: Use `camelCase` for methods and variables (e.g., `getUserData`).
- **SNAKE_CASE Constants**: Use `SNAKE_CASE` for class constants (e.g., `MAX_RETRIES`).
- **DRY Principle**: Extract repetitive logic into reusable methods or traits.
- **Solid Design**: Use interfaces to decouple dependencies and follow SRP.

## Anti-Patterns

- **God Classes**: Avoid classes that do too much (violation of SRP).
- **Magic Numbers**: Avoid hardcoding values; use class constants.
- **Deep Nesting**: Avoid `if/else` nesting deeper than 3 levels; use guard clauses.
- **Direct Output**: Never `echo` or `print` directly within business logic.

## Code

```php
declare(strict_types=1);

namespace App\Services;

use App\Interfaces\LoggerInterface;

class NotificationService
{
    private const NOTIFICATION_LIMIT = 5;

    public function __construct(
        private LoggerInterface $logger,
    ) {}

    public function sendBatch(array $users): void
    {
        if (count($users) > self::NOTIFICATION_LIMIT) {
            $this->logger->warn('Batch size exceeded');
        }
        // ... implementation
    }
}
```
