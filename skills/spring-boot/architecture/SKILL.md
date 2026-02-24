---
name: Spring Boot Architecture
description: Standards for project structure, layering, and API design in Spring Boot 3+ applications
metadata:
  labels: [spring-boot, architecture, layering]
  triggers:
    files: ['pom.xml', 'build.gradle']
    keywords: [structure, layering, dto, controller, @RestController, @Service, @Repository, @Entity, @Bean, @Configuration]
---

# Spring Boot Architecture Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Structure & Packaging

- **Package by Feature**: Prefer `com.app.feature` (e.g., `user`, `order`) over technical layers (`controllers`) for scalability.
- **Dependency Rule**: Outer layers (Web) depend on Inner (Service). Inner layers MUST NOT depend on Outer.
- **DTO Pattern**: ALWAYS use DTOs for API inputs/outputs. NEVER return `@Entity` directly.
- **Java Records**: Use `record` for DTOs to ensure immutability (Java 17+).

### Layer Responsibilities

1. **Controller (Web)**: Handle HTTP, Validation (`@Valid`), DTO mapping. Delegate logic to Service.
2. **Service (Business)**: Transaction boundaries, orchestration. Returns Domain/DTOs.
3. **Repository (Data)**: Database interactions only. Returns Entities/Projections.

### API Design

- **Global Error Handling**: Use `@RestControllerAdvice` with `ProblemDetails` (RFC 7807).
- **Validation**: Use Jakarta Bean Validation (`@NotNull`, `@Size`) on DTOs.
- **Response**: Use `ResponseEntity` for explicit status or `ResponseStatusException`.

## Verification Checklist (Mandatory)

- [ ] **No Entities in API**: Are all API responses using DTOs/Records instead of JPA Entities?
- [ ] **Validation**: Are `@Valid` and Jakarta Bean Validation constraints present on all input DTOs?
- [ ] **Layer coupling**: Do Services depend on Controllers? (Prohibited)
- [ ] **Transactionality**: Are business transactions correctly bounded with `@Transactional` in the Service layer?
- [ ] **Error Details**: Is `ProblemDetails` used for consistent error responses?

- **No Fat Controllers**: Move business logic to Services.
- **No Leaking Entities**: Use DTOs instead of JPA Entities in APIs.
- **No Circular Dependencies**: Use Events or refactor to decouple services.
- **No God Classes**: Split large services into single-responsibility components.

## References

- [Implementation Examples](references/implementation.md)
