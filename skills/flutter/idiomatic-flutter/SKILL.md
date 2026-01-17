---
name: Idiomatic Flutter
description: Modern layout and widget composition standards.
metadata:
  labels: [flutter, clean-code, widgets]
  triggers:
    files: ['lib/presentation/**/*.dart']
    keywords: [context.mounted, SizedBox, Gap, composition, shrink]
---

# Idiomatic Flutter (P1)

- **Async Gaps**: Check `if (context.mounted)` before using `BuildContext` after `await`.
- **Composition**: Extract complex UI into small widgets. Avoid deep nesting or large helper methods.
- **Layout**:
  - Spacing: Use `Gap(n)` or `SizedBox` over `Padding` for simple gaps.
  - Empty UI: Use `const SizedBox.shrink()`.
  - Intrinsic: Avoid `IntrinsicWidth/Height`; use `Stack` + `FractionallySizedBox` for overlays.
- **Optimization**: Use `ColoredBox`/`Padding`/`DecoratedBox` instead of `Container` when possible.
- **Themes**: Use extensions for `Theme.of(context)` access.
