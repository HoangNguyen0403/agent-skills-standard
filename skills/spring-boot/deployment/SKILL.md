---
name: Spring Boot Deployment
description: Standards for GraalVM Native Images, Docker, and Graceful Shutdown
metadata:
  labels: [spring-boot, deployment, docker, graalvm]
  triggers:
    files: ['Dockerfile', 'compose.yml']
    keywords: [docker-layer, native-image, graceful-shutdown]
---

# Spring Boot Deployment Standards

## **Priority: P0**

## Implementation Guidelines

### GraalVM Native Images (AOT)

- **Use Case**: Serverless/CLI tools requiring instant startup.
- **Constraints**: Register reflection via Runtime Hints. Libraries must be compatible.
- **Build**: Use `bootBuildImage` (Gradle) or `spring-boot:build-image` (Maven).

### Containerization (Docker)

- **Layered JAR**: Use standard Layered JAR support to optimize caching.
- **Security**: Run as non-root user (`nobody` or `appuser`).
- **Memory**: Set JVM limits proportional to container (`-XX:+UseContainerSupport`).

### Graceful Shutdown

- **Enable**: `server.shutdown=graceful` (default 30s timeout).
- **Process**: Stops accepting new requests, processes active ones.

## Anti-Patterns

- **Fat JAR**: `**No Fat JARs in Docker**: Use layers.`
- **Root User**: `**No Root**: Use restricted user.`
- **Baked Config**: `**No Baked Secrets**: Use Env/ConfigMaps.`

## References

- [Implementation Examples](references/implementation.md)
