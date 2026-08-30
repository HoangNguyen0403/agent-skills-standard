---
name: golang-logging
description: Standards for structured logging and observability in Golang. Use when adding structured logging or tracing to Go services.
metadata:
  triggers:
    files:
    - 'go.mod'
    - 'pkg/logger/**'
    keywords:
    - logging
    - slog
    - structured logging
    - zap
---
# Golang Logging Standards

## **Priority: P1 (HIGH)**

## Principles

- **Structured Logging**: Use JSON or structured key-value attributes. Machine-readable and filterable.
- **Strict Single-Log Boundary**: Log errors once where they are handled or translated at the boundary (service or handler level). **Never double-log** in repository, utility, or deep helper functions—wrap and return errors instead.
- **Typed Context Keys**: Always use private typed keys (`type ctxKey string`) for storing and retrieving request-scoped logger attributes.
- **Business Traceability vs PII Redaction**: Include non-sensitive business identifiers (e.g. tenant ID, organization code, order number) for traceability. Strictly redact credentials, API tokens, passwords, and sensitive PII.
- **Leveled Logging**: Debug, Info, Warn, Error.
- **No `log.Fatal`**: Avoid terminating apps inside libraries. Return errors instead; only `main()` should handle process exit.

## Libraries

- **`log/slog` (Recommended Stdlib)**: Stdlib since Go 1.21. Fast, structured, zero-dep.
- **Zap (`uber-go/zap`)**: Production-grade structured logger for high-throughput microservices.
- **Zerolog**: Zero allocation, fast JSON logger.

## Workflow: Set Up Structured Logging

1. Initialize structured logger at startup in `main()` with standard JSON output.
2. Inject request correlation IDs (TraceID, RequestID) via middleware using typed context keys.
3. Pass logger via context (`logger.FromContext(ctx)`) or constructor injection.
4. Log at the application boundary on error; wrap errors upstream without intermediate logging.

See [slog setup and usage examples](references/slog-patterns.md)

## Anti-Patterns

- **No Double-Logging**: Do not log an error in the repository/database helper AND log it again in the service/handler.
- **No fmt.Println in production**: Use structured, leveled loggers.
- **No Untyped Context Keys**: Avoid `context.WithValue(ctx, "logger", l)` with raw string keys.
- **No Secrets in Logs**: Redact bearer tokens, passwords, and sensitive personal info.
- **No log.Fatal in libraries**: Return errors; only `main()` should call `os.Exit`.

## References

- [Slog Patterns](references/slog-patterns.md)