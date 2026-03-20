---
name: flutter-feature-based-clean-architecture
description: "Feature-based clean architecture standards. ALWAYS consult when creating or modifying any file under lib/features/ — new features, domain entities, repositories, data sources, or screens. (triggers: lib/features/**, feature, domain, infrastructure, application, presentation)"
---

# Feature-Based Clean Architecture

## **Priority: P0 (CRITICAL)**

Standard for modular Clean Architecture organized by business features in `lib/features/`.

## Structure

See [references/folder-structure.md](references/folder-structure.md) for the complete directory blueprint.

## Implementation Guidelines

- **Feature Encapsulation**: Keep logic, models, and UI internal to the feature directory.
- **Strict Layering**: Maintain 3-layer separation (Domain/Data/Presentation) within each feature.
- **Dependency Rule**: `Presentation -> Domain <- Data`. Domain must have zero external dependencies.
- **Cross-Feature Communication**: Features only depend on the **Domain** layer of other features.
- **Flat features**: Keep `lib/features/` flat; avoid nested features.
- **No DTO Leakage**: Never expose DTOs or Data Sources to UI or other features; return Domain Entities.
- **Shared logic**: Move cross-cutting concerns to `lib/shared/` or `lib/core/`.

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

