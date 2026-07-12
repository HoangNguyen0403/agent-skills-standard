Use a token-based design system in SwiftUI instead of hardcoded values.

Put design tokens in a dedicated `Theme/` or `DesignSystem/` area:

- Colors: define brand and semantic colors in the Asset Catalog, then access them with `Color("Primary")` or typed wrappers like `Color.appPrimary`
- Typography: expose app fonts through `Font` extensions or a typography namespace instead of inline `.system(size:weight:)`
- Spacing: define a `Spacing` enum or constants such as `Spacing.sm`, `Spacing.md`, `Spacing.lg`

Good practices:

- Use semantic tokens, not implementation names, like `textPrimary`, `surfaceBackground`, `accentBrand`
- Centralize reusable styling with `ViewModifier` or small styled components
- Keep brand styling out of feature views; views should consume tokens, not invent them
- Follow iOS Human Interface Guidelines so spacing, hierarchy, and typography still feel native

Avoid these anti-patterns:

- Hardcoded hex colors in code
- Magic numbers like `padding(16)` scattered through views
- Using system colors such as `Color.blue` for brand colors

Example shape:

```swift
enum Spacing {
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
}

extension Color {
    static let appPrimary = Color("AppPrimary")
    static let textPrimary = Color("TextPrimary")
}

extension Font {
    static let titleLarge = Font.system(.title2, design: .default).weight(.semibold)
    static let bodyMedium = Font.system(.body)
}
```

Then use them consistently:

```swift
Text("Welcome")
    .font(.titleLarge)
    .foregroundColor(.textPrimary)
    .padding(Spacing.md)
    .background(Color.appPrimary)
```

If you want the cleanest implementation, build the rule as: define tokens once, expose them through typed APIs, and require every SwiftUI view to consume those tokens instead of raw visual values.

