---
name: Flutter Riverpod State Management
description: Reactive state management using Riverpod 2.0 with code generation.
metadata:
  labels: [state-management, riverpod, dependency-injection, reactive]
  triggers:
    files: ['**_provider.dart', '**_notifier.dart']
    keywords: [riverpod, ProviderScope, ConsumerWidget, Notifier, AsyncValue, ref.watch, @riverpod]
---

# Riverpod State Management

## **Priority: P0 (CRITICAL)**

Type-safe, compile-time safe reactive state management using `riverpod` and `riverpod_generator`.

## Structure

```text
lib/
├── providers/ # Global providers and services
└── features/
    └── user/
        ├── providers/ # Feature-specific providers
        └── models/    # @freezed domain models
```

## Implementation Guidelines

- **Generator First**: Use `@riverpod` annotations and `riverpod_generator`. Avoid manual `Provider` definitions.
- **Immutability**: Maintain immutable states. Use `Freezed` for all state models.
- **Provider Methods**:
  - `ref.watch()`: Use inside `build()` to rebuild on changes.
  - `ref.listen()`: Use for side-effects (navigation, dialogs).
  - `ref.read()`: Use ONLY in callbacks (onPressed).
- **Asynchronous Data**: Use `AsyncNotifier` for complex async logic. Access data via `.when()` or `AsyncValue` pattern-matching.
- **Architecture**: Enforce 3-layer separation (Data, Domain, Presentation).
- **Linting**: Enable `riverpod_lint` and `custom_lint` for dependency cycle detection.

## Anti-Patterns

- **Building Inside Providers**: Don't perform side-effects inside provider initialization.
- **Context Access**: Never pass `BuildContext` into a Notifier/Provider.
- **Dynamic Providers**: Avoid local provider instantiation; keep them global.

## Reference & Examples

For architecture details, best practices, and testing overrides:
See [references/architecture.md](references/architecture.md), [references/best-practices.md](references/best-practices.md), and [references/testing.md](references/testing.md).

## Related Topics

feature-based-clean-architecture | dependency-injection | testing
