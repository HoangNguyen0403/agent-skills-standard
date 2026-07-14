# Enable R8 and resource shrinking

Enable both options on the release build type in `app/build.gradle.kts`:

```kotlin
android {
    buildTypes {
        getByName("release") {
            isMinifyEnabled = true       // R8 code shrinking, optimization, and obfuscation
            isShrinkResources = true      // removes unused resources after code shrinking

            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

Resource shrinking requires code shrinking to be enabled. Build and measure the release artifact, not a debug APK:

```sh
./gradlew :app:assembleRelease
# Or, for Play distribution:
./gradlew :app:bundleRelease
```

R8 can remove or rename classes used indirectly through reflection, JNI, serialization, dependency injection, or dynamically loaded plugins. Test the release build and add narrow `-keep` rules in `proguard-rules.pro` for those verified cases; avoid keeping entire libraries unless necessary. Review the R8 warnings and use Android Studio’s APK Analyzer to identify the largest remaining files.

If the APK is still large, check whether it contains multiple ABIs, densities, or locales. Prefer an Android App Bundle for Play so Google Play can serve device-specific splits, and configure ABI/resource splits only when they match the app’s distribution requirements.

