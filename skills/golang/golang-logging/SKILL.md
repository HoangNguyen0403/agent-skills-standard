---
name: golang-logging
description: "Standards for structured logging and observability in Golang. Use when adding structured logging or tracing to Go services. (triggers: go.mod, pkg/logger/**, logging, slog, structured logging, zap)"
---

# Golang Logging Standards

## **Priority: P1 (STANDARD)**

## Principles

- **Structured Logging**: Use JSON or structured text. Readable by machines and humans.
- **Leveled Logging**: Debug, Info, Warn, Error.
- **Contextual**: Include correlation IDs (TraceID, RequestID) in logs.
- **No `log.Fatal`**: Avoid terminating app inside libraries. Return error instead. Only `main` should exit.

## Libraries

- **`log/slog` (Recommended)**: Stdlib since Go 1.21. Fast, structured, zero-dep.
- **Zap (`uber-go/zap`)**: High performance, good if pre-1.21 or extreme throughput needed.
- **Zerolog**: Zero allocation, fast JSON logger.

## Workflow: Set Up Structured Logging with slog

1. Create a JSON handler at startup in `main()`
2. Optionally wrap in middleware to inject request-scoped attributes
3. Use `slog.With()` to add correlation IDs per request
4. Pass logger via context or dependency injection

### Example: slog Setup and Usage

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

## References

- [Slog Patterns](references/slog-patterns.md)

## Anti-Patterns

- **No fmt.Println in production**: Use slog or zap for structured, leveled logging.
- **No log.Fatal in libraries**: Return errors; only main() should call os.Exit.
- **No unstructured log strings**: Include correlation IDs and structured fields via slog.Attr.
