# Deployment Implementation Examples

## Dockerfile (Layered JAR)

```dockerfile
# Builder Stage
FROM eclipse-temurin:21-jre as builder
WORKDIR /app
COPY target/myapp.jar app.jar
# Extract layers
RUN java -Djarmode=layertools -jar app.jar extract

# Runtime Stage
FROM eclipse-temurin:21-jre
WORKDIR /app
# Copy layers (Dependencies change rarely -> Cached)
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./

# Fast startup
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

## Enabling Graceful Shutdown

```properties
# application.properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=20s
```
