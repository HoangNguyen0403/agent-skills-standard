---
name: android-agp-upgrade
description: Upgrade an Android project to Android Gradle Plugin (AGP) 9. Use when migrating to AGP 9, updating Gradle build files, migrating to built-in Kotlin, or adopting the new AGP DSL.
metadata:
  triggers:
    files:
    - 'build.gradle.kts'
    - 'build.gradle'
    - 'settings.gradle.kts'
    - 'gradle.properties'
    keywords:
    - AGP 9
    - AGP upgrade
    - Gradle plugin
    - built-in Kotlin
    - new DSL
    - migrate AGP
---
# AGP 9 Upgrade Workflow

## **Priority: P1**

Step-by-step workflow for upgrading an Android project to AGP 9.

## Prerequisites

- Check current AGP version. If below 8.x, recommend running the AGP Upgrade Assistant in Android Studio first.
- Do NOT use this skill for Kotlin Multiplatform (KMP) projects.
- Verify Gradle, JDK, and Kotlin version compatibility with AGP 9 release notes.

## Step 1: Update dependencies

- If KSP (`com.google.devtools.ksp`) is used, ensure version 2.3.6+.
- If Hilt is used, ensure version 2.59.2+.
- Update AGP to the latest stable 9.x version in the project's build files.

## Step 2: Migrate to built-in Kotlin

AGP 9 includes built-in Kotlin support — the `org.jetbrains.kotlin.android` plugin is no longer needed.

See [migration guide](references/built-in-kotlin.md) for detailed steps.

## Step 3: Migrate to the new AGP DSL

AGP 9 introduces a new DSL for `android {}` blocks. Key changes include namespace handling, build type configuration, and source set declarations.

See [DSL migration](references/dsl-migration.md) for before/after examples.

## Step 4: Migrate kapt to KSP or legacy-kapt

If the project uses `kapt`:
- Prefer migrating to KSP where annotation processors support it (Room, Hilt, Moshi).
- For processors without KSP support, use `legacy-kapt` as a bridge.

## Step 5: Update BuildConfig

If any module uses custom `BuildConfig` fields, update to the new AGP 9 syntax.

## Step 6: Clean up gradle.properties

Remove these flags after migration:
1. `android.builtInKotlin`
2. `android.newDsl`
3. `android.uniquePackageNames`
4. `android.enableAppCompileTimeRClass`

## Guidelines

- Never write or run Python scripts for build migration.
- Never add `android.disallowKotlinSourceSets=false` to `gradle.properties`.
- Do not run `clean` task when verifying — it wastes time.

## Verification

1. `./gradlew help` succeeds.
2. `./gradlew build --dry-run` succeeds.
3. Gradle IDE sync succeeds.

## References

- [Built-in Kotlin Migration](references/built-in-kotlin.md)
- [DSL Migration Guide](references/dsl-migration.md)
