# Verifying an AGP 9 migration

Verify the migration at three levels: build, tests, and a release-like app run.

1. Confirm the toolchain is aligned:

   - The Android Gradle Plugin, Gradle wrapper, and JDK versions satisfy the compatibility requirements for the exact AGP 9.x version.
   - `gradle-wrapper.properties`, plugin declarations, and version catalogs contain no old AGP or Gradle references.
   - Run `./gradlew --version` and record the Gradle and JVM versions.

2. Run clean builds for the important variants:

   ```bash
   ./gradlew clean
   ./gradlew assembleDebug assembleRelease
   ./gradlew bundleRelease
   ```

   These should complete without errors. Treat deprecation, configuration-cache, namespace, manifest, and packaging warnings as migration issues to investigate rather than assuming the upgrade is complete.

3. Run the verification tasks:

   ```bash
   ./gradlew test lint check
   ./gradlew connectedCheck   # when an emulator/device is available
   ```

   Check unit-test, instrumentation-test, lint, and generated-source outputs for every affected module. Also verify that the release build succeeds with shrinking, resource optimization, signing configuration, and product flavors enabled if the project uses them.

4. Inspect the artifacts, not just the exit code. Install the release APK (or use the generated app bundle through an internal/closed test track), launch it, and exercise startup, navigation, deep links, permissions, networking, notifications, database migrations, and any native-library flows. Confirm that mapping files, versioning, signing, and expected manifest entries are present.

5. Compare the migrated build with the previous known-good build: dependency resolution, APK/AAB contents and size, minimum/target SDK behavior, startup, and key user flows. Review CI on a clean checkout so no local caches hide missing declarations.

The migration is successful when clean debug and release builds, tests, lint, and release packaging pass; no AGP/Gradle migration warnings remain unexplained; the produced artifacts install and run on supported Android versions; and CI reproduces the result from a clean environment.

