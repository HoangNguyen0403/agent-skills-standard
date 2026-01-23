---
name: Spring Boot Best Practices
description: Core coding standards, dependency injection, and configuration for Spring Boot 3
metadata:
  labels: [spring-boot, best-practices, dependency-injection]
  triggers:
    files: ['application.properties', '**/*Service.java']
    keywords:
      [autowired, requiredargsconstructor, configuration-properties, slf4j]
options:
  - version: 3.x
---

# Spring Boot Best Practices

## **Priority: P0**

## Implementation Guidelines

### Dependency Injection (DI)

- **Constructor Injection**: ALWAYS use constructor injection (via `@RequiredArgsConstructor`) for immutability.
- **Final Fields**: Mark all dependencies as `final`.
- **Avoid @Autowired**: Do not use field injection. It hides dependencies.

### Configuration

- **Type-Safe Config**: Use `@ConfigurationProperties` with Records instead of `@Value`.
- **Validation**: Combine with `@Validated` and Jakarta constraints (`@NotNull`) to fail fast.
- **Externalization**: Follow strict precedence (Env vars > Config files).

### Observability & Logging

- **SLF4J**: Use `@Slf4j`. NEVER use `System.out`.
- **Structured Logging**: Log arguments (`log.info("id: {}", id)`), not concatenated strings.

## Anti-Patterns

- **Field Injection**: `**No @Autowired on fields**: Use constructor injection.`
- **Mutable Components**: `**No Setters**: Use final fields.`
- **Manual Bean Lookup**: `**No context.getBean()**: Inject dependencies.`
- **Swallowed Exceptions**: `**No log-and-swallow**: Rethrow or handle cleanly.`

## References

- [Implementation Examples](references/implementation.md)
