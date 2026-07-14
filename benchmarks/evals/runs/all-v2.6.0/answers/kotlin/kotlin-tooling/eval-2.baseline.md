Use a Gradle version catalog, normally `gradle/libs.versions.toml`, for shared plugin and dependency versions:

```toml
[versions]
kotlin = "2.x.x"
coroutines = "1.x.x"

[libraries]
coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "coroutines" }
```

Reference the aliases from each Kotlin DSL build file, such as `implementation(libs.coroutines.core)`. Centralize plugin versions in the catalog as well, and use convention plugins for shared build configuration. Keep module-specific dependencies local and update versions in one place. The exact catalog syntax can vary with the Gradle version, so validate with the project wrapper.
