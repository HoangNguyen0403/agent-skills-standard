---
name: flutter-dependency-injection
description: Configure service locator setup using injectable and get_it in Flutter. Use when wiring dependency injection with get_it or injectable.
metadata:
  triggers:
    files:
    - '**/injection.dart'
    - '**/locator.dart'
    keywords:
    - GetIt
    - injectable
    - singleton
    - module
    - lazySingleton
    - factory
---
# Dependency Injection

## **Priority: P1 (HIGH)**


## Structure

```text
core/injection/
├── injection.dart  # Initialization & setup
└── modules/        # Third-party dependency modules (Dio, Storage)
```

## Implementation Workflow

1. **Annotate classes** — Use `@injectable` annotations; avoid manual registry calls.
2. **Choose scope** — Default to `@LazySingleton` for repositories, services, and data sources (init on demand).
3. **Register BLoCs as factories** — Use `@injectable` (Factory) for BLoCs to ensure state resets per instance. Never use `@Singleton()` for BLoCs.
4. **Inject abstractions** — Always register implementations as abstract interfaces (`as: IService`).
5. **Register third-party deps** — Use `@module` for external instances (Dio, Hive, SharedPreferences).
6. **Prefer constructor injection** — Use mandatory constructor parameters; `injectable` resolves them automatically.

### Registration & Test Mock Examples

See [implementation examples](references/implementation.md) for module registration and test mock swap patterns.

## Reference & Examples

For module configuration and initialization templates:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- **No Inline `getIt` Calls**: Inject via constructor instead of calling GetIt in UI `build()`
- **No `@Singleton` BLoCs**: Always use `@injectable` (Factory) to ensure state resets
- **No Concrete Class Injection**: Always inject abstract interface (e.g., `IOrderRepository`)
- **No Manual Registration**: Use `@injectable` annotations instead of manual `getIt.register` calls in production code

## Related Topics

layer-based-clean-architecture | testing