---
name: Spring Boot API Design
description: Standards for OpenAPI, Versioning, and Global Error Handling
metadata:
  labels: [spring-boot, api, openapi, swagger]
  triggers:
    files: ['**/*Controller.java']
    keywords: [openapi, swagger, versioning, problemdetails]
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

- **Untyped Response**: `**No Map<K,V>**: Return typed DTOs.`
- **Header Versioning**: `**No Headers**: Hard to test/cache.`
- **Undocumented**: `**No hidden APIs**: Use Swagger.`

## References

- [Implementation Examples](references/implementation.md)
