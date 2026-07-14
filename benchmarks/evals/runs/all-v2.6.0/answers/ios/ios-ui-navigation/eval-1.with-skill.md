For iOS UI navigation, favor UIKit patterns that are predictable, accessible, and easy to maintain.

Use programmatic layout instead of hard-coded frames. Build screens with Auto Layout, preferably `NSLayoutAnchor` or SnapKit, and constrain content to `view.safeAreaLayoutGuide`. For simple vertical or horizontal groups, prefer `UIStackView` so the constraint graph stays small and readable.

For navigation, use standard UIKit containers such as `UINavigationController` and keep flows aligned with Apple Human Interface Guidelines. Respect standard system spacing, usually around 16 to 20 points, and avoid custom navigation behavior unless there is a strong product reason.

Keep layout responsibilities in the right place. Do view hierarchy setup in dedicated helpers, and perform layout-related adjustments in `viewWillLayoutSubviews` or `updateConstraints` when needed. If a screen contains a dense or repeated UI section, extract it into a reusable `UIView` subclass rather than letting the view controller grow complex.

Make the interface feel native and inclusive. Support Dynamic Type, add meaningful `accessibilityLabel` values, and use haptics like `UINotificationFeedbackGenerator` for important actions or confirmation states.

For assets, prefer SF Symbols where possible, and use vector assets for custom icons. Avoid blank loading states; show a spinner or skeleton state while content is being prepared.

In short: use UIKit navigation containers, safe-area-aware Auto Layout, stack views for linear composition, reusable views for complexity, and HIG-aligned accessibility and feedback throughout.

