---
name: Swift Error Handling
description: Standards for Throwing Functions, Result Type, and Never
metadata:
  labels: [swift, errors, throws, result]
  triggers:
    files: ['**/*.swift']
    keywords: ['throws', 'try', 'catch', 'Result', 'Error']
---

# Swift Error Handling

## **Priority: P0**

## Implementation Guidelines

### Throwing Functions

- **Propagate Errors**: Use `throws` for recoverable errors.
- **Do-Catch**: Handle errors close to source with specific catch blocks.
- **Error Types**: Define custom errors as enums conforming to `Error`.

### Result Type

- **Async Alternatives**: Use `Result<Success, Failure>` for callback-based APIs.
- **Transformations**: Use `.map()`, `.flatMap()` for functional composition.
- **Conversion**: Use `.get()` to convert `Result` to throwing.

### Never Type

- **Fatalisms**: Use `Never` return type for functions that never return.
- **Preconditions**: `fatalError()`, `preconditionFailure()` for programmer errors.

## Anti-Patterns

- **Force Try**: `**No try!**: Use try? or do-catch.`
- **Silent Failures**: `**No try? without nil check**: Handle or log.`
- **String Errors**: `**No Error(message)**: Use typed errors.`

## References

- [Error Types & Result](references/implementation.md)
