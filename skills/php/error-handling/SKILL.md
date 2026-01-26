---
name: PHP Error Handling
description: Modern PHP error and exception handling standards.
metadata:
  labels: [php, exceptions, error-handling, psr-3]
  triggers:
    files: ['**/*.php']
    keywords: [try, catch, finally, Throwable, set_exception_handler]
---

# PHP Error Handling

## **Priority: P0 (CRITICAL)**

Modern PHP error handling using the exception hierarchy and PSR-3 logging.

## Implementation Guidelines

- **Exception-Oriented**: Prefer throwing exceptions over returning `false` or null for error conditions.
- **Throwable Interface**: Use `Throwable` when catching both Errors and Exceptions (PHP 7+).
- **Custom Exceptions**: Create domain-specific exceptions (e.g., `UserNotFoundException`) by extending `RuntimeException` or `LogicException`.
- **Granular Catching**: Use multiple `catch` blocks for specific exception types. Use multi-catch (`catch (TypeA | TypeB $e)`) where logic is identical.
- **Finally Block**: Use `finally` to ensure resource cleanup (e.g., closing file handles) regardless of success/failure.
- **Global Handler**: Set a global exception handler via `set_exception_handler` for uncaught exceptions in entry points.
- **PSR-3 Logging**: Log all critical errors and exceptions using a PSR-3 compliant logger (e.g., Monolog).

## Anti-Patterns

- **Error Suppression**: Never use the `@` operator. It hides critical bugs and hurts performance.
- **Empty Catch Blocks**: Never catch an exception without logging it or handling it.
- **Exception for Flow**: Do not use exceptions for regular application control flow.
- **Displaying Errors**: Never set `display_errors` to `On` in production; always log them instead.

## Code

```php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DatabaseException;
use Throwable;

try {
    $result = $db->query("...");
} catch (DatabaseException $e) {
    $logger->error('Database failed: ' . $e->getMessage());
    throw new ServiceUnavailableException('Service is down', 0, $e);
} catch (Throwable $e) {
    $logger->critical('Unexpected error', ['exception' => $e]);
    // Graceful fallback
} finally {
    $db->disconnect();
}
```
