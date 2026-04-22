# Built-in Kotlin Migration (AGP 9)

AGP 9 enables built-in Kotlin by default — the `kotlin-android` plugin is no longer required.

## Migration steps

### 1. Remove the kotlin-android plugin

```kotlin
// BEFORE (build.gradle.kts)
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")  // Remove this
}

// AFTER
plugins {
    id("com.android.application")
    // Built-in Kotlin handles compilation automatically
}
```

### 2. Migrate kotlin-kapt if used

```kotlin
// BEFORE
plugins {
    id("org.jetbrains.kotlin.kapt")  // Remove
}

// AFTER — use KSP or legacy-kapt
plugins {
    id("com.google.devtools.ksp")  // Preferred
    // OR: id("com.android.legacy-kapt") for processors without KSP support
}
```

### 3. Migrate kotlinOptions DSL

```kotlin
// BEFORE
android {
    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf("-opt-in=kotlin.RequiresOptIn")
    }
}

// AFTER — use compilerOptions (new DSL)
android {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        freeCompilerArgs.add("-opt-in=kotlin.RequiresOptIn")
    }
}
```

### 4. Migrate kotlin.sourceSets if used

```kotlin
// BEFORE
kotlin {
    sourceSets {
        main { kotlin.srcDir("src/main/kotlin") }
    }
}

// AFTER — use android sourceSets (built-in Kotlin uses Android source sets)
android {
    sourceSets {
        getByName("main") {
            kotlin.srcDir("src/main/kotlin")  // Usually not needed — default is detected
        }
    }
}
```

## Common errors after migration

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot add extension with name 'kotlin'` | `kotlin-android` plugin still applied | Remove the plugin |
| `The 'org.jetbrains.kotlin.android' plugin is no longer required` | Same — AGP 9 detects and rejects it | Remove the plugin |
| KMP modules fail | Built-in Kotlin replaces `kotlin-android` only, not `kotlin-multiplatform` | Keep `kotlin-multiplatform` for KMP modules |
