---
name: common-error-handling
description: "Cross-cutting standards for error design, response shapes, error codes, and boundary placement. (triggers: **/*.service.ts, **/*.handler.ts, **/*.controller.ts, **/*.go, **/*.java, **/*.kt, **/*.py, error handling, exception, try catch, error boundary, error response, error code, throw)"
---

# Error Handling Standards

## **Priority: P1 (OPERATIONAL)**

## 🏗 Error Architecture

- **API Layer**: Map domain errors to HTTP responses globally.
- **Domain Layer**: Throw pure business errors. NO HTTP status codes here.
- **Infra Layer**: Wrap 3rd-party exceptions. Do NOT leak raw DB errors to API.
- **Standard Shape**: APIs must return a standardized JSON envelope (`code`, `message`, `traceId`).

## 📦 Error Mechanics

- **Wrap**: Add context (`fmt.Errorf("process: %w", err)`, `new Error('msg', { cause })`).
- **Replace**: Only when original error leaks sensitive details.
- **Error Codes**: Use `SCREAMING_SNAKE_CASE` IDs (`ORDER_PAYMENT_FAILED`).

## 🚫 Anti-Patterns

- **Swallowing Errors**: Never `catch(e) {}` without logging or re-throwing.
- **Stack Traces**: Never expose stack traces in API responses.
- **Generic 500s**: Use `400` with specific details for validation instead of 500.

## References
- [API Error Contract](references/api-error-contract.md)
