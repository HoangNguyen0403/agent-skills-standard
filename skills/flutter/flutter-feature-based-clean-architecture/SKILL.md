---
name: flutter-feature-based-clean-architecture
description: Organize Flutter apps with modular feature-based clean architecture. Use when creating features under lib/features/ with domain, data, and presentation layers.
metadata:
  triggers:
    files:
    - 'lib/features/**'
    keywords:
    - feature
    - domain
    - infrastructure
    - application
    - presentation
---
# Feature-Based Clean Architecture

## **Priority: P0 (CRITICAL)**


## Structure

Every feature lives in `lib/features/` with **3-layer separation** (domain/data/presentation):

- `domain/` — Entities, failures, and Repository interfaces.
- `data/` — DTOs, DataSource, and Repository implementations.
- `presentation/` — BLoC/Cubit, pages, and widgets.

See [references/folder-structure.md](references/folder-structure.md) for complete directory blueprint.

## Implementation Workflow

1. **Create feature directory** — Add new folder under `lib/features/` (e.g., `lib/features/promotions/`).
2. **Define domain layer** — Add entities, failures, and repository interfaces with zero external dependencies.
3. **Implement data layer** — Add DTOs, data sources, and repository implementations that depend only on Domain.
4. **Build presentation layer** — Add BLoC/Cubit, pages, and widgets that depend only on Domain.
5. **Enforce dependency rule** — `Presentation -> Domain <- Data`. Domain must zero external dependencies.
6. **Share cross-cutting logic** — Move reusable utilities to `lib/shared/` or `lib/core/`.

### Feature Directory Example

See [implementation examples](references/implementation.md) for full directory tree and cross-feature import patterns.

## Reference & Examples

For feature folder blueprints and cross-layer dependency templates:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- **No Cross-Feature Data Imports**: Only import Domain types across features
- **No UI/Data in Domain Layer**: Never put UI or Data classes inside `domain/`
- **No Nested Features**: Keep `lib/features/` flat with no sub-feature directories
- **No Direct Repository Calls**: Use specific BLoCs or use-cases instead of calling other features' repositories directly from UI

## Related Topics

layer-based-clean-architecture | retrofit-networking | go-router-navigation | bloc-state-management | dependency-injection