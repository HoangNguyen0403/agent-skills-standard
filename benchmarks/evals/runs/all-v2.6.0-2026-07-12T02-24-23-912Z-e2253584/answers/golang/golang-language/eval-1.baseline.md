In Go, the idiomatic way is usually to use a `const` block, often with `iota` for related enumerated values.

Example:

```go
type Status int

const (
    StatusPending Status = iota
    StatusRunning
    StatusDone
)
```

If the constants are string-based, you can still group them in a `const` block:

```go
const (
    RoleAdmin = "admin"
    RoleUser  = "user"
    RoleGuest = "guest"
)
```

For namespacing and type safety, it's common to define a custom type and attach the constants to it.

