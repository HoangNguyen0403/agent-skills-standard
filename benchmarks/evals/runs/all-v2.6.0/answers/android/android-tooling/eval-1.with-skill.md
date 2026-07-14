Configure the Detekt complexity rules in the project Detekt config, for example `config/detekt/detekt.yml`:

```yaml
build:
  maxIssues: 0
  weights:
    complexity: 2

complexity:
  LongMethod:
    threshold: 30
  LargeClass:
    threshold: 300
```

`LongMethod.threshold` is the maximum method length and `LargeClass.threshold` is the maximum class length. With `build.maxIssues: 0`, any Detekt issue fails the Detekt task instead of being tolerated.

Wire the config into the Gradle Kotlin DSL and make it part of the normal build:

```kotlin
plugins {
    id("io.gitlab.arturbosch.detekt") version "1.23.1"
}

detekt {
    buildUponDefaultConfig = true
    config.setFrom(files("$projectDir/config/detekt/detekt.yml"))
}

tasks.withType<io.gitlab.arturbosch.detekt.Detekt>().configureEach {
    reports {
        html.required.set(true)
        xml.required.set(false)
        txt.required.set(false)
    }
}

tasks.named("check") {
    dependsOn("detekt")
}
```

Run `./gradlew detekt` locally or `./gradlew check` in CI. The CI gate should run Detekt together with Ktlint, Android Lint, and unit tests; keep Android Lint configured with `abortOnError = true` so warnings/errors cannot be silently accepted.

