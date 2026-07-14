Usually no.

A global `config AppConfig` is an anti-pattern in Go apps because it creates hidden dependencies, makes testing harder, and couples runtime state across the whole process.

Better approach:

- load config once at startup
- unmarshal into a typed `Config` struct
- validate required fields immediately
- pass that config into constructors/services that need it

Example:

```go
type Config struct {
    Port     string
    DBURL    string
    LogLevel string
}

func NewServer(cfg Config) *Server {
    return &Server{cfg: cfg}
}
```

This keeps configuration explicit, testable, and easier to evolve.

A small exception: for tiny apps, a package-level config can work, but even then it is usually cleaner to return a `Config` struct from `LoadConfig()` and inject it.

