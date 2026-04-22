---
name: android-tooling
description: Configure static analysis with Detekt, Ktlint, and Android Lint for CI/CD quality gates. Use when adding lint rules, configuring code quality checks, or setting up analysis as a CI gate.
metadata:
  triggers:
    files:
    - 'build.gradle.kts'
    - 'detekt.yml'
    - '.detekt/config.yml'
    keywords:
    - detekt
    - ktlint
    - lint
    - "@Suppress"
    - abortOnError
    - jlleitschuh
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

- **No @Suppress in Production**: Fix Detekt/lint violation at source.
- **No Manual Formatting**: Let Ktlint handle it — configure auto-format on save in IDE.

## References

- [Configuration](references/implementation.md)