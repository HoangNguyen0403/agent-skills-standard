Use `fmt.Errorf` with `%w`:

```go
if err != nil {
    return fmt.Errorf("failed to load config: %w", err)
}
```

That adds context while preserving the original error in the chain, so callers can still do:

```go
if errors.Is(err, os.ErrNotExist) {
    // handle missing file
}

var pathErr *os.PathError
if errors.As(err, &pathErr) {
    // handle typed error
}
```

Use `%w` when wrapping. If you use `%v` or `%s`, callers cannot reliably check the original error with `errors.Is` or `errors.As`.

