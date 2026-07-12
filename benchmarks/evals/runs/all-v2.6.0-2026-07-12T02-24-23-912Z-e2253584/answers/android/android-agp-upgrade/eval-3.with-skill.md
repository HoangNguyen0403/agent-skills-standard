# Verifying a successful AGP 9 migration

Run these checks from the project root:

```bash
./gradlew help
./gradlew build --dry-run
```

Both commands should succeed without configuration or plugin errors. Then verify that Android Studio completes Gradle IDE sync successfully.

Also confirm the migration details:

- The project uses a compatible Gradle, JDK, and Kotlin version.
- `org.jetbrains.kotlin.android` has been removed where AGP 9 built-in Kotlin is used.
- The new AGP DSL is applied correctly.
- KSP is at least `2.3.6+` if used, or unsupported `kapt` processors use `legacy-kapt`.
- Custom `BuildConfig` fields use the AGP 9 syntax.
- `gradle.properties` no longer contains `android.builtInKotlin`, `android.newDsl`, `android.uniquePackageNames`, or `android.enableAppCompileTimeRClass`.

Do not run `clean` as part of verification; it is unnecessary for these checks.

