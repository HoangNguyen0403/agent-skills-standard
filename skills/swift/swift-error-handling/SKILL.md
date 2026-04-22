---
name: swift-error-handling
description: Standards for throwing functions, Result type, and Never. Use when implementing Swift error throwing, designing error hierarchies, using Result types, or adding do-catch blocks.
metadata:
  triggers:
    files:
    - '**/*.swift'
    keywords:
    - throws
    - try
    - catch
    - Result
    - Error
---
# Swift Error Handling

## **Priority: P0**

## Workflow: Add Error Handling to Swift Function

1. Define custom error enum conforming to `Error`
2. Mark function `throws` (or `async throws`)
3. Use `do-catch` at call site with specific catch clauses
4. Map domain errors to user-facing messages at presentation layer

## Implementation Guidelines

### Throwing Functions

- **Propagate Errors**: Use `throws` for recoverable errors and `async throws` for modern concurrency.
- **Do-Catch**: Handle close to source; specific catch clauses per error type. Catch-all `catch`: last resort.
- **Error Types**: Define custom errors as enums conforming to `Error`:

See [implementation examples](references/implementation.md) for custom error enums, do-catch patterns, and Result type usage.

- **Optional Try**: Use `try?` only for non-critical errors where nil acceptable.

### Result Type

- **Async Alternatives**: Use `throws` for synchronous code. Use `Result` for callbacks and non-async deferred error states.
- **Transformations**: Use `.map()`, `.flatMap()` for functional composition.
- **Conversion**: Use `.get()` to convert `Result` to throwing for use in `try-catch`.

### Never Type & Preconditions

- **Fatalisms**: Use `Never` return type only for unrecoverable crash scenarios or to indicate unreachable code. Never for expected errors.
- **Preconditions**: Use `precondition()`, `assert()`, and `fatalError()` for programmer errors. Use `assertionFailure()` for debug-only checks.

## Anti-Patterns

- **No try!**: Use `try?` or `do-catch`.
- **No try? without nil check**: Handle or log.
- **No Error(message)**: Use typed errors.

## References

- [Error Types & Result](references/implementation.md)
