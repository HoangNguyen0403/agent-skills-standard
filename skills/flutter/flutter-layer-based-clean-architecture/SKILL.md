---
name: flutter-layer-based-clean-architecture
description: Enforce inward dependency flow, pure domain layers, and DTO-to-entity mapping in Flutter DDD architecture. Use when structuring domain, infrastructure, application, or presentation layers.
metadata:
  triggers:
    files:
    - 'lib/domain/**'
    - 'lib/infrastructure/**'
    - 'lib/application/**'
    keywords:
    - dto
    - mapper
    - Either
    - Failure
---
# Layer-Based Clean Architecture

## **Priority: P0 (CRITICAL)**


## Workflow: Add New Feature Across Layers

1. Define domain entity with `@freezed` in `lib/domain/entities/`
2. Define repository interface in `lib/domain/repositories/`
3. Create DTO in `lib/infrastructure/dtos/` with `fromJson`/`toEntity` mapper
4. Implement repository in `lib/infrastructure/repositories/`
5. Wire BLoC/Cubit in `lib/application/` consuming repository interface
6. Register bindings in `get_it` injection container
7. Build screen in `lib/presentation/` using `BlocBuilder`

## Structure

```text
lib/
├── domain/ # Pure Dart: entities (@freezed), failures, repository interfaces
├── infrastructure/ # Implementation: DTOs, data sources, mappers, repo impls
├── application/ # Orchestration: BLoCs / Cubits
└── presentation/ # UI: Screens, reusable components
```

## Implementation Guidelines

- **Dependency Flow**: `Presentation -> Application -> Domain <- Infrastructure`. Dependencies point inward.
- **Pure Domain**: No Flutter (Material/Store) or Infrastructure (Dio/Hive) dependencies in `Domain`.
- **Functional Error Handling**: Repositories must return `Either<Failure, Success>`.
- **Always Map**: Infrastructure must map DTOs to Domain Entities; not leak DTOs to UI.

See [DTO-to-Entity mapping example](references/REFERENCE.md).

- **Immutability**: Use `@freezed` for all entities and failures.
- **Logic Placement**: No business logic in UI; widgets only display state and emit events.
- **Inversion of Control**: Use `get_it` to inject repository implementations into BLoCs.

## Anti-Patterns

- **No DTOs in UI**: Never import `.g.dart` or Data class directly in Widget.
- **No Material in Domain**: not import `package:flutter/material.dart` in `domain` layer.
- **No Shared Prefs in Repo**: not use `shared_preferences` directly in Repository; use Data Source.

## Reference & Examples

For full implementation templates and DTO-to-Domain mapping examples:
See [references/REFERENCE.md](references/REFERENCE.md).

## References

- feature-based-clean-architecture | bloc-state-management | dependency-injection | error-handling