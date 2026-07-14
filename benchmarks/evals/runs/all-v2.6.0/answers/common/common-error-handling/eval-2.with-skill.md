Assumption: REST/JSON API using `net/http`, with errors mapped centrally by a global HTTP handler.

### 1. Define transport-independent error types

Domain errors must contain business meaning only—never HTTP status codes.

```go
package app

import "errors"

var (
	ErrValidation = errors.New("validation failed")
	ErrNotFound   = errors.New("not found")
	ErrConflict   = errors.New("conflict")
)

type CodeError struct {
	Code    string
	Message string
	Cause   error
}

func (e *CodeError) Error() string { return e.Code + ": " + e.Message }
func (e *CodeError) Unwrap() error { return e.Cause }

func Wrap(code, message string, cause error) error {
	return &CodeError{Code: code, Message: message, Cause: cause}
}
```

Use `SCREAMING_SNAKE_CASE` codes such as:

- `ORDER_INVALID`
- `ORDER_NOT_FOUND`
- `ORDER_PAYMENT_FAILED`
- `DATABASE_UNAVAILABLE`
- `INTERNAL_ERROR`

### 2. Domain layer

Return pure business errors. Add context with `%w` when useful.

```go
func (s *OrderService) Pay(ctx context.Context, orderID string) error {
	order, err := s.orders.Find(ctx, orderID)
	if err != nil {
		return fmt.Errorf("pay order %s: %w", orderID, err)
	}

	if order.Status != Pending {
		return app.Wrap(
			"ORDER_INVALID",
			"only pending orders can be paid",
			app.ErrConflict,
		)
	}

	if err := s.payments.Charge(ctx, order.Total); err != nil {
		return app.Wrap(
			"ORDER_PAYMENT_FAILED",
			"payment could not be completed",
			err,
		)
	}

	return nil
}
```

The domain should not import `net/http` or return `http.StatusBadRequest`.

### 3. Infrastructure/database layer

Wrap database and third-party errors so raw driver errors never leak to the API.

```go
func (r *OrderRepository) Find(ctx context.Context, id string) (*Order, error) {
	order, err := r.db.QueryOrder(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, app.Wrap(
				"ORDER_NOT_FOUND",
				"order was not found",
				app.ErrNotFound,
			)
		}

		return nil, app.Wrap(
			"DATABASE_UNAVAILABLE",
			"order storage is unavailable",
			fmt.Errorf("query order: %w", err),
		)
	}

	return order, nil
}
```

Use `fmt.Errorf("process: %w", err)` or equivalent wrapping to preserve `errors.Is`/`errors.As` behavior. Replace the original error when it could expose sensitive SQL, credentials, schema, or infrastructure details.

### 4. Standard API error envelope

Every error response should use one JSON shape:

```json
{
  "error": {
    "code": "ORDER_INVALID",
    "message": "only pending orders can be paid",
    "details": null,
    "request_id": "req_123"
  }
}
```

Never serialize `Cause`, database errors, or stack traces.

### 5. Global HTTP mapping

Map errors at the API boundary:

```go
func writeError(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusInternalServerError
	code := "INTERNAL_ERROR"
	message := "an unexpected error occurred"
	var details any

	var coded *app.CodeError
	if errors.As(err, &coded) {
		code = coded.Code
		message = coded.Message

		switch {
		case errors.Is(err, app.ErrValidation):
			status = http.StatusBadRequest
		case errors.Is(err, app.ErrNotFound):
			status = http.StatusNotFound
		case errors.Is(err, app.ErrConflict):
			status = http.StatusConflict
		case coded.Code == "DATABASE_UNAVAILABLE":
			status = http.StatusServiceUnavailable
		}
	}

	log.Error("request failed",
		"request_id", requestID(r.Context()),
		"error", err,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(struct {
		Error struct {
			Code      string `json:"code"`
			Message   string `json:"message"`
			Details   any    `json:"details"`
			RequestID string `json:"request_id"`
		} `json:"error"`
	}{
		Error: struct {
			Code      string `json:"code"`
			Message   string `json:"message"`
			Details   any    `json:"details"`
			RequestID string `json:"request_id"`
		}{
			Code:      code,
			Message:   message,
			Details:   details,
			RequestID: requestID(r.Context()),
		},
	})
}
```

Handlers should delegate failures to this mapper:

```go
if err := service.Pay(r.Context(), orderID); err != nil {
	writeError(w, r, err)
	return
}
```

Validation failures must map to `400` with specific details, never an undifferentiated `500`.

### Boundary rules

- Never swallow errors or use an empty `catch` equivalent; in Go, every ignored error must be deliberate.
- Log, wrap, rethrow, or map each failure at the appropriate boundary.
- Log detailed causes internally with a request ID.
- Return stable public codes and messages.
- Never expose stack traces or raw database errors in API responses.
