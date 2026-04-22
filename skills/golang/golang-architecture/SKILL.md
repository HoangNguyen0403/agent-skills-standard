---
name: golang-architecture
description: Structure Go projects with Clean Architecture and standard layout conventions. Use when structuring Go projects or applying Clean Architecture in Go.
metadata:
  triggers:
    files:
    - 'go.mod'
    - 'internal/**'
    keywords:
    - architecture
    - structure
    - folder layout
    - clean arch
    - dependency injection
---
# Golang Architecture

## **Priority: P0 (CRITICAL)**

## Principles

- **Clean Architecture**: Inner layers (Domain) rely on nothing. Outer layers (Adapters) rely on inner.
- **Project Layout**: Follow standard Go layout (`cmd`, `internal`, `pkg`).
- **Dependency Injection**: Pass dependencies via constructors. Avoid global singletons.
- **Package Oriented Design**: Organize by feature/domain, not by layer.
- **Interface Segregation**: Define interfaces where they _used_ (consumer side).

## Implementation Workflow

1. **Set up project layout** — Use `cmd/` for entry points, `internal/` for private packages, `pkg/` for shared libraries.
2. **Define domain layer** — Inner-most layer with zero external dependencies.
3. **Build use cases** — Depend only on Domain interfaces.
4. **Implement adapters** — Outer layer depends on UseCase/Domain. Contains HTTP handlers, DB repos, etc.
5. **Wire in main** — Compose full dependency graph in `main.go`.

See [constructor injection and wiring examples](references/clean-arch.md)

## Verification Checklist

- [ ] No global singletons or package-level mutable variables
- [ ] Dependencies explicitly passed via constructors
- [ ] Interfaces defined at consumer side
- [ ] `internal/domain` zero external dependencies
- [ ] Dependencies wired together in `main.go`

## Anti-Patterns

- **No global singletons**: use DI; avoid package-level mutable variables.
- **No layer violations**: keep Domain imports isolated from adapter/infrastructure layers.
- **No god services**: split services into single-responsibility components.

## References

- [Standard Project Layout](references/project-layout.md)
- [Clean Architecture Layers](references/clean-arch.md)