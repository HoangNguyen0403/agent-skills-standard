---
name: dart-tooling
description: "Dart static analysis, linting, formatting, and code-generation standards. Use when touching analysis_options.yaml, running build_runner, configuring dart format line length, setting up DCM metrics, or adding pre-commit hooks via lefthook — and whenever a CI job fails on analyze or format steps. (triggers: analysis_options.yaml, build.yaml, build_runner, lefthook.yml, dart format, dart_code_metrics)"
---

# Tooling & CI

## **Priority: P1 (HIGH)**

Standards for code quality, formatting, and generation.

## Implementation Guidelines

- **Linter**: Use `analysis_options.yaml`. Enforce `always_use_package_imports` and `require_trailing_commas`.
- **Formatting**: Use `dart format . --line-length 80`. Run on every commit.
- **DCM**: Use `dart_code_metrics` for complexity checks (Max cyclomatic complexity: 15).
- **Build Runner**: Always use `--delete-conflicting-outputs` with code generation.
- **CI Pipeline**: All PRs MUST pass `analyze`, `format`, and `test` steps.
- **Imports**: Group imports: `dart:`, `package:`, then relative.
- **Documentation**: Use `///` for public APIs. Link symbols using `[Class]`.
- **Linting Commands**:
  - `flutter analyze --fatal-infos --fatal-warnings`
  - `dart run dart_code_metrics:metrics analyze lib`
- **Pre-commit**: Keep `lefthook.yml` in sync with analyze/format/metrics commands.

## Code

```yaml
# analysis_options.yaml
analyzer:
  errors:
    todo: ignore
    missing_required_param: error
linter:
  rules:
    - prefer_single_quotes
    - unawaited_futures
```

## Anti-Patterns

- ❌ `dart run build_runner build` without `--delete-conflicting-outputs` — causes stale generated file conflicts that break compilation
- ❌ Running `flutter build` before `flutter analyze` — analyze is fast and cheap; always fail fast by running it first
- ❌ `// ignore: lint_rule` without an explanation comment — always annotate why the ignore is justified
- ❌ Skipping `dart format` in pre-commit — unformatted code breaks CI; enforce via `lefthook.yml`

## Related Topics

language | testing
