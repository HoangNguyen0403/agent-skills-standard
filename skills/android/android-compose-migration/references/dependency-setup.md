# Compose Dependency Setup

## Using BOM (recommended)

```kotlin
// build.gradle.kts (app module)
dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.06.00")
    implementation(composeBom)

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.10.1")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
```

## Enable Compose in build.gradle.kts

```kotlin
android {
    buildFeatures {
        compose = true
    }
    // AGP 8.x — set compose compiler version
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.15"
    }
    // AGP 9 — compose compiler is built-in, remove composeOptions
}
```

## Version catalog (libs.versions.toml)

```toml
[versions]
compose-bom = "2025.06.00"
activity-compose = "1.10.1"

[libraries]
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activity-compose" }
```
