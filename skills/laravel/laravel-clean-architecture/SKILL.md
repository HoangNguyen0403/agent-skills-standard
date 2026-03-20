---
name: laravel-clean-architecture
description: "Expert patterns for DDD, DTOs, and Ports & Adapters in Laravel. Use when applying Domain-Driven Design, DTOs, or ports-and-adapters patterns in Laravel. (triggers: app/Domains/**/*.php, app/Providers/*.php, domain, dto, repository, contract, adapter)"
---

# Laravel Clean Architecture

## **Priority: P1 (HIGH)**

## Structure

```text
app/
├── Domains/            # Logic grouped by business domain
│   └── {Domain}/
│       ├── Actions/    # Single use-case logic
│       ├── DTOs/       # Immutable data structures
│       └── Contracts/  # Interfaces for decoupling
└── Providers/          # Dependency bindings
```

## Implementation Guidelines

- **Domain Grouping**: Organize code by business domain (e.g., `User`, `Order`) instead of framework types.
- **DTOs**: Use `readonly` classes to pass data between layers; avoid raw arrays.
- **Action Classes**: Wrap business logic in single-purpose classes with `handle()` or `execute()`.
- **Repository Pattern**: Abstract Eloquent queries behind interfaces for easier testing.
- **Dependency Inversion**: Bind Interfaces to implementations in `AppServiceProvider`.
- **Model Isolation**: Keep Eloquent models lean; only include relationships and casts.

## Anti-Patterns

- **No Eloquent in Controllers**: Bridge layers with DTOs and Actions.
- **No raw arrays across layers**: Use typed `readonly` DTOs.
- **No God Services**: Break into single-responsibility Actions.
- **No concrete dependencies**: Depend on Interfaces, not implementations.

## References

- [DDD & Repository Patterns](references/implementation.md)
