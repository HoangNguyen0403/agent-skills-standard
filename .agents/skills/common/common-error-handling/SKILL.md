---
name: common-error-handling
description: Cross-cutting standards for error design, response shapes, error codes, and boundary placement across API, domain, and infrastructure layers. Use when defining error hierarchies, wrapping exceptions, building standardized error responses, or placing error boundaries in layered architectures.
metadata:
  triggers:
    files:
    - '**/*.service.ts'
    - '**/*.handler.ts'
    - '**/*.controller.ts'
    - '**/*.go'
    - '**/*.java'
    - '**/*.kt'
    - '**/*.py'
    keywords:
    - error handling
    - exception
    - try catch
    - error boundary
    - error response
    - error code
    - throw
---
# Error Handling Standards

## **Priority: P1 (HIGH)**

## Error Architecture

- **API Layer**: Map domain errors to HTTP responses globally using the canonical [error envelope](references/api-error-contract.md).
- **Domain Layer**: Throw pure business errors. NO HTTP status codes here.
- **Infra Layer**: Wrap 3rd-party exceptions. NOT leak raw DB errors to API.
- **Standard Shape**: APIs return `{ "error": { "code", "message", "traceId", "details" } }`.

See [implementation examples](references/implementation.md) for the standard error response shape.

## Error Mechanics

- **Wrap**: Add context that helps the caller; preserve the cause where callers must match it (`fmt.Errorf("process: %w", err)`, `new Error('msg', { cause })`). Direct propagation or boundary translation is valid when wrapping exposes internals or adds nothing.
- **Log Once**: Choose one owner per failure—the layer that handles or translates the request/job/CLI. Log there; layers beneath propagate without logging. Log-and-rethrow is duplicate when the next boundary logs again.
- **Replace**: Only when original error leaks sensitive details.
- **Error Codes**: Use `SCREAMING_SNAKE_CASE` IDs (`ORDER_PAYMENT_FAILED`).

## Anti-Patterns

- **Swallowing Errors**: Never `catch(e) {}` without logging or re-throwing.
- Never silently ignore an error: an empty catch must become an explicit log, handling branch, returned error, or rethrow.
- **Double Logging**: Do not log a failure in a helper and again at the boundary, nor log-and-rethrow into a boundary that logs again.
- **Stack Traces**: Never expose stack traces in API responses.
- **Generic 500s**: Use `400` with specific details for validation instead of 500.

## References
- [API Error Contract](references/api-error-contract.md)

## Failure-handling checklist

- Never swallow errors: do not use an empty `catch` or silently ignore a failure. Log once at the owner, wrap or propagate beneath it, or map it deliberately at the correct boundary.
