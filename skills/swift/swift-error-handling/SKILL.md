---
name: swift-error-handling
description: 'Standards for Throwing Functions, Result Type, and Never. Use when implementing Swift error throwing, Result<T,E>, or designing error hierarchies. (triggers: **/*.swift, throws, try, catch, Result, Error)'
---

# Swift Error Handling

## **Priority: P0**

## Implementation Guidelines

### Throwing Functions

- **Propagate Errors**: Use **`throws`** for recoverable errors and **`async throws`** for modern concurrency.
- **Do-Catch**: Handle errors close to source with specific catch clauses for each error type. Catch-all `catch` should be the last resort.
- **Error Types**: Define custom errors as `enum` conforming to Error (e.g., `enum NetworkError: Error { case connectionLost }`) for user-facing descriptions.
- **Optional Try**: Use **`try?`** only for non-critical errors.

### Result Type

- **Async Alternatives**: Use throws for synchronous code. Use Result for callbacks and non-async deferred error states.
- **Transformations**: Use **`.map()`**, **`.flatMap()`** for functional composition.
- **Conversion**: Use **`.get()`** to convert `Result` to throwing for use in `try-catch`.

### Never Type & Preconditions

- **Fatalisms**: Use `Never` return type only for unrecoverable crash scenarios or to indicate unreachable code. Never for expected errors.
- **Preconditions**: Use **`precondition()`**, **`assert()`**, and **`fatalError()`** for programmer errors. Use **`assertionFailure()`** for debug-only checks.

## Anti-Patterns

- **No try!**: Use try? or do-catch.
- **No try? without nil check**: Handle or log.
- **No Error(message)**: Use typed errors.

## References

- [Error Types & Result](references/implementation.md)
