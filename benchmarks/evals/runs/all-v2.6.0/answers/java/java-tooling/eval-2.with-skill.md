Use a checked-in JDK declaration plus a Gradle toolchain so local and CI builds select the same LTS JDK.

For example, choose Java 21 and add `.sdkmanrc`:

```text
java=21.0.\<vendor-distribution\>
```

You can also use `.java-version` for tools that support it. In `build.gradle.kts`, make the compiler choice explicit:

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

Commit the version file and configure CI to install/use that JDK before invoking `./gradlew`. Keep the Gradle wrapper checked in and run builds through `./gradlew`, so the Gradle version is reproducible as well. Java 17 is also a supported LTS choice if that matches the project.
