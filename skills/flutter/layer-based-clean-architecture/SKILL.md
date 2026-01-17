---
name: Flutter Layer-based Clean Architecture + DDD
description: Standards for separation of concerns, layer dependency rules, and DDD in Flutter.
metadata:
  labels: [architecture, clean-architecture, layers, ddd]
  triggers:
    files: ['lib/domain/**', 'lib/infrastructure/**', 'lib/application/**']
    keywords: [domain, infrastructure, application, presentation, layers, dto, mapper]
---

# Layer-Based Clean Architecture

## **Priority: P0 (CRITICAL)**

Standardized separation of concerns and dependency flow using DDD principles.

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
- **Always Map**: Infrastructure must map DTOs to Domain Entities; do not leak DTOs to UI.
- **Immutability**: Use `@freezed` for all entities and failures.
- **Logic Placement**: No business logic in UI; widgets only display state and emit events.
- **Inversion of Control**: Use `get_it` to inject repository implementations into BLoCs.

## Anti-Patterns

- **No DTOs in UI**: Never import a `.g.dart` or Data class directly in a Widget.
- **No Material in Domain**: Do not import `package:flutter/material.dart` in the `domain` layer.
- **No Shared Prefs in Repo**: Do not use `shared_preferences` directly in a Repository; use a Data Source.

## Reference & Examples

For full implementation templates and DTO-to-Domain mapping examples:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

feature-based-clean-architecture | bloc-state-management | dependency-injection | error-handling
