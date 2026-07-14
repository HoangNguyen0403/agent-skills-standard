Use Go's `log/slog` for structured logging.

Set it up once in `main()` with a JSON handler, then inject a logger into your HTTP server and middleware. For each request, attach contextual fields like `request_id`, `trace_id`, `method`, `path`, and `status` so logs are machine-readable and easy to filter.

Prefer leveled logs:
- `Debug` for detailed diagnostics
- `Info` for normal request lifecycle events
- `Warn` for unusual but recoverable conditions
- `Error` for failures

Example pattern:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        reqID := r.Header.Get("X-Request-ID")
        traceID := r.Header.Get("X-Trace-ID")

        reqLogger := logger.With(
            slog.String("request_id", reqID),
            slog.String("trace_id", traceID),
            slog.String("method", r.Method),
            slog.String("path", r.URL.Path),
        )

        ctx := context.WithValue(r.Context(), loggerKey{}, reqLogger)
        reqLogger.Info("request started")
        next.ServeHTTP(w, r.WithContext(ctx))
        reqLogger.Info("request completed")
    })
}
```

Avoid `fmt.Println` and unstructured strings in production. Also avoid `log.Fatal` inside libraries or handlers; return errors upward and let only `main()` decide whether to exit.

