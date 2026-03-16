# Golang Idioms

## Constructing

Use `New` or `New<Type>` pattern for constructors.

```go
func NewClient(cfg Config) (*Client, error) {
    return &Client{cfg: cfg}, nil
}
```

## Options Pattern

For complex configuration, use Functional Options.

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## Interface Checks

Verify interface implementation at compile time.

```go
var _ Handler = (*MyHandler)(nil)
```

## Embedding

Use embedding for composition, not inheritance.

```go
type ReaderWriter interface {
    Reader
    Writer
}
```
