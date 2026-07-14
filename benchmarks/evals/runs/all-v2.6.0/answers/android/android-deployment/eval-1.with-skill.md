Use CI secrets/environment variables for the keystore path and passwords, and keep the keystore outside the repository. For example, in `app/build.gradle.kts`:

```kotlin
import java.io.File

val keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
val keystorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
val keyAlias = System.getenv("ANDROID_KEY_ALIAS")
val keyPassword = System.getenv("ANDROID_KEY_PASSWORD")

android {
    signingConfigs {
        create("release") {
            check(keystorePath != null) { "ANDROID_KEYSTORE_PATH is required for release signing" }
            check(keystorePassword != null) { "ANDROID_KEYSTORE_PASSWORD is required for release signing" }
            check(keyAlias != null) { "ANDROID_KEY_ALIAS is required for release signing" }
            check(keyPassword != null) { "ANDROID_KEY_PASSWORD is required for release signing" }

            storeFile = File(keystorePath!!)
            storePassword = keystorePassword
            this.keyAlias = keyAlias
            this.keyPassword = keyPassword
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

Have CI materialize the keystore from its secret store at `ANDROID_KEYSTORE_PATH`, set the four variables, build, and remove the temporary keystore in cleanup. Never commit the keystore, passwords, or signing credentials. For Play Store distribution, prefer producing a signed `.aab`; use a signed APK only where an APK is specifically required.

