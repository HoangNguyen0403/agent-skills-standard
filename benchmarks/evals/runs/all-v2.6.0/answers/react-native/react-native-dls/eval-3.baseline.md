# Preventing hardcoded styles

Make the design system the easiest path: provide tokenized primitives and documented variants for common cases, with a small reviewed escape hatch for exceptional layouts. Centralize tokens and forbid importing raw palette values into feature components.

Enforce the rule with ESLint/custom lint rules or a repository check that flags hex colors, arbitrary spacing/font sizes, and direct use of disallowed primitives in designated UI directories. Add TypeScript types that accept token keys instead of arbitrary strings/numbers where feasible. Add code-review guidance and component examples, and make design-system changes go through an owner.

Use visual regression tests or representative Storybook/component snapshots for primitives and themes. Run the checks in CI, but document intentional exceptions with a narrowly scoped suppression and rationale so the guardrail does not encourage workarounds. Periodically migrate legacy styles and measure adoption rather than assuming a lint rule alone will create consistency.

