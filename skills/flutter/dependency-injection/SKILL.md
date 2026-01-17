---
name: Flutter Dependency Injection (Injectable)
description: Standards for automated service locator setup using injectable and get_it.
metadata:
  labels: [dependency-injection, injectable, get_it]
  triggers:
    files: ['**/injection.dart', '**/locator.dart']
    keywords: [GetIt, injectable, singleton, module, lazySingleton, factory]
---

# Dependency Injection

## **Priority: P1 (HIGH)**

Automated class dependency management using `get_it` and `injectable`.

## Structure

```text
core/injection/
├── injection.dart # Initialization & setup
└── modules/ # Third-party dependency modules (Dio, Storage)
```

## Implementation Guidelines

- **Automated Registration**: Use `@injectable` annotations; avoid manual registry calls.
- **@LazySingleton**: Default for repositories, services, and data sources (init on demand).
- **@injectable (Factory)**: Default for BLoCs to ensure state resets on every request.
- **Abstract Injection**: Always register implementations as abstract interfaces (`as: IService`).
- **Modules**: Use `@module` for registering third-party instances (e.g., `Dio`, `SharedPreferences`).
- **Constructor Injection**: Use mandatory constructor parameters; `injectable` resolves them.
- **Test Mocks**: Swap implementations in `setUp` using `getIt.registerLazySingleton` for testing.

## Reference & Examples

For module configuration and initialization templates:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

layer-based-clean-architecture | testing
