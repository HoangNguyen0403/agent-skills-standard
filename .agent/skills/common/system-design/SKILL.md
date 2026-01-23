---
name: System Design & Architecture Standards
description: Universal architectural standards for building robust, scalable, and maintainable systems.
metadata:
  labels: [system-design, architecture, scalability, reliability]
  triggers:
    keywords: [architecture, design, system, scalability]
---

# System Design & Architecture Standards

## **Priority: P0 (FOUNDATIONAL)**

## Architectural Principles

- **SoC**: Divide into distinct sections per concern.
- **SSOT**: One source, reference elsewhere.
- **Fail Fast**: Fail visibly when errors occur.
- **Graceful Degradation**: Core functional even if secondary fails.

## Modularity & Coupling

- **High Cohesion**: Related functionality in one module.
- **Loose Coupling**: Use interfaces for communication.
- **DI**: Inject dependencies, don't hardcode.

## Common Patterns

- **Layered**: Presentation → Logic → Data.
- **Event-Driven**: Async communication between decoupled components.
- **Clean/Hexagonal**: Core logic independent of frameworks.
- **Statelessness**: Favor stateless for scaling/testing.

## Distributed Systems

- **CAP**: Trade-off Consistency/Availability/Partition tolerance.
- **Idempotency**: Operations repeatable without side effects.
- **Circuit Breaker**: Fail fast on failing services.
- **Eventual Consistency**: Design for async data sync.

## Documentation & Evolution

- **Design Docs**: Write specs before major implementations.
- **Versioning**: Version APIs/schemas for backward compatibility.
- **Extensibility**: Use Strategy/Factory for future changes.
