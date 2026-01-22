# Clean Architecture in Go

## The Dependency Rule

Dependencies can only point **inward**. Inner circles know nothing about outer circles.

## Layers

### 1. Domain (Entities)

- **Location**: `internal/domain/`
- **Content**: Pure Go structs. Core business logic.
- **Dependencies**: None. Stdlib only.

```go
// internal/domain/user.go
type User struct {
    ID    string
    Email string
}

func (u *User) ChangeEmail(email string) error {
    // validation logic...
}
```

### 2. Usecase (Application Logic)

- **Location**: `internal/service/`
- **Content**: Application specific business rules. Orchestrates domain objects.
- **Dependencies**: Domain, Port Interfaces.

```go
// internal/service/user_service.go
type UserService struct {
    repo port.UserRepository
}

func (s *UserService) Register(ctx context.Context, email string) error {
    // orchestrate registration
}
```

### 3. Interface Adapters (Ports Impl)

- **Location**: `internal/adapter/`
- **Content**: Converts data from format most convenient for use cases and entities, to format most convenient for external agency (DB, Web).
- **Sub-layers**:
  - **Handlers**: Controllers, Presenters (`adapter/handler/http`)
  - **Repositories**: Gateways (`adapter/repository/postgres`)

### 4. Frameworks & Drivers

- **Location**: `cmd/`, `configs/`, External libs.
- **Content**: Glue code, DB drivers, HTTP Frameworks.
