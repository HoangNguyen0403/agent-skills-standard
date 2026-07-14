The idiomatic way is a `const` block, often with a custom type and `iota` for enum-like values.

```go
type Status int

const (
    StatusPending Status = iota
    StatusRunning
    StatusDone
)
```

Use plain `const` values for unrelated constants, and `iota` when the constants are a related sequence.

