---
name: spring-boot-best-practices
description: "Core coding standards, dependency injection, and configuration for Spring Boot 3. Use when applying Spring Boot 3 coding standards or configuring dependency injection. (triggers: application.properties, **/*Service.java, autowired, requiredargsconstructor, configuration-properties, slf4j)"
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
