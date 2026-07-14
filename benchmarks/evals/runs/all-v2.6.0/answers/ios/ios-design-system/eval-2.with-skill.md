Common iOS design-system anti-patterns to avoid:

- Hardcoded hex colors in SwiftUI. Define brand colors in the Asset Catalog and use `Color("Name")`.
- Magic spacing values such as `spacing: 16`. Centralize spacing tokens in `/Theme/` and use values like `Spacing.md`.
- Using system colors for brand UI, such as `Color.blue`. Use semantic design tokens like `.appPrimary`.
- Scattering typography definitions throughout views. Create shared `Font` extensions and typography tokens.
- Duplicating styling logic instead of using reusable `ViewModifier`s and shared components.
- Naming tokens by appearance rather than meaning, such as `darkBlue`; prefer semantic names like `appPrimary`.
- Ignoring iOS Human Interface Guidelines, Dynamic Type, accessibility contrast, and native platform behavior.
