# Repair Catalog

- SELECTOR_DRIFT -> move the locator up the ladder in `quality-engineering-selector-stability`
  (e.g. `getByTestId` if the role/label changed; a new `data-testid` if the
  ladder itself has no stable target — route the missing id to
  `specialist-testid-inserter`, Phase P1).
- TIMING_SYNC -> replace `sleep`/`waitForTimeout` with an explicit wait for the
  actual state (`expect(locator).toBeVisible()`, `waitForExistence(timeout:)`,
  `IdlingResource`), never a longer sleep.
- DATA_ENV -> fix the fixture/seed/env value the test depends on; do not change
  the assertion to match broken data.
- INFRA -> retry once, only for this class; if it recurs, `QUARANTINE_CANDIDATE`
  and route to `quality-engineering-flaky-triage` (Phase P3), not a silent retry loop.
