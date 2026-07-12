Set up `lefthook` so every commit runs formatting first and analysis second. That blocks unformatted or analyzer-broken Dart code before it ever reaches a PR.

Example `lefthook.yml`:

```yaml
pre-commit:
  parallel: false
  commands:
    dart-format:
      run: dart format . --line-length 80
    flutter-analyze:
      run: flutter analyze --fatal-infos --fatal-warnings
```

Why this shape is good:

- `dart format . --line-length 80` enforces the project formatting standard automatically.
- `flutter analyze --fatal-infos --fatal-warnings` turns warnings and infos into commit-blocking failures, which keeps CI surprises low.
- Running format before analyze ensures the analyzer sees the final formatted source.
- `parallel: false` keeps the sequence deterministic and easier to debug.

Recommended follow-through:

- Keep the hook commands aligned with CI so local behavior matches pull-request enforcement.
- If the repo also uses `dart_code_metrics`, add it to the same hook rather than letting complexity checks exist only in CI.

For example:

```yaml
    dcm:
      run: dart run dart_code_metrics:metrics analyze lib
```

With this in place, contributors do not have to remember formatting and analysis manually; the hook enforces both consistently on every commit.

