Add a `.swiftlint.yml` file at the project root and configure the rules intentionally:

```yaml
disabled_rules:
  - line_length
opt_in_rules:
  - empty_count
```

Run SwiftLint locally and in CI, and treat compiler warnings as errors in CI. Prefer fixing the underlying violation over scattering `// swiftlint:disable` comments. Keep configuration versioned with the project so every developer and build uses the same quality rules.


