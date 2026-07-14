# Configure Detekt size limits

Apply the Detekt Gradle plugin, configure the `LongMethod` and `LargeClass` rules, and leave `ignoreFailures` disabled. For a Kotlin Android module using Gradle Kotlin DSL:

```kotlin
// app/build.gradle.kts (or the relevant module)
plugins {
    id("io.gitlab.arturbosch.detekt") version "<detekt-version>"
}

detekt {
    buildUponDefaultConfig = true
    config.setFrom(files("$rootDir/config/detekt/detekt.yml"))
    ignoreFailures = false
}

// Ensure the normal build/check lifecycle runs Detekt.
tasks.named("check") {
    dependsOn("detekt")
}
```

Create the referenced configuration file:

```yaml
# config/detekt/detekt.yml
complexity:
  LongMethod:
    active: true
    threshold: 30
  LargeClass:
    active: true
    threshold: 300
```

`threshold` is the maximum allowed count, so a method over 30 lines or a class over 300 lines produces a finding. Detekt exits unsuccessfully when findings remain because `ignoreFailures` is `false`; consequently `./gradlew detekt` (and `./gradlew check` or `./gradlew build` when the task is wired into `check`) fails the build.

Use a pinned Detekt version compatible with the project's Kotlin and Gradle versions. If the project uses a baseline file, remember that baseline entries can intentionally hide these findings; remove stale `LongMethod` or `LargeClass` entries if the limits are meant to be enforced immediately. It is also useful to enable configuration validation so misspelled rule keys do not silently undermine the policy.

