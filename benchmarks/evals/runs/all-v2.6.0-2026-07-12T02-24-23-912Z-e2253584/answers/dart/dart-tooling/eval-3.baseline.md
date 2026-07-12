Add a Lefthook pre-commit hook that runs formatting and analysis before Git accepts the commit.

Example `lefthook.yml`:

```yaml
pre-commit:
  parallel: false
  commands:
    dart-format:
      glob: "*.{dart}"
      run: dart format --set-exit-if-changed {staged_files}
    flutter-analyze:
      run: flutter analyze
```

How it works:

- `dart format --set-exit-if-changed` fails if staged Dart files are not already formatted, which prevents the commit from going through.
- `flutter analyze` runs static analysis for the whole project and blocks the commit on errors.

Setup steps:

1. Install Lefthook for your environment.
2. Add a `lefthook.yml` file at the repository root.
3. Run:

```bash
lefthook install
```

4. Test it by making an intentionally unformatted Dart change and attempting a commit.

A few practical notes:

- If this is a pure Dart project rather than Flutter, replace `flutter analyze` with `dart analyze`.
- Using `{staged_files}` keeps formatting focused on files involved in the commit, which is faster and reduces unrelated churn.
- `parallel: false` is safer here because formatting may change files before analysis runs.

If you want the hook to auto-fix formatting instead of just failing, you can use:

```yaml
pre-commit:
  parallel: false
  commands:
    dart-format:
      glob: "*.{dart}"
      run: dart format {staged_files} && git add {staged_files}
    flutter-analyze:
      run: flutter analyze
```

That version reformats staged Dart files and re-adds them automatically, while still blocking the commit if analysis fails.

