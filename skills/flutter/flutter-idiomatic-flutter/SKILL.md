---
name: flutter-idiomatic-flutter
description: "Modern layout and widget composition standards. Use when composing Flutter widget trees, managing layout constraints, or following idiomatic Flutter patterns. (triggers: lib/presentation/**/*.dart, context.mounted, SizedBox, Gap, composition, shrink)"
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

## Anti-Patterns

- ❌ No `if (context.mounted)` after `await` — using BuildContext across async gaps causes crashes
- ❌ `Widget _buildHeader() { … }` helper methods — extract to a `const StatelessWidget` for proper rebuild control and DevTools profiling
- ❌ Accessing a controller or state directly in a widget (`_controller.data`) — use BLoC/Signals to decouple UI from state
- ❌ `Container(width: 0, height: 0)` for empty space — use `const SizedBox.shrink()`
