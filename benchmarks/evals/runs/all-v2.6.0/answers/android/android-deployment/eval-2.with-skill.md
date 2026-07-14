Enable R8 only for the Release build in `app/build.gradle.kts`:

```kotlin
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

Build a release artifact and inspect the resulting size. Keep `proguard-rules.pro` minimal; prefer `@Keep` on classes or members used through reflection instead of broad wildcard keep rules. Do not make the Release build debuggable. For Play Store uploads, publish the signed App Bundle (`.aab`) rather than an APK.

