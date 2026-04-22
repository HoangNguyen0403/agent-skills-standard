---
name: spring-boot-best-practices
description: Apply core coding standards, dependency injection, and configuration for Spring Boot 3. Use when applying Spring Boot 3 coding standards or configuring dependency injection.
metadata:
  triggers:
    files:
    - 'application.properties'
    - '**/*Service.java'
    keywords:
    - autowired
    - requiredargsconstructor
    - configuration-properties
    - slf4j
---
# Spring Boot Best Practices

## **Priority: P0**

## Implementation Guidelines

### Dependency Injection (DI)

- **Constructor Injection**: ALWAYS use **Constructor Injection** for immutability. Use **`@RequiredArgsConstructor`** (Lombok) to reduce boilerplate. Mark all dependencies as **`final`**.
- **Avoid @Autowired**: NEVER use field injection. It prevents unit testing without Spring context and hides dependencies.

### Configuration & Data

- **Type-Safe Config**: Use `@ConfigurationProperties` with Records (Java 17+) instead of `@Value`. Use Spring profile-specific files (e.g., `application-dev.yml`, `application-prod.yml`) and set active profile via `SPRING_PROFILES_ACTIVE`. Never hardcode secret values in properties files.
- **Validation**: Combine with **`@Validated`** and **Jakarta Bean Validation** (`@NotNull`, `@NotEmpty`) to fail fast at startup. Use **`application.yaml`** for structured configuration.
- **DTOs**: Use **`records`** as immutable **DTOs** to reduce boilerplate and ensure thread safety. Handle empty values with **`Optional`** to avoid `NullPointerException`.

### Observability & Quality

- **Error Handling**: Implement **`@ControllerAdvice`** and **`ProblemDetails` (RFC 7807)** for standardized error responses.
- **Logging**: Use **`SLF4J`** with **`@Slf4j`**. Implement **Structured Logging** by logging arguments (`log.info("id: {}", id)`).
- **Tooling**: Mandate **`Spotless`** or **`Checkstyle`** for code formatting. Use **`sdkman`** to manage JDK 21+ versions.

## Anti-Patterns

- **No @Autowired on fields**: Use constructor injection via @RequiredArgsConstructor.
- **No Setters on dependencies**: Declare all injected fields as final.
- **No context.getBean()**: Inject dependencies via constructor DI.
- **No log-and-swallow**: Rethrow or handle exceptions explicitly.

## References

- [Implementation Examples](references/implementation.md)