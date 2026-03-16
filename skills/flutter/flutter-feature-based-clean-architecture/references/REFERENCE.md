# Feature-Based Architecture Reference

Detailed examples for organizing large-scale Flutter apps by business domain.

## References

- [**Standard Folder Structure**](folder-structure.md) - Deep dive into feature-level directory nesting.
- [**Shared vs Core**](shared-core.md) - When to put code in `lib/core` versus `lib/shared`.
- [**Modular Injection**](modular-injection.md) - How to register dependencies per feature.

## **Quick Implementation Rule**

- Never import from `lib/features/x/data/` or `lib/features/x/presentation/` from outside `feature/x`.
- Only `lib/features/x/domain/` is "public" to other features.
