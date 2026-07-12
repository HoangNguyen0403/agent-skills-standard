Use a multi-stage, layered Docker build with an `eclipse-temurin` runtime image. Keep dependency resolution in an earlier layer so source changes do not invalidate it, and avoid an uber/fat jar when layered packaging is available.

One practical shape is:

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY gradlew gradle/ build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon
COPY src ./src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

Pin the Gradle wrapper and base-image/JDK versions, keep the dependency and build layers ordered for cache reuse, and use Spring Boot’s layered-jar support when extracting separate dependencies, loader, and application layers. Build and verify the image in CI so `./gradlew build` remains the reproducible source of the artifact.
