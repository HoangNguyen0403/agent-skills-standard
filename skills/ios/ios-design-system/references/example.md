# iOS Design System — Token Examples

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
