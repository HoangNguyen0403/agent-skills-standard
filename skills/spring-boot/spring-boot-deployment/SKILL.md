---
name: spring-boot-deployment
description: Deploy Spring Boot apps with Docker, GraalVM native images, and graceful shutdown. Use when deploying Spring Boot apps as GraalVM native images, containers, or configuring shutdown.
metadata:
  triggers:
    files:
    - 'compose.yml'
    keywords:
    - Dockerfile
    - docker-layer
    - native-image
    - graceful-shutdown
---
# Spring Boot Deployment Standards

## **Priority: P0**

## Containerize with Docker

- **Buildpacks**: Use **`bootBuildImage`** (Gradle) or **`spring-boot:build-image`** (Maven) for OCI-compliant images.
- **Layered JAR**: Use **`Layered JAR`** support to optimize **Build Cache**. Use multi-stage **`Dockerfile`**.
- **Security**: Run as **`non-root`** user. Use **`eclipse-temurin`** or Distroless as base image.
- **Secrets**: NEVER commit secrets to Git. Inject via environment variables, Kubernetes Secrets, or Vault (spring.config.import). Never bake secrets into image layers.

See [implementation examples](references/implementation.md) for multi-stage layered Dockerfile and graceful shutdown configuration.

## Build GraalVM Native Images (AOT)

- **Use Case**: **Serverless** or CLI tools requiring **instant startup** and low memory footprint.
- **Constraints**: Use **`AOT`** transformations. Register reflection with **`RuntimeHints`** if needed.
- **Health Checks**: Include **`Actuator`** endpoints specifically for **Liveness** and **Readiness** probes.

## Tune Resources and Shutdown

- **Graceful Shutdown**: Enable **`server.shutdown=graceful`** with 30s timeout.
- **Memory**: Use **`-XX:+UseContainerSupport`** and **`-XX:MaxRAMPercentage=75.0`**.
- **Log Management**: Log to **`stdout`** in **Structured JSON** for log aggregators.

## Anti-Patterns

- **No Fat JARs in Docker**: Use Layered JAR support for better caching.
- **No root container user**: Run as restricted user (appuser/nobody).
- **No baked-in secrets**: Use Env vars or ConfigMaps, never image layers.

## References

- [Implementation Examples](references/implementation.md)