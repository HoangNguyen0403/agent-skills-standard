# Tooling Setup

## Detekt Config (`detekt.yml`)

```yaml
build:
  maxIssues: 0
  weights:
    complexity: 2

complexity:
  LongMethod:
    threshold: 50
  LongParameterList:
    functionThreshold: 5
    constructorThreshold: 10
```

## Gradle Setup (build.gradle.kts)

```kotlin
plugins {
    id("io.gitlab.arturbosch.detekt") version "1.23.1"
}

detekt {
    buildUponDefaultConfig = true
    config.setFrom(files("$projectDir/config/detekt/detekt.yml"))
}

tasks.withType<Detekt>().configureEach {
    reports {
        html.required.set(true)
        xml.required.set(false)
        txt.required.set(false)
    }
}
```

## Git Hook (pre-commit)

```bash
#!/bin/sh
echo "Running static analysis..."
./gradlew detekt ktlintCheck
```
