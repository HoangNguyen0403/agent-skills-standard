---
name: golang-architecture
description: Structure Go code with package-first boundaries, `cmd/` and `internal/`, and explicit dependency wiring. Use when shaping project layout, package ownership, or service boundaries in Go; defer Redis/cache-specific implementation recipes to database skills.
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

## Rules

- **Package-first design**: organize by domain/capability before package-by-layer sprawl.
- **Layout**: `cmd/` for binaries, `internal/` for private app code, `pkg/` only for intentional reuse.
- **Wiring**: compose dependencies in `main` or dedicated constructors, not via hidden globals.
- **Interfaces**: define small interfaces on the consumer side.
- **Context**: pass `context.Context` across I/O and request boundaries.

## Recipe

1. **Place the entrypoint** in `cmd/<app>`.
2. **Create domain-owned packages** under `internal/`.
3. **Expose constructors** for services, repositories, and handlers.
4. **Keep business rules out of transport** packages.
5. **Wire logging, config, DB, and HTTP server at startup**.

## Verify

- [ ] No package-level mutable singletons control runtime behavior.
- [ ] Imports flow inward; transport and storage packages do not pull business rules outward.
- [ ] Interfaces live with callers that need substitution.
- [ ] `main` wires dependencies but does not hold business logic.
- [ ] Request and DB paths accept `context.Context`.

## Anti-Patterns

- **No package soup**: avoid dumping unrelated code into `internal/shared` or `pkg/utils`.
- **No global singletons**: use constructors; avoid package-level mutable variables.
- **No god services**: split orchestration by capability.
- **No fake Clean Architecture theatre**: package names must match real ownership.

## References

- [Framework Map](../references/framework-map.md)
- [Standard Project Layout](references/project-layout.md)
- [Clean Architecture Layers](references/clean-arch.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- inject
