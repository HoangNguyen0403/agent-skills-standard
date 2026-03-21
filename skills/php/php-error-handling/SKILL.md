---
name: php-error-handling
description: 'Modern PHP error and exception handling standards. Use when implementing exception hierarchies, error handlers, or custom exceptions in PHP. (triggers: **/*.php, try, catch, finally, Throwable, set_exception_handler)'
---

# PHP Error Handling

## **Priority: P0 (CRITICAL)**

## Structure

```text
src/
└── Exceptions/
    ├── {Domain}Exception.php
    └── Handler.php
```

## Implementation Guidelines

- **Exception-Driven**: Favor **`throwing exceptions`** over returning `false` or `null` for error states.
- **Throwable Interface**: Always catch **`Throwable`** for both PHP 7/8 Errors and Exceptions.
- **Custom Exceptions**: Extend **`RuntimeException`** or **`LogicException`** for domain-specific errors.
- **Multi-Catch**: Use Union types in catch blocks: **`catch (DomainException | InvalidArgumentException $e)`**.
- **Global Handler**: Use **`set_exception_handler`** and **`set_error_handler`** for top-level logging and cleanup.
- **Finally**: Always use **`finally`** for resource cleanup (e.g., closing file handles, DB connections).
- **PSR-3 Logging**: Implement **`Psr\Log\LoggerInterface`** for structured error reporting.
- **Production Guard**: Ensure **`display_errors=Off`** and **`log_errors=On`** in production `php.ini`.

## Anti-Patterns

- **No `@` error suppression**: Handle or log errors explicitly.
- **No empty catch blocks**: Log or rethrow all caught exceptions.
- **No exceptions for control flow**: Reserve for unexpected errors only.
- **No `display_errors` in production**: Log to file; never show users.

## References

- [Exception & Logging Patterns](references/implementation.md)
