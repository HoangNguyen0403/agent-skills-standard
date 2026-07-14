# CI signing with `build.gradle.kts`

Keep the keystore and all passwords in the CI secret store. At build time, materialize the keystore in a temporary workspace and pass its path and credentials as Gradle properties; do not commit either the `.jks` file or a properties file containing passwords.

In `app/build.gradle.kts`:

```kotlin
val releaseStoreFile = providers.gradleProperty("RELEASE_STORE_FILE").orNull
val releaseStorePassword = providers.gradleProperty("RELEASE_STORE_PASSWORD").orNull
val releaseKeyAlias = providers.gradleProperty("RELEASE_KEY_ALIAS").orNull
val releaseKeyPassword = providers.gradleProperty("RELEASE_KEY_PASSWORD").orNull

android {
    signingConfigs {
        create("release") {
            if (releaseStoreFile != null) {
                storeFile = rootProject.file(releaseStoreFile)
                storePassword = requireNotNull(releaseStorePassword)
                keyAlias = requireNotNull(releaseKeyAlias)
                keyPassword = requireNotNull(releaseKeyPassword)
            }
        }
    }

    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

Have CI decode its secret keystore into a temporary path, then expose properties through environment variables supported by Gradle:

```sh
printf '%s' "$ANDROID_KEYSTORE_B64" | base64 --decode > "$RUNNER_TEMP/release.jks"
export ORG_GRADLE_PROJECT_RELEASE_STORE_FILE="$RUNNER_TEMP/release.jks"
export ORG_GRADLE_PROJECT_RELEASE_STORE_PASSWORD="$ANDROID_KEYSTORE_PASSWORD"
export ORG_GRADLE_PROJECT_RELEASE_KEY_ALIAS="$ANDROID_KEY_ALIAS"
export ORG_GRADLE_PROJECT_RELEASE_KEY_PASSWORD="$ANDROID_KEY_PASSWORD"

./gradlew :app:bundleRelease
rm -f "$RUNNER_TEMP/release.jks"
```

Configure the release signing properties as required inputs of the release job so a release cannot silently become unsigned. Restrict access to the upload keystore, rotate it according to your CI policy, and use the Play upload key rather than distributing the app-signing key when Play App Signing is enabled.

