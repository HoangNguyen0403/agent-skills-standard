# Standard Go Project Layout

Based on `golang-standards/project-layout`.

```text
/
├── cmd/
│   └── app/
│       └── main.go           # Entry point. Wires dependencies. Start.
├── internal/
│   ├── domain/               # Enterprise business rules (Structs, Methods)
│   │   ├── user.go
│   │   └── errors.go
│   ├── port/                 # Interfaces (Inputs and Outputs)
│   │   ├── repository.go     # Writer/Reader interfaces
│   │   └── service.go        # Use case interfaces
│   ├── service/              # Application business rules
│   │   └── user_service.go   # Implements logic, uses domain + port
│   └── adapter/              # Interface Adapters
│       ├── handler/          # HTTP/GRPC handlers
│       │   └── http/
│       └── repository/       # Database implementations
│           └── postgres/
├── pkg/                      # Public libraries (e.g., universal utils)
│   └── logger/
├── configs/                  # Config files
├── api/                      # OpenAPI/Proto definitions
├── go.mod
└── Makefile
```
