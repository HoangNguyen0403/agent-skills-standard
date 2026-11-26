# Slog Patterns

## Basic Usage

```go
import "log/slog"

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    slog.SetDefault(logger)

    slog.Info("Starting server",
        "port", 8080,
        "env", "production",
    )
}
```

## Contextual Logging

Store request values with a private typed key and read them with the same accessor.

```go
type ctxKey string

const traceIDKey ctxKey = "trace_id"

func WithTraceID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, traceIDKey, id)
}

func TraceID(ctx context.Context) string {
    id, _ := ctx.Value(traceIDKey).(string)
    return id
}

func (h *Handler) Handle(ctx context.Context) {
    logger := slog.With("trace_id", TraceID(ctx))
    logger.InfoContext(ctx, "processing request", "user_id", 123)
}
```

Passing `ctx` to `InfoContext` does not add attributes by itself; handlers ignore context unless they are built to read these typed values. See [Custom Handler](#custom-handler) for that path.

## Custom Handler

To automatically add attributes from Context to every log: implement `slog.Handler`.

## slog Setup and Per-Request Logging

```go
package main

import (
    "log/slog"
    "net/http"
    "os"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
    slog.SetDefault(logger)

    slog.Info("server starting", slog.String("port", "8080"))
}

// Per-request logging with correlation ID
func handler(w http.ResponseWriter, r *http.Request) {
    reqLog := slog.With(
        slog.String("trace_id", r.Header.Get("X-Request-Id")),
        slog.String("method", r.Method),
        slog.String("path", r.URL.Path),
    )
    reqLog.Info("handling request")
}
```
