---
name: ios-design-system
description: Enforce design token usage in SwiftUI apps using iOS Human Interface Guidelines. Use when implementing design tokens, colors, or typography in SwiftUI.
metadata:
  triggers:
    files:
    - '**/*View.swift'
    - '**/Theme/**'
    - '**/DesignSystem/**'
    keywords:
    - Color
    - Font
    - SwiftUI
    - ViewModifier
    - Theme
---
# iOS Design System (SwiftUI)

## **Priority: P2 (MEDIUM)**

Enforce design token usage in SwiftUI. Follow Apple HIG for iOS-native feel.

## Token Structure

Define tokens in `Theme/` folder: Colors via Asset Catalog (`Color("Name")`), `Spacing` enum for all margins, `Font` extensions for typography. See [Token Structure & Examples](references/example.md).

## Anti-Patterns

- **No Hex Colors**: Define in asset catalog, use `Color("Name")`.
- **No Magic Spacing**: Use `Spacing.md` not `spacing: 16`.
- **No System Colors for Brand**: Use `.appPrimary` not `Color.blue`.

## References

- [Token Structure & Usage Examples](references/example.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- /Theme/
- Spacing.md
- spacing: 16

- Additional task-grounded exact anchors: Color("Name")