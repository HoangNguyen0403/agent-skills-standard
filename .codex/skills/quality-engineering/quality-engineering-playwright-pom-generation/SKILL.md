---
name: quality-engineering-playwright-pom-generation
description: Generates Playwright page objects from an executable test plan, one class per screen with ladder-compliant locators and no assertions, wired into a shared fixture. Use when a web scenario needs a page object that does not exist yet, or when locators drift and the page object must be rebuilt.
metadata:
  triggers:
    files:
      - "tests/pages/**/*.ts"
      - "**/page-objects/**/*.ts"
      - "**/*.page.ts"
    keywords:
      - page object
      - page object model
      - pom generation
      - generate page objects
      - playwright fixture
      - pages fixture
---
# Quality Engineering: Playwright Page Object Generation

## **Priority: P1 (HIGH)**

## Input

A web-lane scenario block from `docs/srs/test-plan-[slug].md` (`Steps`, `Expected`, `@AC-n`) plus the resolved `SELECTOR_GAPS` for that screen. Generate from the plan, never from a live DOM crawl alone: the plan says which elements matter.

## Layout

- One file per screen: `tests/pages/<screen>.page.ts`, class `<Screen>Page` (e.g. `CheckoutPage`).
- One locator getter per element the plan touches, named after the element (`submitButton`, `emailInput`).
- One action method per plan step verb (`fillShipping(data)`, `submit()`); actions return `void` or the next page object.
- A `pages` fixture in `tests/fixtures.ts` exposes every page object; specs import `test` from there, never from `@playwright/test` directly.

## Locator Rules

Follow the web ladder in `quality-engineering-selector-stability`: `getByRole` / `getByLabel` first, then `getByTestId` using the `<screen>-<element>-<role>` id, then attribute CSS. Never XPath, `nth`, text on translated strings, or generated class names. When the element has no stable locator, do not invent one: record it as a selector gap for `specialist-testid-inserter`.

## Locator vs Sampled Scalar State

- **Lazy Locators for Retrying Expectations**: Page objects expose elements as `Locator` getters (`orderIdBanner`, `submitButton`). Specs assert on locators using web-first retrying assertions (`await expect(pages.checkout.orderIdBanner).toHaveText(...)`). This automatically retries until timeout against delayed text, async rendering, and DOM re-attachment.
- **Sampled Scalar Reads for Point-in-Time Snapshots**: Scalar methods (`await locator.textContent()`, `inputValue()`) capture a single point-in-time value without retrying. Reserve scalar reads for legitimate data extraction (e.g., passing an ID to an API call, logging, or comparing immutable snapshots). Never wrap sampled scalars in non-retrying `expect(val)...` for dynamic or eventual state.

## No Assertions in Page Objects

Page objects expose locators and action methods; specs assert on them. An `expect` inside a page object hides the assertion from the scenario, breaks retrying assertion semantics, and prevents reuse across positive and negative cases.
## Workflow

1. Read the scenario block and the screen's existing page object, if any; extend rather than duplicate.
2. Map each plan step to an existing or new action method; map each `Expected` to a state getter.
3. Write locators per the ladder; list unresolved elements under `Selector Gaps` in the output.
4. Register the page object in the `pages` fixture.
5. Run `npx tsc --noEmit -p tests` (or the repo's typecheck) and the seed spec once.

## Anti-Patterns

- **No assertions in page objects**: `expect` belongs in the spec.
- **No sampled-state race in assertions**: never sample text/value once with `expect(await page.orderId()).toMatch(...)`; assert directly on the locator with `await expect(page.orderIdBanner).toHaveText(...)`.
- **No boolean state wrappers**: avoid wrapping locators in `async isVisible(): Promise<boolean>` methods that strip retrying capability; expose the `Locator` so specs can `await expect(locator).toBeVisible()`.
- **No DOM-crawl page objects**: a class with forty getters nobody's scenario uses is noise, not coverage.
- **No duplicate page object**: search `tests/pages/` before creating; extend the existing class.
- **No raw `page` in specs**: every interaction goes through a page object or the seed.
- **No renamed test ids**: ids are a public contract; a rename is a selector gap, not a refactor.

## References

- [Page Object Template](references/page-object-template.md)
- [Fixture Wiring](references/fixture-wiring.md)
- [Playwright MCP Authoring](references/playwright-mcp-authoring.md)
