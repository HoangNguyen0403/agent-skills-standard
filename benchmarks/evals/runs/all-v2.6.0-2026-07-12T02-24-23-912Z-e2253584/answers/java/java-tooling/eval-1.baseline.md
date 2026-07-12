Use Spotless with the Google Java Format engine and wire its check task into the normal verification lifecycle. For a Gradle Groovy build:

```groovy
plugins {
    id 'java'
    id 'com.diffplug.spotless' version '6.25.0'
}

spotless {
    java {
        googleJavaFormat('1.22.0')
        removeUnusedImports()
        trimTrailingWhitespace()
        endWithNewline()
    }
}

tasks.named('check') {
    dependsOn 'spotlessCheck'
}
```

Developers can run `./gradlew spotlessApply` to format files locally. CI should run `./gradlew check`; `spotlessCheck` then fails when formatting is not compliant. Commit the Gradle wrapper so everyone uses the same Gradle version, and pin plugin/tool versions rather than relying on machine-global installations. If formatting an existing codebase, apply it once and review the resulting formatting-only change before enforcing the check.
