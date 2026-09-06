---
name: quality-engineering-test-healing
description: Failure taxonomy and allowed/forbidden repairs for a failing E2E test. Use when a Playwright/Maestro/Detox/XCUITest/Espresso/Appium test fails and you must decide whether to repair the test or route to a real bug.
metadata:
  triggers:
    files:
      - "test-results/**"
      - "playwright-report/**"
    keywords:
      - heal test
      - failing e2e
      - selector repair
      - test healer
      - fix the test
      - timed out waiting for
---
# Quality Engineering: Test Healing

## **Priority: P0 (CRITICAL)**

## Failure Classes

`SELECTOR_DRIFT` (id/locator changed) · `TIMING_SYNC` (race/wait, no state change) · `DATA_ENV` (fixture/seed/env stale) · `INFRA` (network/runner/flake) · `REAL_REGRESSION` (product behavior actually changed).

Classify from evidence: trace/screenshot/DOM diff supports a drift/timing/data explanation, or the product diff shows an intentional behavior change (REAL_REGRESSION).

## Allowed Repairs

Move the locator up the selector ladder (e.g., `getByRole` if the ID changed); replace a sleep with an explicit state wait; fix a stale fixture/seed; retry only for `INFRA`.

## Forbidden Repairs

Never weaken an assertion. Never add `test.skip`/`fixme` without a ticket + expiry; never skip without these. Never widen a matcher. Never inflate a timeout by more than 2x. Never blind `--update-snapshots`. Never catch-and-continue. Never touch production code — that is `REAL_REGRESSION`, not a heal.

## Verdicts

`HEALED` (repair verified by 3 consecutive green reruns, ASSERTION_DELTA: none) · `REAL_BUG_DO_NOT_HEAL` (route to dev-fix) · `QUARANTINE_CANDIDATE` (flaky, route to flaky-triage) · `BLOCKED` (no evidence artifact).

## Red Flags

"the assertion was too strict anyway" · "the product changed so update the expected value" · "just add retries so it goes green" — do not heal with these rationalizations. All three are `REAL_BUG_DO_NOT_HEAL` or `QUARANTINE_CANDIDATE` in disguise, never `HEALED`.

## References

- [Failure Taxonomy Signals](references/failure-taxonomy.md)
- [Repair Catalog](references/repair-catalog.md)
- [Forbidden Repairs](references/forbidden-repairs.md)
- [Verdict Contract](references/verdict-contract.md)
