---
name: php-error-handling
description: "Modern PHP error and exception handling standards. Use when implementing exception hierarchies, error handlers, or custom exceptions in PHP. (triggers: **/*.php, try, catch, finally, Throwable, set_exception_handler)"
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

- **Exception-Driven**: Prefer throwing exceptions over returning `false`.
- **Throwable Interface**: Catch `Throwable` for both Errors and Exceptions.
- **Custom Exceptions**: Extend `RuntimeException` for domain-specific errors.
- **Multi-catch**: Use `catch (TypeA | TypeB $e)` for identical handling.
- **Finally Cleanup**: Use `finally` to ensure resource release.
- **Global Handling**: Set `set_exception_handler` in entry points.
- **PSR-3 Logging**: Log critical faults using standard loggers.

## Anti-Patterns

- **No `@` error suppression**: Handle or log errors explicitly.
- **No empty catch blocks**: Log or rethrow all caught exceptions.
- **No exceptions for control flow**: Reserve for unexpected errors only.
- **No `display_errors` in production**: Log to file; never show users.

## References

- [Exception & Logging Patterns](references/implementation.md)
