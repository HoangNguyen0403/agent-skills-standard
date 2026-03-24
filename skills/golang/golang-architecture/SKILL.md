---
name: golang-architecture
description: "Structure Go projects with Clean Architecture and standard layout conventions. Use when structuring Go projects or applying Clean Architecture in Go. (triggers: go.mod, internal/**, architecture, structure, folder layout, clean arch, dependency injection)"
---

# Golang Architecture

## **Priority: P0 (CRITICAL)**

## Principles

- **Clean Architecture**: Inner layers (Domain) rely on nothing. Outer layers (Adapters) rely on inner.
- **Project Layout**: Follow standard Go layout (`cmd`, `internal`, `pkg`).
- **Dependency Injection**: Pass dependencies via constructors. Avoid global singletons.
- **Package Oriented Design**: Organize by feature/domain, not by layer.
- **Interface Segregation**: Define interfaces where they are _used_ (consumer side).

## Implementation Workflow

1. **Set up project layout** — Use `cmd/` for entry points, `internal/` for private packages, `pkg/` for shared libraries.
2. **Define domain layer** — Inner-most layer with zero external dependencies.
3. **Build use cases** — Depend only on Domain interfaces.
4. **Implement adapters** — Outer layer depends on UseCase/Domain. Contains HTTP handlers, DB repos, etc.
5. **Wire in main** — Compose the full dependency graph in `main.go`.

### Constructor Injection Example

```go
// Domain interface (defined at consumer side)
type OrderRepository interface {
    GetByID(ctx context.Context, id string) (*Order, error)
}

// Service depends on interface, not concrete struct
type OrderService struct {
    repo OrderRepository
}

func NewOrderService(repo OrderRepository) *OrderService {
    return &OrderService{repo: repo}
}
```

### Wiring in main.go

```go
func main() {
    db := postgres.NewConnection(cfg.DatabaseURL)
    orderRepo := postgres.NewOrderRepository(db)
    orderService := domain.NewOrderService(orderRepo)
    orderHandler := handler.NewOrderHandler(orderService)
    // ... set up router
}
```

## Verification Checklist

- [ ] No global singletons or package-level mutable variables
- [ ] Dependencies explicitly passed via constructors
- [ ] Interfaces defined at the consumer side
- [ ] `internal/domain` has zero external dependencies
- [ ] Dependencies wired together in `main.go`

## Anti-Patterns

- ❌ Global singletons — use DI; avoid package-level mutable variables
- ❌ Layer violations — domain must not import from adapter/infrastructure layers
- ❌ God services — split into single-responsibility components

## References

- [Standard Project Layout](references/project-layout.md)
- [Clean Architecture Layers](references/clean-arch.md)
