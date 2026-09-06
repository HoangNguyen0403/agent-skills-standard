---
name: quality-engineering-selector-stability
description: Cross-stack selector and test-id policy for web and mobile automation. Use when writing or reviewing E2E/UI test locators, or adding data-testid/accessibility identifiers to components.
metadata:
  triggers:
    files:
      - "**/e2e/**/*.{ts,js}"
      - "**/*.e2e.{ts,js}"
    keywords:
      - selector
      - locator
      - data-testid
      - testID
      - accessibilityIdentifier
      - testTag
      - stable locator
      - selector drift
---
# Quality Engineering: Selector Stability

## **Priority: P0 (CRITICAL)**

## Web Ladder

`getByRole` / `getByLabel` > `getByTestId` (`data-testid`) > attribute CSS. Never XPath, `nth-child`, or generated class names.

## Mobile Ladder

Accessibility id > resource-id / `testTag` > predicate/uiautomator > XPath. Never XPath.

## Framework Map

- React/Next.js: `data-testid`. React Native: `testID` + `accessibilityLabel`.
- Flutter: `Semantics(identifier:)` for black-box E2E; `WidgetKeys` stay for widget tests.
- SwiftUI/UIKit: `.accessibilityIdentifier`. Compose: `Modifier.testTag` + `testTagsAsResourceId = true`.

## Naming

`<screen>-<element>-<role>`, kebab-case (e.g. `checkout-submit-button`).

## Insertion Policy

Add ids to leaf interactive/assertable elements only, never layout wrappers. Never rename an existing id — ids are a public contract other tests depend on.

## Drift Classes

`rename` (id changed), `restructure` (DOM/tree moved), `i18n` (visible text changed, id untouched).

## Anti-Patterns

- Text selectors on translated strings, index-based locators (`nth`), generated/hashed class names.
- Using `accessibilityLabel` as a test id (it is user-facing a11y text, not a stable identifier).
- "xpath just for now" — there is no temporary XPath; use the ladder from the first commit.

## References

- [Selector Ladder Details](references/selector-ladder.md)
- [Test-ID Naming](references/testid-naming.md)
- [Insertion Policy](references/insertion-policy.md)
- [Drift Classification](references/drift-classification.md)
