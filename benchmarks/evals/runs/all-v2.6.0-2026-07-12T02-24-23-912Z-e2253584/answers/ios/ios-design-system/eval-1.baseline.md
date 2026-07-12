Implement an iOS design system as a small, opinionated layer on top of native UIKit or SwiftUI patterns rather than a separate visual framework.

Start with foundations:
- color tokens for semantic roles like primary, background, success, warning, error
- typography tokens mapped to Dynamic Type text styles
- spacing and sizing scales
- radius, elevation, borders, and opacity rules
- motion, timing, and haptic guidance

Use semantic naming instead of raw values. For example, prefer `textPrimary` over `#111111`, because semantic tokens survive rebrands and theme changes better.

Build components from those foundations:
- buttons
- text fields
- list items
- cards
- modals
- tabs
- navigation patterns
- empty, loading, and error states

For each component, define:
- variants
- sizes
- interaction states
- accessibility behavior
- content rules
- examples of correct and incorrect usage

Follow Apple conventions closely. A strong iOS design system should feel native first, branded second. Reuse SF Symbols, Human Interface Guidelines patterns, platform spacing rhythms, and standard gestures unless there is a clear product reason not to.

Accessibility should be built in from the start:
- support Dynamic Type
- maintain sufficient contrast
- expose proper VoiceOver labels and traits
- keep tap targets large enough
- avoid color-only meaning

For engineering, make the system easy to consume:
- centralize tokens
- keep APIs consistent
- document usage with previews or screenshots
- include sample screens using real composition
- version changes carefully to avoid breaking product teams

If using SwiftUI, encode the system through theme primitives, custom view modifiers, and reusable components. If using UIKit, provide shared style helpers, token accessors, and base components with clear extension points.

A good rule: optimize for consistency, accessibility, and native feel before visual novelty. That usually produces the most durable iOS design system.

