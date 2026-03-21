---
name: flutter-riverpod-state-management
description: 'Reactive state management using Riverpod 2.0 with code generation. Use when managing state with Riverpod providers or using riverpod_generator in Flutter. (triggers: **_provider.dart, **_notifier.dart, riverpod, ProviderScope, ConsumerWidget, Notifier, AsyncValue, ref.watch, @riverpod)'
---

# Riverpod State Management

## **Priority: P0 (CRITICAL)**

Type-safe, compile-time safe reactive state management using `riverpod` and `riverpod_generator`.

## Structure

```text
lib/
├── providers/ # Global providers and services
└── features/user/
    ├── providers/ # Feature-specific providers
    └── models/    # @freezed domain models
```

## Implementation Guidelines

- **Generator First**: Use **@riverpod** annotations and `riverpod_generator`. Avoid manual `Provider` definitions.
- **Immutability**: Maintain immutable states. Use `Freezed` for all state models.
- **Provider Methods**:
  - `ref.watch()`: Use inside `build()` to rebuild on changes. (e.g., `ref.watch(productsProvider)`)
  - **Side-Effects**: Use **ref.listen()** inside `build()` for navigation/dialogs (e.g., `ref.listen(cartProvider, (prev, next) { ... })` in `ConsumerWidget`). **Never perform side-effects inside provider initialization.**
  - `ref.read()`: Use ONLY in callbacks (`onPressed`).
- **Asynchronous Data**: Use **AsyncNotifier** for complex async logic. The `build()` method calls the repository (e.g., `repository.getProducts()`). Access data via **.when(data: , loading: , error: )** or `AsyncValue` pattern-matching.
- **Architecture**: Enforce 3-layer separation (Data, Domain, Presentation).
- **Testing**: Override providers in widget tests using **ProviderScope(overrides: [provider.overrideWithValue(Mock())])** in `pumpWidget`.
- **Linting**: Enable **riverpod_lint** and `custom_lint` for dependency cycle detection and to catch missing overrides.

## Anti-Patterns

- **Building Inside Providers**: Don't perform side-effects inside provider initialization.
- **Context Access**: Never pass `BuildContext` into a Notifier/Provider.
- **Dynamic Providers**: Avoid local provider instantiation; keep them global.

## Related Topics

layer-based-clean-architecture | dependency-injection | testing
