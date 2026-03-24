---
name: swift-error-handling
description: "Standards for throwing functions, Result type, and Never. Use when implementing Swift error throwing, designing error hierarchies, using Result types, or adding do-catch blocks. (triggers: **/*.swift, throws, try, catch, Result, Error)"
---

# Swift Error Handling

## **Priority: P0**

## Workflow: Add Error Handling to a Swift Function

1. Define a custom error enum conforming to `Error`
2. Mark the function `throws` (or `async throws`)
3. Use `do-catch` at the call site with specific catch clauses
4. Map domain errors to user-facing messages at the presentation layer

## Implementation Guidelines

### Throwing Functions

- **Propagate Errors**: Use `throws` for recoverable errors and `async throws` for modern concurrency.
- **Do-Catch**: Handle errors close to source with specific catch clauses for each error type. Catch-all `catch` should be the last resort.
- **Error Types**: Define custom errors as enums conforming to `Error`:

```swift
enum NetworkError: Error, LocalizedError {
    case connectionLost
    case unauthorized(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .connectionLost: return "Connection lost"
        case .unauthorized(let code): return "Unauthorized (\(code))"
        }
    }
}

func fetchUser(id: String) async throws -> User {
    guard !id.isEmpty else { throw NetworkError.unauthorized(statusCode: 401) }
    // ...
}

do {
    let user = try await fetchUser(id: "123")
} catch let error as NetworkError {
    logger.error("Network error: \(error.localizedDescription)")
} catch {
    logger.error("Unexpected: \(error)")
}
```

- **Optional Try**: Use `try?` only for non-critical errors where nil is acceptable.

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
