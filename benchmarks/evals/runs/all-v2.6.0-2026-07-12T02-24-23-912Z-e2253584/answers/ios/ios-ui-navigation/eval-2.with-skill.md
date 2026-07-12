Common anti-patterns to avoid in iOS UI navigation and layout include:

- Hard-coding frames with `CGRect(...)` instead of using Auto Layout.
- Ignoring the safe area, which can cause content to clash with notches, bars, or device edges.
- Putting complex constraint logic directly inside a view controller instead of using `UIStackView` or custom `UIView` subclasses.
- Overloading view controllers with too much UI composition instead of extracting reusable views.
- Relying heavily on Storyboards when programmatic layout would be easier to maintain in source control.
- Doing layout work in the wrong lifecycle methods instead of `viewWillLayoutSubviews` or `updateConstraints`.
- Creating blank loading states instead of showing a skeleton view or `UIActivityIndicatorView`.
- Skipping accessibility support, such as Dynamic Type or meaningful `accessibilityLabel` values.
- Using inconsistent spacing instead of standard system margins like 16 to 20 points.
- Ignoring platform conventions from Apple’s Human Interface Guidelines, which can make navigation feel unnatural.

In short, avoid brittle layouts, overloaded view controllers, inaccessible UI, and navigation patterns that do not feel native to iOS.

