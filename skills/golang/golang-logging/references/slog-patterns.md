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
