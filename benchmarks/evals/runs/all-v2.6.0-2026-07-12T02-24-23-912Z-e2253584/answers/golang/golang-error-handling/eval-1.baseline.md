Use error wrapping with `%w`:

```go
if err != nil {
    return fmt.Errorf("loading config: %w", err)
}
```

That preserves the original error so callers can still inspect it with `errors.Is` or `errors.As`.

Example:

```go
if errors.Is(err, os.ErrNotExist) {
    // handle missing file
}
```

