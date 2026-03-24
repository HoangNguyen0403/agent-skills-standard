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

Extract TraceID from context and add to logs.

```go
func (h *Handler) Handle(ctx context.Context) {
    // Assuming context has values
    logger := slog.With("trace_id", ctx.Value("trace_id"))

    logger.Info("Processing request", "user_id", 123)
}
```

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
        slog.String("traceId", r.Header.Get("X-Request-Id")),
        slog.String("method", r.Method),
        slog.String("path", r.URL.Path),
    )
    reqLog.Info("handling request")
}
```
