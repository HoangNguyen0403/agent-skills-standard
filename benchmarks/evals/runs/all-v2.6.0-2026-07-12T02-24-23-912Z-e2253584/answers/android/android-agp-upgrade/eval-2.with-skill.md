# Migrating an Android project to AGP 9

1. Check the current AGP version. If it is below 8.x, run Android Studio’s AGP Upgrade Assistant first.

2. Verify that the Gradle, JDK, and Kotlin versions are compatible with AGP 9’s release notes.

3. Update the build files to the latest stable AGP 9.x version. Also update related dependencies as needed:
   - KSP: version 2.3.6 or newer
   - Hilt: version 2.59.2 or newer

4. Migrate to AGP 9’s built-in Kotlin support. Remove the `org.jetbrains.kotlin.android` plugin and follow the built-in Kotlin migration guidance.

5. Migrate each `android {}` block to the new AGP 9 DSL, including namespace handling, build type configuration, and source set declarations.

6. If the project uses `kapt`, migrate to KSP wherever the annotation processor supports it (for example, Room, Hilt, or Moshi). For processors without KSP support, use `legacy-kapt` as a bridge.

7. Update custom `BuildConfig` fields to the AGP 9 syntax.

8. Remove these migration flags from `gradle.properties`:
   - `android.builtInKotlin`
   - `android.newDsl`
   - `android.uniquePackageNames`
   - `android.enableAppCompileTimeRClass`

9. Verify the migration without running `clean`:

   ```bash
   ./gradlew help
   ./gradlew build --dry-run
   ```

   Both commands should succeed, and the project should also sync successfully in the IDE.

Do not add `android.disallowKotlinSourceSets=false` to `gradle.properties`. This workflow does not apply to Kotlin Multiplatform projects.

