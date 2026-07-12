Install SwiftLint in a reproducible way for the project, add a `.swiftlint.yml` at the repository root, and run it locally and in CI. A minimal configuration might be:

```yaml
included:
  - Sources
  - Tests
excluded:
  - .build
  - DerivedData
opt_in_rules:
  - empty_count
```

Configure only rules that match the team's agreed style, and document justified disables near the code or in the configuration. In Xcode, a Run Script build phase can invoke `swiftlint` (or `swiftlint lint --strict` for enforcement); CI should use a pinned installation/version so local and CI results agree. Treat warnings and errors consistently rather than allowing the build phase to fail unpredictably.

