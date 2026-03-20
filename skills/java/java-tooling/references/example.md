# Java Tooling — Examples

## Gradle Kotlin DSL with Java Toolchain

```kotlin
// build.gradle.kts
plugins {
    java
    id("com.diffplug.spotless") version "6.23.3"
    id("com.github.spotbugs") version "6.0.4"
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

spotless {
    java {
        googleJavaFormat()
        removeUnusedImports()
    }
}

spotbugs {
    effort.set(com.github.spotbugs.snom.Effort.MAX)
    reportLevel.set(com.github.spotbugs.snom.Confidence.LOW)
}
```

## Maven with Dependency Management

```xml
<!-- pom.xml -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

## Multi-stage Docker (eclipse-temurin)

```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts .
RUN ./gradlew dependencies --no-daemon
COPY src src
RUN ./gradlew bootJar --no-daemon

# Runtime stage (layered jar)
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## .sdkmanrc (JDK version lock)

```
java=21.0.2-tem
```
