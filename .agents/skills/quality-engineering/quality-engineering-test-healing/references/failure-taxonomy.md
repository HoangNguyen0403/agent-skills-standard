# Failure Taxonomy — Signals Per Tool

| Class | Playwright signal | Maestro signal | Detox signal | XCUITest signal | Espresso signal | Appium signal |
|---|---|---|---|---|---|---|
| SELECTOR_DRIFT | `locator not found`, strict-mode violation | `Element not found: id: ...` | `NSInternalInconsistencyException`/`by.id` not found | `No matches found for ... accessibilityIdentifier` | `NoMatchingViewException` | `NoSuchElementException` |
| TIMING_SYNC | `Timeout exceeded waiting for element`, no DOM diff | `Timeout waiting for ...`, element appears seconds after | `waitFor(...).withTimeout()` fired | `waitForExistence timeout`, element appears later | `IdlingResource` never idles | `TimeoutException`, retry succeeds without change |
| DATA_ENV | assertion mismatch on seeded value | flow references stale fixture/env var | seeded test data missing | launchArguments missing test flag | Room/DB seed missing | test data missing on device |
| INFRA | network error / worker crash, unrelated to app | device/emulator unresponsive | build/provisioning failure | simulator boot failure | Gradle Managed Device timeout | Appium session drop |
| REAL_REGRESSION | assertion mismatch, product diff shows intentional change | assertVisible fails, screenshot shows new UI/behavior | expected value changed by design | product diff confirms new behavior | product diff confirms new behavior | product diff confirms new behavior |
