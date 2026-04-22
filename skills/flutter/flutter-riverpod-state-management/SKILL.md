---
name: flutter-riverpod-state-management
description: Implement reactive state management using Riverpod 2.0 with code generation in Flutter. Use when defining providers, building AsyncNotifiers, or overriding providers in tests.
metadata:
  triggers:
    files:
    - '**_provider.dart'
    - '**_notifier.dart'
    keywords:
    - riverpod
    - ProviderScope
    - ConsumerWidget
    - Notifier
    - AsyncValue
    - ref.watch
    - "@riverpod"
---
# Riverpod State Management

## **Priority: P0 (CRITICAL)**


## Structure

```text
lib/
├── providers/ # Global providers and services
└── features/user/
    ├── providers/ # Feature-specific providers
    └── models/    # @freezed domain models
```

## Provider Definition (Generator-First)

Use `@riverpod` annotations for all provider definitions. See [implementation examples](references/implementation.md) for full provider and consumer patterns.

## Consuming Providers

Use `ConsumerWidget` with `ref.watch()` and `AsyncValue.when()` for reactive UI. See [implementation examples](references/implementation.md).

## Implementation Guidelines

- **Generator First**: Use `@riverpod` annotations. Avoid manual `Provider` definitions.
- **Immutability**: Use `Freezed` for all state models.
- **ref.watch()**: Inside `build()` to rebuild on changes.
- **ref.listen()**: Inside `build()` for side-effects (navigation, dialogs). Never in provider init.
- **ref.read()**: ONLY in callbacks (`onPressed`).
- **Testing**: Override providers with `ProviderScope(overrides: [provider.overrideWithValue(Mock())])`.
- **Linting**: Enable `riverpod_lint` and `custom_lint` for cycle detection.

## Anti-Patterns

- **No side-effects in provider init**: Use `ref.listen()` in widgets instead.
- **No BuildContext in Notifiers**: Never pass `BuildContext` into Notifier/Provider.
- **No local provider instantiation**: Keep providers global; avoid dynamic creation.

## Related Topics

- [flutter-layer-based-clean-architecture](../flutter-layer-based-clean-architecture/SKILL.md)
- [flutter-dependency-injection](../flutter-dependency-injection/SKILL.md)
- [flutter-testing](../flutter-testing/SKILL.md)