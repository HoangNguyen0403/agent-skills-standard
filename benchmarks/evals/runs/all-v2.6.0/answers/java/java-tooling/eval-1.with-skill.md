Use the Gradle wrapper and make Spotless part of the normal verification lifecycle.

In `build.gradle.kts`, apply a pinned Spotless plugin version and configure Google Java Format:

```kotlin
plugins {
    id("com.diffplug.spotless") version "<approved-version>"
}

spotless {
    java {
        googleJavaFormat()
        target("src/**/*.java")
    }
}

tasks.named("check") {
    dependsOn("spotlessCheck")
}
```

Developers can run `./gradlew spotlessApply` to fix formatting and `./gradlew spotlessCheck` to verify it. Run `./gradlew check` in CI so a formatting violation fails the build; use `./gradlew` rather than a globally installed Gradle.
