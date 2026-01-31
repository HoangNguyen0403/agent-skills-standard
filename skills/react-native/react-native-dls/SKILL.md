---
name: React Native Design System
description: Enforce design token usage in React Native. Prevents hardcoded styles, encourages theme and design system consistency.
metadata:
  labels: [react-native, dls, design-tokens, theme, styling]
  triggers:
    files:
      ['**/*Screen.tsx', '**/*Component.tsx', '**/theme/**', '**/styles/**']
    keywords: [StyleSheet, styled-components, theme, colors, spacing]
---

# React Native Design System

## **Priority: P1 (OPERATIONAL)**

Enforce design token usage in React Native apps.

## Guidelines

- **Structure**: Define tokens in `theme/colors.ts`, `spacing.ts`, `typography.ts`.
- **Usage**: Import tokens (`colors.primary`) instead of literals (`#000`).
- **Styling**: Compatible with `StyleSheet` and `styled-components`.

[Usage Examples](references/usage.md)

## Anti-Patterns

- **No Inline Colors**: Use `'#FF0000'` → Error. Import from `theme/colors`.
- **No Magic Spacing**: Use `padding: 16` → Error. Use `spacing.md`.
- **No Inline Fonts**: Define `fontSize: 20` → Error. Use `typography.h1`.

## Related Topics

mobile-ux-core | react-native/performance
