Common iOS design-system anti-patterns to avoid:

- **Inconsistent tokens:** Hard-coded colors, spacing, typography, or corner radii instead of centralized design tokens.
- **Global mutable styling:** Relying heavily on `UIAppearance` or global state, causing unintended screen-wide changes.
- **Platform-specific duplication:** Maintaining separate, diverging implementations for UIKit and SwiftUI without shared tokens or behavior.
- **Over-customizing native components:** Replacing `UIButton`, `UINavigationBar`, lists, or system controls when standard components already provide accessibility and platform conventions.
- **Leaky abstractions:** Exposing internal styling details or UIKit implementation choices through every component’s public API.
- **Too many variants:** Creating numerous near-identical components and configuration flags instead of composable primitives.
- **Unclear ownership:** Allowing feature teams to override design-system values arbitrarily, leading to visual drift.
- **Poor state modeling:** Ignoring loading, disabled, focused, selected, error, empty, and pressed states.
- **Accessibility as an afterthought:** Missing Dynamic Type, VoiceOver labels, sufficient contrast, hit targets, Reduce Motion, and Dark Mode support.
- **Unsafe typography:** Fixed font sizes or manual text sizing that breaks with Dynamic Type and localization.
- **Layout assumptions:** Hard-coded widths, fixed heights, or reliance on a specific device size or orientation.
- **Theme coupling:** Embedding light/dark colors directly in components instead of using semantic colors such as `UIColor.label` or asset-catalog color sets.
- **Breaking platform conventions:** Inconsistent navigation, gestures, spacing, modal behavior, or control semantics compared with Apple’s Human Interface Guidelines.
- **Unstable component APIs:** Renaming or changing component behavior frequently without migration guidance or deprecation paths.
- **Insufficient documentation and examples:** Providing visual components without usage rules, accessibility expectations, or do/don’t examples.
- **No visual regression coverage:** Shipping design changes without snapshot tests or systematic checks across devices, themes, and content sizes.
- **Ignoring performance:** Excessive view nesting, expensive modifiers, repeated image work, or unnecessary layout recalculation.
- **No migration strategy:** Requiring consumers to rewrite large parts of the app whenever the design system evolves.
