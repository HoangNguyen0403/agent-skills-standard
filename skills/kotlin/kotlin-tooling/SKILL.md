---
name: kotlin-tooling
description: Configure Gradle Kotlin DSL, Version Catalogs, and MockK for Kotlin projects. Use when configuring build.gradle.kts, setting up libs.versions.toml, adding MockK for tests, or choosing between Kotlin-compatible test assertion libraries.
metadata:
  triggers:
    files:
    - 'build.gradle.kts'
    - 'libs.versions.toml'
    - 'detekt.yml'
    keywords:
    - mockk
    - kts
    - version catalog
    - kotest
---
# Kotlin Tooling Standards

## **Priority: P2 (RECOMMENDED)**


## Implementation Guidelines

- **Gradle DSL**: Use Kotlin DSL (`build.gradle.kts`) exclusively — type safety and better IDE support.
- **Version Management**: Use Version Catalogs (`libs.versions.toml`).
- **Linter**: Use **Ktlint** for formatting and **Detekt** for complexity/code-smell analysis.
- **Testing**: Use **MockK** for mocking (first-class Kotlin support). Use **JUnit 5**.
- **Assertions**: Use **Truth** or **Kotest Assertions** for fluent, readable test output.

## Anti-Patterns

- **No Groovy Gradle**: Use Kotlin DSL (build.gradle.kts) exclusively; avoid legacy build.gradle.
- **No Mockito in Kotlin**: `when/then` conflicts with Kotlin `when`; use MockK (`every/verify`).
- **No Hardcoded Versions**: Manage all versions in libs.versions.toml; never inline in build files.

## References

- [MockK Templates & libs.versions.toml Setup](references/testing-tooling.md)