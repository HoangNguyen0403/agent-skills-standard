---
name: Spring Boot Microservices
description: Standards for synchronous (Feign) and asynchronous (Cloud Stream) communication
metadata:
  labels: [spring-boot, microservices, feign, kafka]
  triggers:
    files: ['**/*Client.java', '**/*Consumer.java']
    keywords: [feign-client, spring-cloud-stream, rabbitmq, resilience4j]
options:
  - version: 3.x
---

# Spring Boot Microservices Standards

## **Priority: P0**

## Implementation Guidelines

### Sync Communication (REST)

- **Clients**: Use **Spring Cloud OpenFeign** or **Http Interfaces** (Spring 6).
- **Resilience**: Wrap calls with **Resilience4j** (Circuit Breaker).
- **Contracts**: Define DTOs in a **Shared Library** (Maven BOM).
- **Versioning**: Enforce **Semantic Versioning** on shared libs.

### Async Communication (Event-Driven)

- **Cloud Stream**: Use `java.util.function.Consumer<T>` composition.
- **Idempotency**: Consumers MUST handle duplicates (DB constraints).
- **Evolution**: Add fields only. Never rename/remove used fields.

## Anti-Patterns

- **Direct DB Access**: `**No Shared DB**: Use APIs/Events.`
- **Coupled Entities**: `**No Shared Entities**: Use DTOs.`
- **Dist. Monolith**: `**No Sync Chains**: Use Async.`

## References

- [Implementation Examples](references/implementation.md)
