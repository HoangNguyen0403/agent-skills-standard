Use the Jlleitschuh Ktlint Gradle plugin, enable Android-aware formatting, and make formatting/checking explicit Gradle tasks:

```kotlin
plugins {
    id("com.android.application")
    kotlin("android")
    id("org.jlleitschuh.gradle.ktlint") version "12.1.2"
}

ktlint {
    android.set(true)
    outputToConsole.set(true)
    ignoreFailures.set(false)
}

// Android's preBuild task runs before compilation, so this formats each build.
tasks.named("preBuild") {
    dependsOn("ktlintFormat")
}

// Keep the non-mutating quality gate in the normal verification lifecycle.
tasks.named("check") {
    dependsOn("ktlintCheck")
}
```

Use `./gradlew ktlintFormat` to format on demand and `./gradlew ktlintCheck` to verify formatting without changing files. A lightweight pre-commit hook can run `./gradlew ktlintFormat`; the pull-request pipeline should run `ktlintCheck` together with Detekt, Android Lint, and unit tests. Do not manually reformat source; let Ktlint apply the configured formatting, and enable IDE format-on-save for immediate feedback.

