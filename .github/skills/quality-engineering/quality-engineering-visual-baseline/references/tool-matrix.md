# Tool Matrix

| Stack | Assertion | Baseline folder | Mask support | Threshold option | Scoped update |
| --- | --- | --- | --- | --- | --- |
| Playwright | `expect(page).toHaveScreenshot()` | `<spec>-snapshots/` | `mask: [locator]` | `maxDiffPixelRatio`, `threshold` | `--update-snapshots --grep` |
| Jest + jest-image-snapshot | `expect(img).toMatchImageSnapshot()` | `__image_snapshots__/` | pre-crop only | `failureThreshold`, `failureThresholdType` | `-u -t "<name>"` |
| Detox | `expect(element).toMatchImageSnapshot()` via plugin, or `device.takeScreenshot()` + jest-image-snapshot | `__image_snapshots__/` | pre-crop | as Jest | as Jest |
| Maestro | `assertVisible` + `takeScreenshot` compared in CI by a script | `screenshots/` | crop by script | script-defined | rerun the flow only |
| XCUITest | `XCTAttachment` screenshots compared with swift-snapshot-testing `assertSnapshot(as: .image(precision:))` | `__Snapshots__/` | `precision`, `perceptualPrecision` | `precision` | record mode per test |
| Espresso / Compose | Roborazzi `captureRoboImage()` (Paparazzi: `paparazzi.snapshot(view)`) | `src/test/snapshots/` | compose `Modifier.testTag` regions cropped | `RoborazziOptions.CompareOptions(changeThreshold)` | `recordRoborazzi` per test class |

Rules common to every row:

- Capture in the CI image (Docker or hosted runner) and record which image tag the baseline came from.
- Baselines for different viewports, themes, and locales are different files, never one file with a wide threshold.
- The healer treats any screenshot assertion failure as `VISUAL_DIFF` and applies this skill before deciding `REAL_REGRESSION`.
