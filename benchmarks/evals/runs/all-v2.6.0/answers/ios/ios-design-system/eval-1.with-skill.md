Implement the design system around centralized SwiftUI tokens in `/Theme/`, following Apple’s iOS Human Interface Guidelines.

```swift
// Theme/Spacing.swift
enum Spacing {
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
}
```

Define brand colors in the Asset Catalog and reference them by name:

```swift
extension Color {
    static let appPrimary = Color("AppPrimary")
    static let appBackground = Color("AppBackground")
}
```

Avoid hex colors, `Color.blue`, and other system colors for branding. Use tokens such as `.appPrimary` and `Color("Name")`.

Centralize typography with `Font` extensions:

```swift
extension Font {
    static let appTitle = Font.title.bold()
    static let appBody = Font.body
}
```

Use tokens consistently in views:

```swift
struct ContentView: View {
    var body: some View {
        VStack(spacing: Spacing.md) {
            Text("Welcome")
                .font(.appTitle)

            Text("Content")
                .font(.appBody)
                .foregroundStyle(.appPrimary)
        }
        .padding(Spacing.md)
        .background(.appBackground)
    }
}
```

Avoid magic values such as `spacing: 16`; use `Spacing.md`. For repeated styling, create reusable `ViewModifier`s or components so views consume design tokens instead of defining visual values directly.
