---
name: spring-boot-microservices
description: Standards for Feign clients and asynchronous messaging with Spring Cloud Stream. Use when implementing Feign HTTP clients or async event messaging in Spring Boot microservices.
metadata:
  triggers:
    files:
    - '**/*Client.java'
    - '**/*Consumer.java'
    keywords:
    - feign-client
    - spring-cloud-stream
    - rabbitmq
    - resilience4j
---
# Spring Boot Microservices Standards

## **Priority: P0**

## Implementation Guidelines

### Sync Communication (REST & API Interface)

- **Clients**: Use Spring Cloud OpenFeign or HTTP Interfaces (Spring 6/Java 21).
- **Resilience**: Implement Resilience4j with Circuit Breaker, Retry (Exponential Backoff), and RateLimiter.
- **Contracts**: Share DTO Records via Maven BOM or API Contract module.
- **Tracing**: Ensure Micrometer propagation for Distributed Tracing.

See [implementation examples](references/implementation.md) for Feign client with Circuit Breaker fallback.

### Async Communication (Spring Cloud Stream)

- **Architecture**: Use Message-Driven patterns with Spring Cloud Stream.
- **Functions**: Define message handlers as `java.util.function.Function`, `Consumer`, or `Supplier`.
- **Serialization**: Use JSON or Avro for events.
- **Reliability**: Implement Dead Letter Queues (DLQ) and idempotent consumers.

See [implementation examples](references/implementation.md) for Spring Cloud Stream event consumer with idempotency.

### Data & Isolation

- **DB per Service**: NEVER share databases between microservices.
- **Shared Libs**: Minimize shared logic to shared DTOs/Clients only.
- **Discovery**: Use Spring Cloud Gateway for routing and auth.

## Anti-Patterns

- **No Shared DB**: Services must communicate via APIs or Events only.
- **No Shared Entities**: Share DTOs via Maven BOM, never JPA entities.
- **No Sync Call Chains**: Use async messaging to prevent distributed monolith.

## References

- [Implementation Examples](references/implementation.md)