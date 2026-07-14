Use `analysis_options.yaml` as the central place for analyzer rules and plugin configuration. One practical setup is:

```yaml
include: package:lints/recommended.yaml

analyzer:
  errors:
    missing_required_param: error
    missing_return: error
  plugins:
    - dart_code_metrics

linter:
  rules:
    - require_trailing_commas
    - prefer_single_quotes

dart_code_metrics:
  rules:
    - avoid-unused-parameters
    - avoid-non-null-assertion
    - member-ordering
```

What this does:

- `require_trailing_commas` enforces trailing commas where the linter expects them, which also improves formatter output for multiline widget trees and collections.
- `prefer_single_quotes` prefers `'text'` unless double quotes are required.
- `missing_required_param: error` upgrades missing required parameters from a softer diagnostic to a build-breaking analyzer error.
- `plugins: - dart_code_metrics` enables the metrics plugin so its rules run during analysis.

To make this work in practice:

1. Add the dependencies in `pubspec.yaml` under `dev_dependencies`, typically `lints` and `dart_code_metrics`.
2. Run `dart pub get`.
3. Run `dart analyze` to confirm both built-in lints and `dart_code_metrics` rules are active.

Notes:

- If this is a Flutter project, the same `analysis_options.yaml` pattern works; you can swap the included base ruleset to `package:flutter_lints/flutter.yaml` if desired.
- “Trailing commas” in Dart are best enforced through the linter plus `dart format`; the formatter will then produce the expected multiline style consistently.
- If your team wants stricter gating in CI, run `dart analyze` and fail the pipeline on any analyzer or metric violation.

