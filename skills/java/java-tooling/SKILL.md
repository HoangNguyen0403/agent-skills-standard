---
name: java-tooling
description: "Standards for Maven, Gradle, and static analysis in Java projects. Use when setting up Java build tooling, configuring Spotless or Checkstyle, managing JDK versions with sdkman, writing Dockerfiles for Java services, or adding SpotBugs/SonarLint. (triggers: pom.xml, build.gradle, build.gradle.kts, mvnw, gradlew, .sdkmanrc, spotbugs, checkstyle, spotless, eclipse-temurin)"
---

# Java Tooling Standards

## **Priority: P2 (RECOMMENDED)**

Standardized build and tooling configuration for consistent environments.

## Implementation Guidelines

- **JDK Management**: Use `.sdkmanrc` or `.java-version` to lock JDK versions (Target LTS: 17 or 21).
- **Maven**: Use `pom.xml` with `<dependencyManagement>` for version control. Use wrapper (`mvnw`).
- **Gradle**: Prefer Kotlin DSL (`build.gradle.kts`). Use version catalogs (`libs.versions.toml`). Use wrapper (`gradlew`).
- **Linter**: Use **Spotless** or **Checkstyle** (Google Style) to enforce formatting.
- **Static Analysis**: Integrate **SpotBugs** or **SonarLint** for deeper issue detection.
- **Docker**: Use multi-stage builds. Use `eclipse-temurin` or `distroless` images.

## Anti-Patterns

- **No Global Installs**: Always use mvnw/gradlew wrappers; never rely on system Maven/Gradle.
- **No Fat Jars**: Prefer layered Docker images over uber-jars for better layer caching.
- **No Snapshots in Prod**: Never use -SNAPSHOT dependency versions in production builds.

## References

- [Gradle Kotlin DSL & Spotless Setup](references/example.md)
