Use a multi-stage Docker build: build with a full JDK and Gradle, then copy only the runtime artifact into a smaller JRE/runtime image. Keep dependency resolution cacheable by copying build descriptors before source files and using a BuildKit cache mount:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM gradle:8.8-jdk21 AS build
WORKDIR /workspace
COPY gradlew gradlew.bat settings.gradle* build.gradle* ./
COPY gradle ./gradle
RUN --mount=type=cache,target=/home/gradle/.gradle \
    ./gradlew dependencies --no-daemon || true
COPY src ./src
RUN --mount=type=cache,target=/home/gradle/.gradle \
    ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN useradd --system --uid 1001 appuser
COPY --from=build /workspace/build/libs/*.jar app.jar
USER 1001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

Use `.dockerignore` for `.git`, `.gradle`, `build`, IDE files, and other local artifacts. For better Spring Boot startup-layer caching, enable layered jars and extract/copy the dependency, loader, snapshot, and application layers separately; this lets a source-only change avoid rebuilding dependency layers. Keep the runtime image free of compilers and build caches, run as a non-root user, pin image/plugin versions, and build with `DOCKER_BUILDKIT=1`.
