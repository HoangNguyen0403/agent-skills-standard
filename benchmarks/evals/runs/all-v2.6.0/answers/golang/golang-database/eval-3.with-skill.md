Use `db.QueryContext()` in a Go repository.

Why:
- It accepts `context.Context`, so request deadlines, cancellation, and tracing propagate into the DB call.
- It prevents queries from ignoring timeout/cancel signals.
- It matches good repository design where every query path is context-aware.

Typical pattern:

```go
rows, err := db.QueryContext(ctx, query, args...)
if err != nil {
    return nil, err
}
defer rows.Close()
```

Also check `rows.Err()` after iteration.

Use plain `db.Query()` only if you truly have no context to propagate, which is usually not what you want in application code.

