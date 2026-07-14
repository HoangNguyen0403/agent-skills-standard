A simple SwiftUI design system:

```text
/Theme/
  AppColors.swift
  Spacing.swift
  AppFonts.swift
Assets.xcassets/
  AppPrimary.colorset
```

```swift
// Theme/AppColors.swift
import SwiftUI

extension Color {
    static let appPrimary = Color("AppPrimary") // Asset Catalog token
}
```

```swift
// Theme/Spacing.swift
import Foundation

enum Spacing {
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
}
```

```swift
// Theme/AppFonts.swift
import SwiftUI

extension Font {
    static let appTitle = Font.title2.weight(.bold)
    static let appBody = Font.body
}
```

```swift
import SwiftUI

struct WelcomeView: View {
    var body: some View {
        VStack(spacing: Spacing.md) {
            Text("Welcome")
                .font(.appTitle)
                .foregroundStyle(.appPrimary)

            Text("Build consistent, native-feeling interfaces.")
                .font(.appBody)

            Button("Continue") {}
                .buttonStyle(.borderedProminent)
                .tint(.appPrimary)
        }
        .padding(Spacing.lg)
    }
}
```

Use `Color("Name")` for asset-backed colors, `Spacing.md` instead of magic values such as `spacing: 16`, and avoid system colors like `Color.blue` for brand styling.
