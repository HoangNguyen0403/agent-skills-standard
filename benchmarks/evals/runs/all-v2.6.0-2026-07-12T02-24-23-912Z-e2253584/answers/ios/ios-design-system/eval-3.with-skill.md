Here’s a quick-start SwiftUI design system example:

```swift
import SwiftUI

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
}

extension Font {
    static let appTitle = Font.system(size: 24, weight: .bold)
    static let appBody = Font.system(size: 16, weight: .regular)
}

extension Color {
    static let appPrimary = Color("AppPrimary")
    static let appBackground = Color("AppBackground")
    static let appText = Color("AppText")
}

struct WelcomeCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Welcome")
                .font(.appTitle)
                .foregroundColor(.appText)

            Text("Build UI with reusable tokens for color, type, and spacing.")
                .font(.appBody)
                .foregroundColor(.appText)

            Button("Get Started") {}
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(Color.appPrimary)
                .foregroundColor(.white)
                .cornerRadius(12)
        }
        .padding(Spacing.lg)
        .background(Color.appBackground)
        .cornerRadius(16)
    }
}
```

Quick rules:

- Put brand colors in the asset catalog and load them with `Color("...")`.
- Centralize spacing in a `Spacing` token type.
- Expose typography through `Font` extensions so views stay consistent.

