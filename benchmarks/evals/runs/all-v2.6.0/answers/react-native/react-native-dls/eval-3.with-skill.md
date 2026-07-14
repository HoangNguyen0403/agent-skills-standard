Make the design system the only source of styling tokens: export colors, spacing, and typography from the theme package and use them in StyleSheet.create or the themed styling layer. Avoid raw color, spacing, and font-size literals in feature components.

Enforce this in CI with an ESLint rule or targeted custom lint rule that flags literal style values, plus code review checks and a small set of approved exceptions. A codemod can migrate existing code, while tests or linting should verify that new components consume tokens instead of bypassing the system.



