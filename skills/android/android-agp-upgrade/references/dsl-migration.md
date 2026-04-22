# AGP 9 DSL Migration

## Namespace declaration

```kotlin
// BEFORE (AGP 8)
android {
    namespace = "com.example.app"
}

// AFTER (AGP 9) — unchanged, but now mandatory (no fallback to package attribute)
android {
    namespace = "com.example.app"
}
```

## Build types and product flavors

```kotlin
// BEFORE
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

// AFTER (AGP 9) — same syntax, but verify all flags use `is` prefix
// The `minifyEnabled` (without `is`) is removed in AGP 9
android {
    buildTypes {
        release {
            isMinifyEnabled = true       // Must use `is` prefix
            isShrinkResources = true     // Must use `is` prefix
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

## Compile SDK and target SDK

```kotlin
// BEFORE
android {
    compileSdk = 34
    defaultConfig {
        targetSdk = 34
    }
}

// AFTER — AGP 9 requires compileSdk 35+
android {
    compileSdk = 35
    defaultConfig {
        targetSdk = 35
    }
}
```

## Version catalogs (libs.versions.toml)

```toml
# Update AGP version
[versions]
agp = "9.0.0"
kotlin = "2.1.0"  # Remove if using built-in Kotlin
ksp = "2.3.6"

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
# Remove: kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

## R8 / ProGuard changes in AGP 9

AGP 9 includes R8 optimizations by default. Key changes:
- Full-mode R8 is now the only mode (compatibility mode removed).
- Consumer ProGuard rules from libraries are applied automatically.
- Redundant keep rules for AndroidX, Kotlin stdlib, and Google libraries can be removed.

See the R8 analyzer skill (`android-performance`) for keep rule optimization guidance.
