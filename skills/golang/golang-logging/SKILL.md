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
- **One Log Owner**: Each request, job, or CLI invocation has exactly one boundary that logs its failures—usually where the error is handled or translated. Choose it by responsibility, not a fixed layer. Deeper helpers wrap and return without logging.
- **Typed Context Keys**: Use a private typed key (`type ctxKey string`) and an accessor for both storing and reading request-scoped values. Never mix string and typed keys for the same value.
- **Context-Aware Logging**: Pass `ctx` to `InfoContext`/`ErrorContext`/`WarnContext`. Context alone does not add attributes unless the handler is built to read them; attach correlation IDs with `slog.With` from the typed accessor.
- **Business Traceability vs PII Redaction**: Include only approved non-sensitive identifiers (e.g. tenant ID, organization code, order number). Strictly redact credentials, API tokens, passwords, and sensitive PII. Free-form and joined error text is not automatically scrubbed.
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
4. Log once at the chosen owner; wrap errors in helpers without intermediate logging.

See [slog setup and usage examples](references/slog-patterns.md)

## Anti-Patterns

- **No Double-Logging**: Do not log an error in a repository/database helper AND log it again at the owner.
- **No log-and-rethrow into another logger**: If a boundary logs, do not pass the same failure to a layer that logs it again.
- **No fmt.Println in production**: Use structured, leveled loggers.
- **No Untyped Context Keys**: Avoid `context.WithValue(ctx, "logger", l)` and `ctx.Value("trace_id")` with raw string keys.
- **No Secrets in Logs**: Redact bearer tokens, passwords, and sensitive personal info.
- **No log.Fatal in libraries**: Return errors; only `main()` should call `os.Exit`.

## References

- [Slog Patterns](references/slog-patterns.md)