Use a single typed error model across layers, with translation at boundaries.

```go
type Kind string

const (
    KindInvalid   Kind = "invalid"
    KindNotFound   Kind = "not_found"
    KindConflict   Kind = "conflict"
    KindUnauthorized Kind = "unauthorized"
    KindForbidden  Kind = "forbidden"
    KindInternal   Kind = "internal"
)

type AppError struct {
    Kind    Kind
    Message string // safe for clients
    Err     error  // underlying cause
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.Err }
```

Database access should return infrastructure-specific errors, wrapped with operation context:

```go
return fmt.Errorf("get user %q: %w", id, err)
```

The repository layer should translate known database conditions where appropriate:

- `sql.ErrNoRows` → `AppError{Kind: KindNotFound}`
- unique-key violation → `KindConflict`
- timeout/cancellation → preserve `context.DeadlineExceeded` or `context.Canceled`
- connection, syntax, or unexpected driver errors → internal error

Domain logic should enforce business invariants and return typed domain errors. It should not know about HTTP status codes, JSON, or database driver types.

```go
if order.Status == "completed" {
    return &AppError{
        Kind:    KindConflict,
        Message: "order is already completed",
    }
}
```

Wrap errors while preserving their identity:

```go
if err := repo.Save(ctx, order); err != nil {
    return fmt.Errorf("complete order: %w", err)
}
```

The HTTP handler should classify errors with `errors.As`/`errors.Is`, log the underlying error, and expose only safe messages:

```go
func writeError(w http.ResponseWriter, err error) {
    var appErr *AppError
    status := http.StatusInternalServerError
    message := "internal server error"

    if errors.As(err, &appErr) {
        message = appErr.Message

        switch appErr.Kind {
        case KindInvalid:
            status = http.StatusBadRequest
        case KindUnauthorized:
            status = http.StatusUnauthorized
        case KindForbidden:
            status = http.StatusForbidden
        case KindNotFound:
            status = http.StatusNotFound
        case KindConflict:
            status = http.StatusConflict
        }
    } else if errors.Is(err, context.Canceled) {
        return
    } else if errors.Is(err, context.DeadlineExceeded) {
        status = http.StatusGatewayTimeout
        message = "request timed out"
    }

    log.Error("request failed", "err", err)
    writeJSON(w, status, map[string]any{
        "error": map[string]string{
            "message": message,
        },
    })
}
```

Additional rules:

- Pass `context.Context` through every layer and stop work after cancellation.
- Log errors once at the HTTP or worker boundary, including request ID, operation, and relevant identifiers.
- Never log passwords, tokens, payment data, or full sensitive payloads.
- Use structured logs and preserve the original error via `%w`.
- Do not use string matching to classify errors.
- Avoid returning raw database errors or stack traces to clients.
- Define retry behavior explicitly: retry transient database/network failures only when the operation is safe or idempotent, with bounded backoff.
- Roll back transactions on every failure and commit only after all domain validation succeeds.
- Add tests for each error mapping, wrapping behavior, context cancellation, transaction rollback, and unexpected-error sanitization.
