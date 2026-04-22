---
name: spring-boot-architecture
description: Structure Spring Boot 3+ projects with feature packaging and clean layering. Use when structuring Spring Boot 3 projects, defining layers, or applying architecture patterns.
metadata:
  triggers:
    files:
    - 'pom.xml'
    - 'build.gradle'
    keywords:
    - structure
    - layering
    - dto
    - controller
    - "@RestController"
    - "@Service"
    - "@Repository"
    - "@Entity"
    - "@Bean"
    - "@Configuration"
---
# Spring Boot Architecture Standards

## **Priority: P0 (CRITICAL)**

## Organize by Feature

- **Package by Feature**: Prefer `com.app.feature` (e.g., `user`, `order`) over technical layers (`controllers`) for scalability.
- **Dependency Rule**: Outer layers (Web) depend on Inner (Service). Inner layers MUST NOT depend on Outer.
- **DTO Pattern**: ALWAYS use DTOs for API inputs/outputs. NEVER return `@Entity` directly.
- **Java Records**: Use `record` for DTOs to ensure immutability (Java 17+).

See [implementation examples](references/implementation.md) for Java Record DTOs, controller patterns, and global exception handling.

## Define Layer Responsibilities

1. **Controller (Web)**: Handle HTTP, Validation (`@Valid`), DTO mapping. Delegate logic to Service.
2. **Service (Business)**: Transaction boundaries, orchestration. Returns Domain/DTOs.
3. **Repository (Data)**: Database interactions only. Returns Entities/Projections.

## Design API Layer

- **Global Error Handling**: Use `@RestControllerAdvice` with `ProblemDetails` (RFC 7807).
- **Validation**: Use Jakarta Bean Validation (`@NotNull`, `@Size`) on DTOs.
- **Response**: Use `ResponseEntity` for explicit status or `ResponseStatusException`.

## Verification Checklist (Mandatory)

- [ ] **No Entities in API**: all API responses using DTOs/Records instead of JPA Entities?
- [ ] **Validation**: `@Valid` and Jakarta Bean Validation constraints present on all input DTOs?
- [ ] **Layer coupling**: Services depend on Controllers? (Prohibited)
- [ ] **Transactionality**: business transactions correctly bounded with `@Transactional` in Service layer?
- [ ] **Error Details**: `ProblemDetails` used for consistent error responses?

## Anti-Patterns

- **No Fat Controllers**: Move business logic to Services.
- **No Leaking Entities**: Use DTOs instead of JPA Entities in APIs.
- **No Circular Dependencies**: Use Events or refactor to decouple services.
- **No God Classes**: Split large services into single-responsibility components.

## References

- [Implementation Examples](references/implementation.md)