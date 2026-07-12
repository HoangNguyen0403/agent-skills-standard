Use `analysis_options.yaml` as the single source of truth for linting and analyzer behavior, and add `dart_code_metrics` so complexity checks run alongside normal analysis.

Example setup:

```yaml
analyzer:
  errors:
    missing_required_param: error
    todo: ignore

linter:
  rules:
    - prefer_single_quotes
    - require_trailing_commas
    - always_use_package_imports
    - unawaited_futures
```

Then add `dart_code_metrics` to `dev_dependencies` and configure it so complexity violations are visible in CI and local checks:

```yaml
dart_code_metrics:
  metrics:
    cyclomatic-complexity: 15
```

Recommended commands:

```bash
flutter analyze --fatal-infos --fatal-warnings
dart run dart_code_metrics:metrics analyze lib
dart format . --line-length 80
```

Why this setup works:

- `missing_required_param: error` upgrades a correctness issue into a hard failure.
- `prefer_single_quotes` and `require_trailing_commas` keep style consistent and reduce noisy diffs.
- `always_use_package_imports` avoids inconsistent import styles in larger Dart codebases.
- `dart_code_metrics` adds structural checks that the default analyzer does not cover, especially around complexity.

If this is going into CI, make `analyze`, `format`, and `test` all required so style drift or analyzer regressions fail before merge.

