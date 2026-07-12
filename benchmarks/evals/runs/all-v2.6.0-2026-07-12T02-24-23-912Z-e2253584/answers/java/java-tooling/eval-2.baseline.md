Use Gradle's Java toolchains to make the project request a specific JDK, and commit the Gradle wrapper so the build tool is fixed as well:

```groovy
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

Gradle will select or provision a matching JDK (depending on the configured toolchain repositories). The compiler, test JVM, and `JavaExec` tasks can be made consistent with that toolchain; do not rely on each developer's `JAVA_HOME` alone. In CI, install or provision the same JDK distribution/version and run `./gradlew` rather than a globally installed Gradle.

For an additional developer-environment guard, commit an `.sdkmanrc` such as `java=21.0.3-tem` and have developers run `sdk env install`/`sdk env`. Treat the Gradle toolchain declaration as the build's source of truth, and verify it with `./gradlew -q javaToolchains` when diagnosing mismatches.
