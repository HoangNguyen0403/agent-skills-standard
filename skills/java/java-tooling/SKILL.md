---
name: java-tooling
description: Configure Maven, Gradle, and static analysis for Java projects. Use when setting up Java build tooling, configuring Spotless or Checkstyle, managing JDK versions with sdkman, writing Dockerfiles for Java services, or adding SpotBugs/SonarLint.
metadata:
  triggers:
    files:
    - 'pom.xml'
    - 'build.gradle'
    - 'build.gradle.kts'
    - '.sdkmanrc'
    keywords:
    - mvnw
    - gradlew
    - spotbugs
    - checkstyle
    - spotless
    - eclipse-temurin
---
# Java Tooling Standards

## **Priority: P2 (RECOMMENDED)**


## Implementation Guidelines

- **JDK Setup**: Use **`.sdkmanrc`** or **`.java-version`** to lock project to **LTS Support (17 or 21)**. Configure Gradle toolchain via `java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }` for reproducible builds.
- **Maven & Wrapper**: Use **`pom.xml`** with **`<dependencyManagement>`**. ALWAYS use **`mvnw`** wrapper.
- **Gradle & Catalog**: Prefer **`build.gradle.kts`** (Kotlin DSL) with **`libs.versions.toml`** (Version Catalog). Use **`gradlew`** wrapper.
- **Formatting**: Enforce **Google Style Guide** using **`Spotless`** (`googleJavaFormat()` plugin) or **`Checkstyle`**.
- **Static Analysis**: Integrate **`SpotBugs`** or **`SonarLint`** for deep analysis. Use **`Detekt`** if using Kotlin.
- **Docker**: Use **Multi-stage Dockerfiles**. Use **`eclipse-temurin`** as base image.
- **CI/CD**: Configure **GitHub Actions** or **GitLab CI** to run `mvnw test` or `gradlew build` on every PR.

## Anti-Patterns

- **No Global Installs**: Always use mvnw/gradlew wrappers; never rely on system Maven/Gradle.
- **No Fat Jars**: Prefer layered Docker images over uber-jars for better layer caching.
- **No Snapshots in Prod**: Never use -SNAPSHOT dependency versions in production builds.

## References

- [Gradle Kotlin DSL & Spotless Setup](references/example.md)