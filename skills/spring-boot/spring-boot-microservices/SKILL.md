---
name: spring-boot-microservices
description: "Standards for Feign clients and asynchronous messaging with Spring Cloud Stream. Use when implementing Feign HTTP clients or async event messaging in Spring Boot microservices. (triggers: **/*Client.java, **/*Consumer.java, feign-client, spring-cloud-stream, rabbitmq, resilience4j)"
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

- **No Shared DB**: Services must communicate via APIs or Events only.
- **No Shared Entities**: Share DTOs via Maven BOM, never JPA entities.
- **No Sync Call Chains**: Use async messaging to prevent distributed monolith.

## References

- [Implementation Examples](references/implementation.md)
