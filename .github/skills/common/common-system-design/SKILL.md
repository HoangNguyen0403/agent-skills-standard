---
name: common-system-design
description: 'Universal architectural standards for robust, scalable systems. Use when designing new features, evaluating architecture, or resolving scalability concerns. (triggers: architecture, design, system, scalability)'
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

- **CAP**: Trade-off Consistency/Availability/Partition tolerance. See [CAP & Consistency Patterns](references/distributed-systems.md).
- **Idempotency**: Operations repeatable without side effects. See [Idempotency Patterns](references/distributed-systems.md#idempotency).
- **Circuit Breaker**: Fail fast on failing services. See [Resilience Patterns](references/resilience-patterns.md).
- **Eventual Consistency**: Design for async data sync. See [CAP & Consistency Patterns](references/distributed-systems.md#eventual-consistency).

## Documentation & Evolution

- **Design Docs**: Write specs before major implementations.
- **Versioning**: Version APIs/schemas for backward compatibility.
- **Extensibility**: Use Strategy/Factory for future changes.

## References

- [Distributed Systems & CAP Theorem](references/distributed-systems.md)
- [Resilience Patterns (Circuit Breaker, Bulkhead, Retry)](references/resilience-patterns.md)

## Anti-Patterns

- **No god classes**: Single Responsibility — one reason to change per module.
- **No synchronous coupling**: Prefer events or queues for cross-service calls.
- **No premature abstraction**: Design for current load; scale when proven needed.
