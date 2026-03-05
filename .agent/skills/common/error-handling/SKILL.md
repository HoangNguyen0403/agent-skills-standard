---
name: Common Error Handling
description: Cross-cutting standards for error design, response shapes, error codes, and boundary placement. Use when handling errors, designing exception flows, or standardizing error responses.
metadata:
  labels: [error-handling, exceptions, resilience, api-errors]
  triggers:
    files:
      [
        '**/*.service.ts',
        '**/*.handler.ts',
        '**/*.controller.ts',
        '**/*.go',
        '**/*.java',
        '**/*.kt',
        '**/*.py',
      ]
    keywords:
      [
        'error handling',
        exception,
        'try catch',
        'error boundary',
        'error response',
        'error code',
        throw,
        Result,
      ]
---

# Common Error Handling Standards

## **Priority: P1 (OPERATIONAL)**

Consistent, predictable error handling is the backbone of maintainable systems. Errors are first-class citizens — design them explicitly.

## 🏗 Error Response Shape (HTTP APIs)

All API errors MUST use a consistent envelope:

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "The requested user does not exist.",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "details": []
  }
}
```

| Field     | Rule                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| `code`    | SCREAMING_SNAKE_CASE machine-readable code. Never localize.                       |
| `message` | Human-readable English summary. Safe for end-users (no stack traces).             |
| `traceId` | Correlation ID from the request context.                                          |
| `details` | Optional array of field-level validation errors. Empty for non-validation errors. |

## 🗂 Error Classification

| Layer          | Error Type                  | Strategy                                 |
| -------------- | --------------------------- | ---------------------------------------- |
| Validation     | `400 Bad Request`           | Return `details[]` with field paths      |
| Authentication | `401 Unauthorized`          | Generic message — never expose reason    |
| Authorization  | `403 Forbidden`             | Log attempt, never expose role info      |
| Not Found      | `404 Not Found`             | Distinguishable from auth errors         |
| Conflict       | `409 Conflict`              | Include conflicting resource ID          |
| Unhandled      | `500 Internal Server Error` | Log full context, return generic message |

## 📦 Error Wrapping vs Replacement

- **Wrap** when adding context: `fmt.Errorf("processOrder: %w", err)` (Go) / `new ServiceError('msg', { cause: err })` (JS).
- **Replace** only when the original error leaks sensitive internal details.
- **Never swallow**: Catch without logging or re-throwing hides bugs — forbidden.

## 🛡 Boundary Placement

- **API Layer**: Translate domain/infrastructure errors into HTTP responses. Use a global exception filter/middleware.
- **Domain Layer**: Throw domain-specific errors (e.g., `InsufficientStockError`). Never reference HTTP status codes.
- **Infrastructure Layer**: Throw infrastructure errors (e.g., `DatabaseConnectionError`). Wrap 3rd party exceptions.
- **Never**: Let infrastructure errors (raw DB/network exceptions) bubble up to the API response.

```
Request → [API Layer: maps to HTTP] → [Domain: business errors] → [Infra: DB/network errors]
```

## 🔢 Error Code Design

- Codes are **permanent IDs** — treat them like API contracts. Once published, never rename.
- Format: `<DOMAIN>_<NOUN>_<VERB>` → `ORDER_PAYMENT_FAILED`, `USER_EMAIL_DUPLICATE`.
- Define in a centralized constants file; never inline magic strings.

## Anti-Patterns

- **No `catch(e) {}`**: Always log or re-throw.
- **No stack traces in responses**: Leak internal structure to attackers.
- **No generic `500` for validation**: Use `400` with `details`.
- **No HTTP status codes in domain layer**: Domain errors are business concepts, not transport decisions.
- **No error-code proliferation**: Prefer a small, well-documented set over one code per exception class.
