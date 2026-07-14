Implement the design system as a versioned Swift Package shared by SwiftUI and UIKit.

1. Define design tokens

Create centralized tokens for:

- Colors: semantic roles such as `primaryBackground`, `secondaryBackground`, `textPrimary`, `textSecondary`, `accent`, `destructive`.
- Typography: map styles to Dynamic Type, e.g. `.largeTitle`, `.headline`, `.body`, `.caption`.
- Spacing: use a consistent scale, commonly 4/8-point increments.
- Corner radii, borders, shadows, animation durations, and control heights.
- Icons: prefer SF Symbols with consistent rendering modes and weights.

Use semantic system colors where possible:

```swift
Color(.systemBackground)
Color(.label)
Color(.secondaryLabel)
UIColor.systemBlue
```

Support Light Mode, Dark Mode, increased contrast, and high-contrast variants without requiring component changes.

2. Build reusable components

Create components with consistent APIs and states:

- Buttons: primary, secondary, destructive, loading, disabled.
- Inputs: text field, secure field, validation and error states.
- Cards, sheets, alerts, navigation bars, tabs, lists, badges, and empty states.
- Define interaction states explicitly: normal, pressed, focused, disabled, selected, loading, and error.

SwiftUI example:

```swift
struct DSPrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(title, action: action)
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .frame(minHeight: 44)
    }
}
```

For UIKit, expose equivalent `UIView`, `UIControl`, or `UIButton.Configuration` implementations.

3. Follow Apple platform conventions

- Use `NavigationStack`, `TabView`, `List`, `Form`, and standard controls where they fit.
- Use `UIButton.Configuration`, `UIContentConfiguration`, and `UIBackgroundConfiguration` instead of manually reconstructing UIKit controls.
- Use SF Symbols rather than bundled icons when appropriate.
- Respect safe areas, readable content guides, system margins, and platform navigation behavior.
- Do not replace standard gestures or controls without a strong product reason.

4. Make accessibility part of the API

- Keep interactive elements at least 44×44 points.
- Support Dynamic Type using `Font` text styles and `UIFont.preferredFont(forTextStyle:)`.
- Avoid truncating essential content.
- Add meaningful accessibility labels, values, hints, and traits.
- Ensure VoiceOver order is logical.
- Do not communicate meaning through color alone.
- Test Reduce Motion, Bold Text, Increase Contrast, and differentiate-without-color settings.
- Make custom controls keyboard, switch-control, and pointer accessible.

5. Separate tokens, components, and screens

Use a structure such as:

```text
DesignSystem/
  Tokens/
    DSColors.swift
    DSTypography.swift
    DSSpacing.swift
  Components/
    DSButton.swift
    DSTextField.swift
    DSCard.swift
  Modifiers/
  UIKit/
  Preview/
```

Screens should compose components and tokens rather than define raw colors, spacing, fonts, or corner radii.

6. Support SwiftUI and UIKit consistently

Keep the underlying token values shared. Provide adapters where needed:

```swift
extension UIColor {
    static let dsPrimaryBackground = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? .black
            : .systemBackground
    }
}
```

For mixed applications, use `UIHostingController` and `UIViewRepresentable` carefully, with the design system remaining the source of truth.

7. Test visually and behaviorally

Add:

- SwiftUI previews for every component state.
- Snapshot tests across Light/Dark Mode, Dynamic Type sizes, and device widths.
- Accessibility audits using Xcode Accessibility Inspector.
- UI tests for focus, loading, validation, VoiceOver labels, and interaction states.
- Regression tests for token changes that affect many screens.

8. Document and govern it

For every component document:

- Intended usage.
- Supported states.
- Accessibility behavior.
- Do/don’t examples.
- SwiftUI and UIKit APIs.
- Minimum supported OS version.

Version tokens and components independently where practical, deprecate old APIs gradually, and require design-system review before introducing screen-specific styling.
