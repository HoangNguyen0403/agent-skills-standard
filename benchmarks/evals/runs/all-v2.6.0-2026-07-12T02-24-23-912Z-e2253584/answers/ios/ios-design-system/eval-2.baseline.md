Common anti-patterns in an iOS design system include:

- Hardcoded colors, spacing, fonts, and corner radii scattered across screens instead of using shared tokens
- Duplicated UI components with small local variations rather than one canonical component API
- Overly rigid components that cannot adapt to Dynamic Type, localization, dark mode, or different size classes
- Mixing business logic into UI components, making them hard to reuse and maintain
- Inconsistent naming for tokens, components, and variants
- Poor accessibility support, such as weak contrast, missing VoiceOver labels, or touch targets that are too small
- Ignoring native iOS patterns and forcing custom controls where standard UIKit or SwiftUI behaviors would be clearer
- No clear state model for components, causing inconsistent handling of disabled, loading, selected, or error states
- Version drift between design and code because there is no governance, review process, or documentation
- Lack of migration strategy, so teams bypass the system when updating old screens feels too expensive

A healthy iOS design system stays token-driven, accessible, native-feeling, and easy for product teams to adopt without workarounds.

