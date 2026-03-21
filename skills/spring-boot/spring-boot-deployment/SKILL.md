---
name: spring-boot-deployment
description: 'Standards for GraalVM Native Images, Docker, and Graceful Shutdown. Use when deploying Spring Boot apps as GraalVM native images, containers, or configuring shutdown. (triggers: Dockerfile, compose.yml, docker-layer, native-image, graceful-shutdown)'
---

# Spring Boot Deployment Standards

## **Priority: P0**

## Implementation Guidelines

### Docker & Containerization

- **Buildpacks**: Use **`bootBuildImage`** (Gradle) or **`spring-boot:build-image`** (Maven) for OCI-compliant images.
- **Layered JAR**: Use **`Layered JAR`** support to optimize **Build Cache**. Use multi-stage **`Dockerfile`**.
- **Security**: Run as **`non-root`** user. Use **`eclipse-temurin`** or Distroless as base image.
- **Secrets**: NEVER commit secrets to Git. Inject via environment variables, Kubernetes Secrets, or Vault (spring.config.import). Never bake secrets into image layers.

### GraalVM Native Image (AOT)

- **Use Case**: **Serverless** or CLI tools requiring **instant startup** and low memory footprint.
- **Constraints**: Use **`AOT`** transformations. Register reflection with **`RuntimeHints`** if needed.
- **Health Checks**: Include **`Actuator`** endpoints specifically for **Liveness** and **Readiness** probes.

### Resource Tuning & Shutdown

- **Graceful Shutdown**: Enable **`server.shutdown=graceful`** with a 30s timeout.
- **Memory**: Use **`-XX:+UseContainerSupport`** and **`-XX:MaxRAMPercentage=75.0`**.
- **Log Management**: Log to **`stdout`** in **Structured JSON** for log aggregators.

## Anti-Patterns

- **No Fat JARs in Docker**: Use Layered JAR support for better caching.
- **No root container user**: Run as restricted user (appuser/nobody).
- **No baked-in secrets**: Use Env vars or ConfigMaps, never image layers.

## References

- [Implementation Examples](references/implementation.md)
