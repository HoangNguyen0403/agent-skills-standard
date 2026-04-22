---
name: flutter-design-system
description: Enforce Design Language System adherence in Flutter. Use when implementing design tokens, preventing hardcoded colors/spacing, or building a DLS.
metadata:
  triggers:
    files:
    - '**/theme/**'
    - '**/*_theme.dart'
    - '**/*_colors.dart'
    - '**/*_dls/**'
    - '**/foundation/**'
    - '**/presentation/**'
    - '**/ui/**'
    - '**/widgets/**'
    keywords:
    - ThemeData
    - ColorScheme
    - AppColors
    - VColors
    - VSpacing
    - AppTheme
    - design token
---
# Flutter Design System Enforcement

## **Priority: P0 (CRITICAL)**

Zero tolerance for hardcoded design values.

## **Phase 0: Context Discovery (MANDATORY)**

Before UI refactoring, identify project's Theme Archetype:

1. **Check `main.dart`**: Look for `MaterialApp` theme configuration.
2. **Determine Pattern**:
 - **Theme-Driven (Adaptive)**: `VThemeData(...).toThemeData()` or extensive `ThemeData` overrides → use `Theme.of(context).textTheme` / `theme.textTheme`.
 - **Token-Driven (Static)**: Use static tokens (`VTypography.*`) only when no global theme bridge exists, or when defining theme itself.

## Guidelines

- **Colors**: Use tokens (`VColors.*`, `AppColors.*`), never `Color(0xFF...)` or `Colors.red`.
- **Spacing**: Use tokens (`VSpacing.*`), never magic numbers like `16` or `24`.
- **Typography**: Prioritize `theme.textTheme.*` for adaptive UI. Use `VTypography.*` tokens only for theme definitions or non-contextual logic. Never use inline `TextStyle`.
- **Borders**: Use tokens (`VBorders.*`), never raw `BorderRadius.`
- **Components**: Use DLS widgets (`VButton`) over raw Material widgets (`ElevatedButton`) if available.

[Detailed Examples](references/usage.md)

## Anti-Patterns

- **No Hex Colors**: `Color(0xFF...)` strictly forbidden.
- **No Color Enums**: `Colors.blue` forbidden in UI code.
- **No Magic Spacing**: `SizedBox(height: 10)` forbidden.
- **No Inline Styles**: `TextStyle(fontSize: 14)` forbidden.
- **No Raw Widgets**: Don't use `ElevatedButton` when `VButton` exists.

## Related Topics

mobile-ux-core | flutter/widgets | idiomatic-flutter