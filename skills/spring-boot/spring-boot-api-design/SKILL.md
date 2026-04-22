---
name: spring-boot-api-design
description: Design Spring Boot APIs with OpenAPI, Versioning, and Global Error Handling. Use when designing Spring Boot APIs with OpenAPI specs, versioning, or global error handling.
metadata:
  triggers:
    files:
    - '**/*Controller.java'
    keywords:
    - openapi
    - swagger
    - versioning
    - problemdetails
---
# Spring Boot API Design Standards

## **Priority: P0**

## Implementation Guidelines

### OpenAPI (Swagger)

- **SpringDoc**: Use `springdoc-openapi-starter-webmvc-ui`.
- **Annotations**: Use `@Operation` and `@ApiResponse`. Keep clean.
- **Schema**: Define examples in `@Schema` on DTOs.

### API Versioning

- **Strategy**: Prefer **URI Versioning** (`/api/v1/`) for caching simplicity.
- **Deprecation**: Use `@Deprecated` + OpenAPI flag.

### Error Handling (RFC 7807)

- **ProblemDetails**: Enable `spring.mvc.problem-details.enabled=true`.
- **Extension**: Extend `ProblemDetail` with custom fields if needed.
- **Security**: NEVER expose stack traces in API errors.

## Anti-Patterns

- **No Map<K,V> responses**: Return typed DTO records instead.
- **No Header Versioning**: Use URI versioning; headers hard to test/cache.
- **No hidden APIs**: Document all endpoints with Swagger/OpenAPI.

## References

- [Implementation Examples](references/implementation.md)