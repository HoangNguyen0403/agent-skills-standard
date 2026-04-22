---
name: ios-ui-navigation
description: Implement UIKit navigation, Auto Layout, and Apple Human Interface Guidelines in iOS. Use when implementing UIKit navigation, Auto Layout constraints, or HIG compliance.
metadata:
  triggers:
    files:
    - '**/*View.swift'
    - '**/*.xib'
    - '**/*.storyboard'
    keywords:
    - NSLayoutConstraint
    - UIStackView
    - SnapKit
    - layoutSubviews
---
# iOS UI & Layout Standards

## **Priority: P0**

## Implementation Guidelines

### Auto Layout

- **Code-Based Layout**: Prefer programmatic layout using `NSLayoutAnchor` or SnapKit over Storyboards for better source control.
- **Safe Area**: Always respect `view.safeAreaLayoutGuide`.
- **UIStackView**: Use for linear layouts to reduce constraint complexity.

### UIKit Best Practices

- **View Lifecycle**: Perform layout adjustments in `viewWillLayoutSubviews` or `updateConstraints`.
- **Reusable Views**: Extract complex UI into custom `UIView` subclasses.
- **Image Optimization**: Use SF Symbols for icons. Preferred vector (PDF/SVG) for custom assets.
- **SwiftUI Bridge**: Use `UIViewRepresentable` or `UIViewControllerRepresentable` to host UIKit in SwiftUI.

### Human Interface Guidelines (HIG)

- **Accessibility**: Support Dynamic Type and provide meaningful `accessibilityLabel`.
- **Feedback**: Use `UINotificationFeedbackGenerator` for haptic feedback on actions.
- **Margins**: Follow standard system margins (typically 16-20pt).

## Anti-Patterns

- **No CGRect(x:y:w:h)**: Use Auto Layout.
- **No complex constraint logic in VC**: Use UIStackView or custom views.
- **No Blank Screens**: Use skeleton views or UIActivityIndicatorView.

## References

- [Auto Layout & HIG Compliance](references/implementation.md)