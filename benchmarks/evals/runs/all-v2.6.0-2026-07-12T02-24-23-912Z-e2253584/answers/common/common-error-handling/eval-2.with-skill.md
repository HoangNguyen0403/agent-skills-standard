Use explicit boundaries between HTTP, domain, and infrastructure concerns.

The domain layer should define and return pure business errors, with stable `SCREAMING_SNAKE_CASE` codes such as `USER_NOT_FOUND`, `ORDER_PAYMENT_FAILED`, or `INVALID_ORDER_STATE`. These errors must not contain HTTP status codes or HTTP-specific response details. Validation and business rules are checked here; callers receive typed or sentinel errors that can be classified with `errors.Is`/`errors.As`.

The database/repository layer should translate driver-specific failures into application-facing infrastructure or domain errors. Wrap failures with operation context using `%w`, for example `fmt.Errorf("load user %q: %w", id, err)`, while retaining the cause for logging and classification. Never leak raw Postgres or driver errors to the API. Map known conditions, such as a unique-key violation, to a safe conflict error; distinguish not-found from an unexpected database failure.

At the HTTP boundary, install one global error handler or middleware. It should classify errors and map them to responses: validation to 400 with field-oriented `details`, authentication to 401 with a generic message, not-found to 404, conflict to 409, and unexpected failures to a safe 500 response. Return a consistent envelope such as:

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "The requested user does not exist.",
    "traceId": "<request-trace-id>",
    "details": []
  }
}
```

The handler should log the original error, wrapping context, request/operation metadata, and trace ID server-side. Responses must never contain stack traces, SQL, credentials, raw driver messages, or other sensitive details. Add tests for each mapping, wrapping and cause classification, malformed input, constraint conflicts, not-found behavior, and the generic unexpected-error path. Ensure every error is logged or propagated; no empty catch equivalent or ignored return is permitted.
