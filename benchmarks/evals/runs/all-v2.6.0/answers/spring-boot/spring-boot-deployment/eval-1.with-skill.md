For a normal Spring Boot application, prefer an OCI image built by Spring Boot's build-image support:

```bash
./mvnw spring-boot:build-image
# or
./gradlew bootBuildImage
```

These tools produce a layered, cache-friendly image. If a custom Dockerfile is required, build a layered JAR in one stage and copy its dependency, loader, and application layers into a small runtime stage. Use an `eclipse-temurin` or distroless runtime, run as a non-root `appuser`, and copy only the runtime artifacts. Do not use a root container or put credentials in build arguments or image layers.

Keep the layers ordered so infrequently changing dependencies are cached separately from application classes. Enable layered JAR support and verify the final image with a vulnerability scanner and a smoke test. Configure container-aware memory handling, for example `-XX:+UseContainerSupport` and a suitable `-XX:MaxRAMPercentage`, and emit structured logs to stdout for the platform to collect. Enable graceful shutdown with `server.shutdown=graceful` and a bounded timeout so rolling deployments can drain requests.


