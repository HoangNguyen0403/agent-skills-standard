# Migrating an Android project to AGP 9

Use a small, reviewable upgrade and keep the project compiling after each major change.

1. **Inventory the project and read the AGP 9 release notes.** Check the current Android Gradle Plugin, Gradle wrapper, Android Studio, JDK, Kotlin, KSP/KAPT, Compose, and third-party Gradle plugins. Identify deprecated AGP APIs and plugins that may not yet support AGP 9.

2. **Create a clean upgrade branch and make the current build reproducible.** Run the existing unit, instrumentation, and lint checks first. Commit or otherwise preserve the working state so the migration can be bisected or rolled back.

3. **Install a compatible Android Studio and JDK.** Use the Android Studio release listed as compatible with your selected AGP 9 version. Run Gradle with the required JDK (AGP 9 requires Java 17 or newer; use the exact requirement for the selected patch release).

4. **Upgrade the Gradle wrapper.** Set `gradle-wrapper.properties` to the Gradle version required by the exact AGP 9 release. For AGP 9.0, this is typically Gradle 9.1; verify the patch-level compatibility table rather than guessing.

5. **Upgrade the Android Gradle Plugin.** Change every application/library plugin declaration, including convention plugins and version catalogs, to the same compatible AGP 9 version, for example:

   ```kotlin
   plugins {
       id("com.android.application") version "9.0.0" apply false
       id("com.android.library") version "9.0.0" apply false
   }
   ```

   Keep `google()` in `pluginManagement` and dependency repositories, and update any third-party plugin whose compatibility range excludes AGP 9.

6. **Handle AGP 9’s built-in Kotlin support.** AGP 9 can provide Kotlin support for Android modules without applying `org.jetbrains.kotlin.android`/`kotlin-android`. Remove that plugin from ordinary Android application and library modules, and remove the separately managed Kotlin Gradle plugin version if it is no longer needed. Migrate old `kotlinOptions {}` configuration to the current Kotlin compiler-options DSL and keep JVM target/toolchain settings consistent.

   Do not remove Kotlin plugins blindly: Kotlin Multiplatform, KAPT, or other Kotlin Gradle Plugin integrations may require a different migration. Prefer KSP over KAPT where the processors support it, or follow the documented opt-out/compatibility path for the exact AGP 9 release.

7. **Update module build scripts.** Fix removed or changed AGP APIs and DSLs, including old variant and publishing APIs, deprecated configurations, manifest/package assumptions, and custom task wiring. Ensure every Android module has an explicit `namespace`, uses supported `compileSdk`/`targetSdk` values, and does not rely on internal AGP classes.

8. **Update build tooling and dependencies.** Upgrade Android Studio tooling, Compose/Kotlin integration, KSP, annotation processors, test libraries, and any Android Gradle plugins (Firebase, navigation, serialization, etc.) to versions that explicitly support the selected AGP/Gradle pair. Regenerate lockfiles or dependency metadata only as part of the reviewed change.

9. **Clean and verify incrementally.** Run Gradle with the wrapper, not a globally installed Gradle:

   ```bash
   ./gradlew --version
   ./gradlew clean assembleDebug
   ./gradlew test lint
   ./gradlew connectedCheck       # if an emulator/device is available
   ```

   Also verify release builds, product flavors, signing, R8/resource shrinking, baseline profiles, generated sources, annotation processing, Compose previews, and any custom CI tasks.

10. **Check CI and developer environments.** Update CI images, `JAVA_HOME`, Android SDK packages, Gradle/build caches, and Android Studio project settings. Make sure CI uses the same wrapper and JDK as local builds, then compare APK/AAB contents and startup behavior with the pre-upgrade build.

If the project is several AGP versions behind, upgrade through supported intermediate versions first. Resolve the first configuration error at each step instead of applying broad automated rewrites, and consult the AGP 9 migration guide for the exact version-specific breaking changes.

