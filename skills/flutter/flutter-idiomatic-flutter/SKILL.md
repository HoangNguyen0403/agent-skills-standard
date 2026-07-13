---
name: flutter-idiomatic-flutter
description: Compose modern Flutter layouts and widgets idiomatically. Use for widget trees, layout constraints, mounted safety, and UI composition—not BLoC state management, routing, dependency injection, or tests.
metadata:
  triggers:
    files:
    - 'lib/presentation/**/*.dart'
    - 'context.mounted'
    keywords:
    - SizedBox
    - Gap
    - composition
    - shrink
---
# Idiomatic Flutter

## **Priority: P1 (HIGH)**

- **Async Gaps**: Check `if (context.mounted)` before using `BuildContext` after `await`.
- **Composition**: Extract complex UI into small widgets. Avoid deep nesting or large helper methods.
- **Layout**:
  - Spacing: Prefer `spacing` parameter on `Row`/`Column` (Flutter 3.27+) over inserting `SizedBox`/`Gap` between children. On earlier Flutter versions, use `Gap(n)` instead — `spacing` will not compile.
  - Fallback: Use `Gap(n)` or `SizedBox` only when `spacing` cannot express the layout (e.g., conditional gaps).
  - Empty UI: Use `const SizedBox.shrink()`.
  - Intrinsic: Avoid `IntrinsicWidth/Height`; use `Stack` + `FractionallySizedBox` for overlays.
  - Spacing: Use `Gap(n)` or `SizedBox` over `Padding` for simple gaps.
  - Optimization: Use `ColoredBox`/`Padding`/`DecoratedBox` instead of `Container` when possible.
  - Themes: Use extensions for `Theme.of(context)` access.

## Anti-Patterns

- **No BuildContext after await without mounted check**: Check `context.mounted` to prevent crashes across async gaps.
- **No _buildXxx() helper methods**: Extract to `const StatelessWidget` for proper rebuild control.
- **No direct controller access in widget**: Use BLoC or Riverpod to decouple UI from state.
- **No Container for empty space**: Use `const SizedBox.shrink()`.
