---
name: php-error-handling
description: Implement modern PHP error and exception handling patterns. Use when implementing exception hierarchies, error handlers, or custom exceptions in PHP.
metadata:
  triggers:
    files:
    - '**/*.php'
    keywords:
    - try
    - catch
    - finally
    - Throwable
    - set_exception_handler
---
# PHP Error Handling

## **Priority: P0 (CRITICAL)**

## Structure

See [implementation examples](references/implementation.md#directory-structure) for directory layout.

## Build Exception Hierarchies

- **Exception-Driven**: Favor **`throwing exceptions`** over returning `false` or `null` for error states.
- **Custom Exceptions**: Extend **`RuntimeException`** or **`LogicException`** for domain-specific errors.
- **Multi-Catch**: Use Union types in catch blocks: **`catch (DomainException | InvalidArgumentException $e)`**.

See [implementation examples](references/implementation.md#exception-hierarchy-example) for domain exception hierarchy with multi-catch and finally.

## Configure Global Error Handling

- **Throwable Interface**: Always catch **`Throwable`** for both PHP 7/8 Errors and Exceptions.
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