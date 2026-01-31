---
name: iOS Design System (SwiftUI)
description: Enforce design token usage in SwiftUI apps. Covers Colors, Spacing, Typography using iOS Human Interface Guidelines.
metadata:
  labels: [ios, swiftui, dls, design-tokens, hig]
  triggers:
    files: ['**/*View.swift', '**/Theme/**', '**/DesignSystem/**']
    keywords: [Color, Font, SwiftUI, ViewModifier, Theme]
---

# iOS Design System (SwiftUI)

## **Priority: P2 (OPTIONAL)**

Enforce design token usage in SwiftUI. Follow Apple HIG for iOS-native feel.

## Token Structure

```swift
// Theme/Colors.swift
extension Color {
    static let appPrimary = Color("Primary") // Asset Catalog
    static let appSecondary = Color("Secondary")
    static let appBackground = Color("Background")
}

// Theme/Spacing.swift
enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
}

// Theme/Typography.swift
extension Font {
    static let appTitle = Font.system(size: 28, weight: .bold)
    static let appBody = Font.system(size: 16, weight: .regular)
}
```

## Usage

```swift
// ❌ FORBIDDEN
Text("Hello").foregroundColor(Color(hex: "2196F3"))
VStack(spacing: 16) { }

// ✅ ENFORCED
Text("Hello").foregroundColor(.appPrimary)
VStack(spacing: Spacing.md) { }
Text("Title").font(.appTitle)
```

## Anti-Patterns

- **No Hex Colors**: Use `Color(hex: "...")` → Error. Define in asset catalog.
- **No Magic Spacing**: Use `spacing: 16` → Error. Use `Spacing.md`.
- **No System Colors for Brand**: Use `Color.blue` for brand → Error. Use `.appPrimary`.

## Related Topics

mobile-ux-core | ios/swiftui
