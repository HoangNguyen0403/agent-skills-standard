# Add Ktlint to an Android project

The usual Gradle integration is the `org.jlleitschuh.gradle.ktlint` plugin. Apply a version compatible with the project's Gradle/Kotlin toolchain and pin the Ktlint engine version rather than relying on an accidental upgrade:

```kotlin
// app/build.gradle.kts (or the shared convention plugin)
plugins {
    id("org.jlleitschuh.gradle.ktlint") version "<plugin-version>"
}

ktlint {
    android.set(true)
    version.set("<ktlint-version>")
    outputToConsole.set(true)
    ignoreFailures.set(false)
}

// Make formatting checks part of the normal verification lifecycle.
tasks.named("check") {
    dependsOn("ktlintCheck")
}

// Android projects have a preBuild task. This formats sources before each
// Android build; use ktlintCheck instead if builds must never modify files.
tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn("ktlintFormat")
}
```

The plugin supplies tasks such as `ktlintCheck` and `ktlintFormat`. Run `./gradlew ktlintFormat` directly to format, `./gradlew ktlintCheck` to check without modifying files, and `./gradlew build` to run the normal build with the configured hooks. Add a project `.editorconfig` to make style choices explicit, for example:

```ini
[*.{kt,kts}]
indent_size = 4
insert_final_newline = true
ij_kotlin_code_style_defaults = KOTLIN_OFFICIAL
```

Auto-formatting on every build is convenient locally but has an important cost: a build changes tracked source files and can hide formatting problems. A safer team setup is to run `ktlintFormat` on demand or as an IDE save action, make `ktlintCheck` a `check`/CI gate, and never use formatting as a CI build dependency. If the requirement really is automatic local formatting, keep the `preBuild -> ktlintFormat` dependency above and ensure the subsequent `check` still runs `ktlintCheck`.

