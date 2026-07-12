A quick-start iOS design system can be as simple as defining a few shared tokens and wrapping them in reusable UI components.

Start with core design tokens:

- Colors: primary, secondary, background, text, error
- Typography: title, body, caption
- Spacing: xs, sm, md, lg, xl
- Radius: small, medium, large

Example in Swift:

```swift
import SwiftUI

enum DSColor {
    static let primary = Color.blue
    static let background = Color.white
    static let textPrimary = Color.black
}

enum DSSpacing {
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
}

enum DSTypography {
    static let title = Font.system(size: 24, weight: .bold)
    static let body = Font.system(size: 16, weight: .regular)
}

struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(DSTypography.body)
                .foregroundColor(.white)
                .padding(.vertical, DSSpacing.sm)
                .padding(.horizontal, DSSpacing.md)
                .frame(maxWidth: .infinity)
                .background(DSColor.primary)
                .cornerRadius(12)
        }
    }
}

struct ContentView: View {
    var body: some View {
        VStack(spacing: DSSpacing.md) {
            Text("Welcome")
                .font(DSTypography.title)
                .foregroundColor(DSColor.textPrimary)

            PrimaryButton(title: "Continue") {
                print("Tapped")
            }
        }
        .padding(DSSpacing.lg)
        .background(DSColor.background)
    }
}
```

Typical next steps:

1. Move tokens into dedicated files.
2. Add components like buttons, text fields, cards, and alerts.
3. Support light/dark mode.
4. Document usage rules for designers and engineers.

