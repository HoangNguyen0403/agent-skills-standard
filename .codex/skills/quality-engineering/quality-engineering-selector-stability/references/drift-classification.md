# Selector Drift Classification

- **rename**: the id string itself changed (e.g. `submit-btn` -> `checkout-submit-button`).
  Consumed by `quality-engineering-test-healing` as `SELECTOR_DRIFT`.
- **restructure**: the element moved in the DOM/widget tree but kept its id;
  a locator scoped to a stale parent breaks even though the id is unchanged.
- **i18n**: visible text changed (translation, copy update) but the id is
  untouched — a text-based locator breaks, an id-based one does not. This is
  the primary argument for the ladder in SKILL.md: text-based locators are the
  most drift-prone class by design.
