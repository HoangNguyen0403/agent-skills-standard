# Mobile Lane Matrix

| App type | Primary tool | Lane value |
|---|---|---|
| Flutter | Patrol (native-aware integration_test) | android / ios (pick per scenario) |
| React Native | Detox | android / ios |
| Native iOS | XCUITest | ios |
| Native Android | Espresso/Compose test | android |
| Cross-platform smoke | Maestro | android / ios (Maestro flows run on both from one YAML) |

A scenario's `lane` value is the platform, not the tool — the tool is chosen
by the generator based on which per-stack testing skill is loaded for the
target repo.
