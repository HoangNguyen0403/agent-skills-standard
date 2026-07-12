Common anti-patterns to avoid in an iOS design system, especially in SwiftUI:

- Using hex colors directly in code instead of defining named colors in the Asset Catalog and referencing them like `Color("PrimaryBackground")`
- Hardcoding spacing values such as `16` or `24` throughout views instead of routing layout through shared spacing tokens
- Using raw system colors for brand surfaces, like `Color.blue`, when the product should use semantic brand tokens such as `.appPrimary`
- Scattering typography choices inline instead of centralizing text styles through shared font tokens or extensions
- Letting components invent their own visual rules instead of consuming the design system from a shared `Theme/` or `DesignSystem/` layer

These anti-patterns usually make the UI harder to keep consistent, harder to theme, and more expensive to update later.

