---
name: android-design-system
description: Enforce Material Design 3 theming and design token usage in Jetpack Compose. Use when implementing M3 components, color schemes, typography, or design tokens.
metadata:
  triggers:
    files:
    - '**/*Screen.kt'
    - '**/ui/theme/**'
    - '**/compose/**'
    keywords:
    - MaterialTheme
    - Color
    - Typography
    - Modifier
    - Composable
---
# Android Design System (Jetpack Compose)

## **Priority: P2 (OPTIONAL)**


## Guidelines

Define `Color.kt`, `Theme.kt`, and `Type.kt` in `ui/theme/`. Map every raw color/type value to `lightColorScheme`/`darkColorScheme` slots. Access all tokens through `MaterialTheme`:
- Colors → `MaterialTheme.colorScheme.*`
- Text styles → `MaterialTheme.typography.*`
- Spacing → `.dp` units consistently

## Anti-Patterns

- **No Hardcoded Colors**: Use `MaterialTheme.colorScheme.*`, not `Color(0xFF...)`.
- **No Inline Typography**: Use `MaterialTheme.typography.*`, not raw `fontSize = 32.sp`.
- **No Magic Spacing**: Prefer named `.dp` tokens; avoid unexplained magic numbers.

## References