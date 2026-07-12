Use structured logs with key-value fields instead of free-form strings.

In a Go HTTP service, a common approach is:

- Pick a structured logger such as `log/slog`, `zap`, or `zerolog`
- Add request-scoped fields like:
  - `request_id`
  - `method`
  - `path`
  - `status`
  - `duration_ms`
  - `remote_addr`
- Log in JSON so logs are easy to search and aggregate
- Pass the logger through context or inject it into handlers/services
- Keep a consistent field naming convention across the service
- Log errors with both the message and structured error context

Example with `log/slog`:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        rw := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
        next.ServeHTTP(rw, r)

        logger.Info("request completed",
            "method", r.Method,
            "path", r.URL.Path,
            "status", rw.status,
            "duration_ms", time.Since(start).Milliseconds(),
        )
    })
}
```

You’ll also want to:

- Generate or propagate a request ID
- Avoid logging secrets or sensitive payloads
- Use log levels (`Debug`, `Info`, `Warn`, `Error`) consistently
- Sample very noisy logs if traffic is high

If you want, I can also show a production-ready middleware example with request IDs and error logging.

