---
name: Idiomatic Flutter
description: Modern layout and widget composition standards.
metadata:
  labels: [flutter, clean-code, widgets]
  triggers:
    files: ['lib/presentation/**/*.dart']
    keywords: [context.mounted, SizedBox, Gap, composition, shrink]
---

# Idiomatic Flutter

## **Priority: P1 (OPERATIONAL)**

Modern Flutter layout patterns and composition techniques.

- **Async Gaps**: Check `if (context.mounted)` before using `BuildContext` after `await`.
- **Composition**: Extract complex UI into small widgets. Avoid deep nesting or large helper methods.
- **Layout**:
  - Spacing: Use `Gap(n)` or `SizedBox` over `Padding` for simple gaps.
  - Empty UI: Use `const SizedBox.shrink()`.
  - Intrinsic: Avoid `IntrinsicWidth/Height`; use `Stack` + `FractionallySizedBox` for overlays.
- **Optimization**: Use `ColoredBox`/`Padding`/`DecoratedBox` instead of `Container` when possible.
- **Themes**: Use extensions for `Theme.of(context)` access.

## 🚫 Anti-Patterns

- **Missing Mounted Check**: `**No context usage after await**: Always check if (context.mounted).`
- **Helper Methods for UI**: `**No Widget functions**: Use specialized Widget classes for better performance/profiling.`
- **Direct Controller Access**: `**No UI-Logic coupling**: Use BLoC/Signals to decouple UI from State.`
