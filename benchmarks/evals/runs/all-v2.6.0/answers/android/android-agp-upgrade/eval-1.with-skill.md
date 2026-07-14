# Diagnosis

AGP 9 provides built-in Kotlin support. The `org.jetbrains.kotlin.android` plugin is no longer needed, so explicitly applying it causes the plugin application failure after the upgrade.

# Fix

- Remove `org.jetbrains.kotlin.android` from the root and module `plugins` blocks, including its version declaration or alias.
- Check Gradle, JDK, and Kotlin compatibility with the AGP 9 release.
- If the project uses `kapt`, migrate supported processors to KSP; use `legacy-kapt` only for processors without KSP support.
- Migrate any affected `android {}` configuration to the AGP 9 DSL and update custom `BuildConfig` fields.
- Remove obsolete `gradle.properties` flags: `android.builtInKotlin`, `android.newDsl`, `android.uniquePackageNames`, and `android.enableAppCompileTimeRClass`.

Verify without cleaning:

```sh
./gradlew help
./gradlew build --dry-run
```

Also confirm that IDE sync succeeds.

