# Wrapping, Joining and Matching Errors

`%w`, `errors.Is` and `errors.As` require Go 1.13+. Later sections note their own version gates.

## Decide: wrap, return, or translate

| Situation | Action |
| --- | --- |
| Caller needs more context and may still match the cause | `fmt.Errorf("read config: %w", err)` |
| Exact sentinel/type is the caller contract | `return err` unchanged |
| Boundary crossed and internal identity must stay hidden | Translate to a domain error; log the original once at the owner |
| Wrapping adds no information (`failed: %w`) | Return the error as-is |

`%v` renders the same message but discards the chain; it neither hides nor redacts content. Build a safe client message separately from the internal error.

```go
func ReadConfig(path string) error {
    f, err := os.Open(path)
    if err != nil {
        // Preserve os.ErrNotExist for callers; add the path they need.
        return fmt.Errorf("open config %s: %w", path, err)
    }
    defer f.Close()
    // ...
    return nil
}
```

## Match sentinels and types

```go
if errors.Is(err, os.ErrNotExist) {
    return defaultConfig(), nil
}

var pathErr *fs.PathError
if errors.As(err, &pathErr) {
    logger.Warn("filesystem failure", "path", pathErr.Path)
}
```

- `errors.Is` compares the target, then any `Is(error) bool` method, then unwraps.
- `errors.As` finds the first assignable error in the tree; it does not return every match.
- `err != nil` remains the correct success check; equality against a sentinel is only safe when the error cannot be wrapped.

## Aggregate independent errors (Go 1.20+)

```go
var errs []error
for _, field := range fields {
    if err := field.Validate(); err != nil {
        errs = append(errs, fmt.Errorf("field %s: %w", field.Name, err))
    }
}
if err := errors.Join(errs...); err != nil {
    return fmt.Errorf("validate request: %w", err)
}
```

`errors.Join`:

- discards `nil` error interfaces and returns `nil` when nothing remains;
- exposes `Unwrap() []error`; `errors.Is`/`errors.As` traverse joined children;
- `errors.Unwrap(err)` returns `nil` for a joined error;
- aggregates errors; it is not a field-level API response or a way to run work concurrently.

Since Go 1.20, `fmt.Errorf` also accepts multiple `%w` verbs, which produces a joined error.

## Typed nil is not nil

```go
func find() error {
    var validationErr *ValidationError // typed nil pointer
    if someCondition {
        validationErr = &ValidationError{Field: "email"}
    }
    if validationErr == nil {
        return nil // never return validationErr: a typed nil in error is non-nil
    }
    return validationErr
}
```

## Version-gated extraction: AsType (Go 1.26+)

```go
// Requires Go 1.26+; keep errors.As for older modules.
if pathErr, ok := errors.AsType[*fs.PathError](err); ok {
    logger.Warn("filesystem failure", "path", pathErr.Path)
}
```

`AsType` returns the first match and `false` when absent. Do not replace `errors.As` in modules below Go 1.26 or in code that must compile on older toolchains.

## Custom error type

```go
type ValidationError struct {
    Field string
    Msg   string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Msg)
}
```

Return the concrete error and let callers match it with `errors.As`; keep messages free of secrets.
