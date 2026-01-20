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

Universal architectural standards for building robust, scalable, and maintainable systems.

## 🏛 Architectural Principles

- **Separation of Concerns (SoC)**: Divide system into distinct sections, each addressing a separate concern.
- **Single Source of Truth (SSOT)**: Ensure data is stored in one place and referenced elsewhere to prevent inconsistency.
- **Fail Fast**: Design systems to fail visibly and immediately when an error occurs.
- **Graceful Degradation**: Ensure the core system remains functional even if secondary components fail.

## 🧩 Modularity & Coupling

- **High Cohesion**: Keep related functionality together within a single module/class.
- **Loose Coupling**: Minimize dependencies between modules; use interfaces or abstract classes for communication.
- **Dependency Injection**: Invert control by injecting dependencies rather than hard-coding them.

## 🏗 Common Patterns

- **Layered Architecture**: Standard tiers (Presentation, Logic, Data).
- **Event-Driven**: Use events for asynchronous communication between decoupled components.
- **Hexagonal / Clean Architecture**: Keep the core business logic independent of external frameworks and UI.
- **Statelessness**: Favor stateless components to simplify scaling and testing.

## ☁️ Distributed Systems (If Applicable)

- **CAP Theorem Awareness**: Understand trade-offs between Consistency, Availability, and Partition Tolerance.
- **Idempotency**: Ensure operations can be repeated without changing the result beyond the initial application.
- **Circuit Breaker Pattern**: Prevent cascading failures by failing quickly when a service is likely down.
- **Eventual Consistency**: Design for systems where data becomes consistent over time.

## 🛠 Documentation & Evolution

- **Design Docs**: Write technical specifications before major implementations.
- **Versioning**: Version APIs and data schemas to allow backward compatibility.
- **Extensibility**: Design for future changes using patterns like Strategy or Factory.
