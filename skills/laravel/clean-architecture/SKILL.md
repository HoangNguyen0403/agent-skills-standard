---
name: Laravel Clean Architecture
description: Expert patterns for DDD, DTOs, and Ports & Adapters in Laravel.
metadata:
  labels: [laravel, ddd, architecture, solid, clean-code]
  triggers:
    files: ['app/Domains/**/*.php', 'app/Providers/*.php']
    keywords: [domain, dto, repository, contract, adapter]
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

- **Domain Leak**: **No Eloquent in Controllers**: Use DTOs/Actions to bridge layers.
- **Array Overload**: **No raw data arrays**: Use typed DTOs for structured data.
- **Service Bloat**: **No God Services**: Break down large services into granular Actions.
- **Infrastructure Coupling**: **No hard dependencies**: Depend on abstractions, not concretions.

## References

- [DDD & Repository Patterns](references/implementation.md)
