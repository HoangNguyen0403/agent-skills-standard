```yaml
# analysis_options.yaml
analyzer:
  errors:
    missing_required_param: error
linter:
  rules:
    - require_trailing_commas
    - prefer_single_quotes
```
Then add `dart_code_metrics` as a dev dependency with a max cyclomatic complexity of 15, and run it via `dart run dart_code_metrics:metrics analyze lib`.
