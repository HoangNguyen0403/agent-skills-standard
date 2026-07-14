Assumption: SwiftUI, iOS 16+.

```swift
import SwiftUI

enum AppTheme {
    static let spacing: CGFloat = 16
    static let cornerRadius: CGFloat = 12

    static let primary = Color("BrandPrimary")
    static let background = Color(.systemGroupedBackground)
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(AppTheme.primary)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadius))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

struct DesignCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(AppTheme.spacing)
            .background(.background)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.cornerRadius))
            .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
    }
}

struct WelcomeView: View {
    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()

            DesignCard {
                VStack(alignment: .leading, spacing: AppTheme.spacing) {
                    Text("Welcome")
                        .font(.largeTitle.bold())

                    Text("Build consistent interfaces with reusable design-system components.")
                        .foregroundStyle(.secondary)

                    Button("Get Started") {
                        // Handle action
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
            }
            .padding()
        }
    }
}
```

Add `BrandPrimary` to `Assets.xcassets`, then use `WelcomeView()` as the app’s root view.
