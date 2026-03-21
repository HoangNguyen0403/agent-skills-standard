---
name: flutter-dependency-injection
description: 'Standards for automated service locator setup using injectable and get_it. Use when configuring dependency injection with injectable and get_it in Flutter. (triggers: **/injection.dart, **/locator.dart, GetIt, injectable, singleton, module, lazySingleton, factory)'
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

- **Automated Registration**: Use **@injectable** annotations; avoid manual registry calls.
- **@LazySingleton**: Default for repositories, services, and data sources (init on demand).
- **Factory Registration**: Use **@injectable (Factory)** for BLoCs to ensure state resets on every new instance/request. Do NOT use `@Singleton()` for BLoCs.
- **Abstract Injection**: Always register implementations as **abstract interfaces (as: IService)**.
- **Modules**: Use **@module** for registering third-party instances (e.g., **Dio**, **Hive**, `SharedPreferences`).
- **Constructor Injection**: Use mandatory constructor parameters; `injectable` resolves them automatically.
- **Test Mocks**: Swap implementations in `setUp` using **getIt.unregister<IService>()** followed by **getIt.registerLazySingleton<IService>(() => MockService())**.

## Reference & Examples

For module configuration and initialization templates:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- ❌ `getIt<OrderRepository>()` inside widget `build()` — inject via constructor, not GetIt calls in UI
- ❌ `@Singleton()` on a BLoC — BLoCs must use `@injectable` (Factory) so state resets per instance
- ❌ Injecting the concrete class: `OrderRepositoryImpl repo` — always inject the abstract interface
- ❌ `getIt.registerLazySingleton<X>(() => X())` in production code — use `@injectable` annotations; manual registration is only for tests

## Related Topics

layer-based-clean-architecture | testing
