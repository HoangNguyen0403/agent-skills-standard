---
name: android-tooling
description: "Configure Static Analysis (Detekt, Ktlint) and CI/CD Checks for Android. Use when adding or tuning Detekt/Ktlint rules, setting Android Lint as a CI gate, suppressing lint warnings with @Suppress, or configuring code quality checks on pull requests. (triggers: build.gradle.kts, detekt.yml, .detekt/config.yml, detekt, ktlint, lint, @Suppress, abortOnError, jlleitschuh)"
---

# Android Tooling Standards

## **Priority: P1**

## Implementation Guidelines

### Static Analysis

- **Detekt**: Enforce code complexity rules (LongMethod, LargeClass). Fail build on high complexity.
- **Ktlint**: Enforce formatting style (Indent, Spacing). Use `jlleitschuh` plugin.
- **Android Lint**: Treat warnings as errors in CI (`abortOnError = true`).

### CI Gates

- **Pre-commit**: Run lightweight checks (formatting) locally.
- **Pipeline**: Run full checks (Detekt + Lint + Unit Tests) on Pull Request.

## Anti-Patterns

- **No @Suppress in Production**: Fix the Detekt/lint violation at source.
- **No Manual Formatting**: Let Ktlint handle it — configure auto-format on save in IDE.

## References

- [Configuration](references/implementation.md)
