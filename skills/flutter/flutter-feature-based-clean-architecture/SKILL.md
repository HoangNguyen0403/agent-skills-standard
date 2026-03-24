---
name: flutter-feature-based-clean-architecture
description: "Organize Flutter apps with modular feature-based clean architecture. Use when creating or modifying any file under lib/features/ including domain entities, repositories, data sources, or screens. (triggers: lib/features/**, feature, domain, infrastructure, application, presentation)"
---

# Feature-Based Clean Architecture

## **Priority: P0 (CRITICAL)**

Modular Clean Architecture organized by business features in `lib/features/`.

## Structure

Every feature lives in `lib/features/` with **3-layer separation** (domain/data/presentation):

- `domain/` — Entities, failures, and Repository interfaces.
- `data/` — DTOs, DataSource, and Repository implementations.
- `presentation/` — BLoC/Cubit, pages, and widgets.

See [references/folder-structure.md](references/folder-structure.md) for the complete directory blueprint.

## Implementation Workflow

1. **Create feature directory** — Add a new folder under `lib/features/` (e.g., `lib/features/promotions/`).
2. **Define domain layer** — Add entities, failures, and repository interfaces with zero external dependencies.
3. **Implement data layer** — Add DTOs, data sources, and repository implementations that depend only on Domain.
4. **Build presentation layer** — Add BLoC/Cubit, pages, and widgets that depend only on Domain.
5. **Enforce dependency rule** — `Presentation -> Domain <- Data`. Domain must have zero external dependencies.
6. **Share cross-cutting logic** — Move reusable utilities to `lib/shared/` or `lib/core/`.

### Feature Directory Example

```text
lib/features/orders/
├── domain/
│   ├── entities/order.dart
│   ├── failures/order_failure.dart
│   └── repositories/i_order_repository.dart
├── data/
│   ├── models/order_dto.dart
│   ├── data_sources/order_remote_data_source.dart
│   └── repositories/order_repository_impl.dart
└── presentation/
    ├── bloc/order_bloc.dart
    └── pages/order_list_page.dart
```

### Cross-Feature Import Rule

See [implementation examples](references/implementation.md) for correct vs incorrect cross-feature import patterns.

## Reference & Examples

For feature folder blueprints and cross-layer dependency templates:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- ❌ `import '…/features/orders/data/models/order_dto.dart'` from another feature — only import Domain types across features
- ❌ `lib/features/orders/domain/widgets/` — never put UI or Data classes inside Domain
- ❌ `lib/features/orders/sub_orders/` — keep `lib/features/` flat; no nested feature directories
- ❌ Calling another feature's repository directly from Presentation — route through that feature's BLoC or use-case

## Related Topics

layer-based-clean-architecture | retrofit-networking | go-router-navigation | bloc-state-management | dependency-injection
