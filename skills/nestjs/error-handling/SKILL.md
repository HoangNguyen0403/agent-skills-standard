---
name: NestJS Error Handling
description: Global Exception Filters and standard error formats.
metadata:
  labels: [nestjs, errors, filters]
  triggers:
    files: ['**/*.filter.ts', 'main.ts']
    keywords: [ExceptionFilter, Catch, HttpException]
---

# NestJS Error Handling Standards

## **Priority: P1 (OPERATIONAL)**

Global error handling and exception management patterns.

- **Requirement**: Centralize error formatting.
- **Platform Agnostic**: Do **not** import `Request`/`Response` from Express/Fastify types directly.
  - **Use**: `HttpAdapterHost` to access the underlying platform response methods.
  - `const { httpAdapter } = this.httpAdapterHost;`
- **Structure**:
  - Implement strictly typed error responses.
  - Refer to **[API Standards](../api-standards/SKILL.md)** for `ApiErrorResponse`.

  ```json
  {
    "statusCode": 400,
    "message": "Validation failed",
    "error": "Bad Request",
    "timestamp": "ISO...",
    "path": "/users"
  }
  ```

## Error Flow

1. **Service**: Throws specific or generic errors (e.g., `EntityNotFoundError`).
2. **Interceptor**: Maps low-level errors to HTTP Exceptions (e.g., `catchError(err => throw new NotFoundException())`).
   - _Why_: Keeps Exception Filters focused on formatting, not business logic interpretation.
3. **Global Filter**: Formats the final JSON response.

## Built-in Exceptions

- **Use**: Throw `NotFoundException`, `ForbiddenException`, `BadRequestException`.
- **Custom**: Extend `HttpException` only for domain-specific failures that need specific status codes.

## Logging

- **Context**: Always pass `MyClass.name` to the `Logger` constructor.
- **Levels**:
  - `error`: 500s (Stack trace required).
  - `warn`: 400s (Client errors).

## Security (Information Leakage)

- **Production**: **NEVER** expose stack traces in HTTP responses (`process.env.NODE_ENV === 'production'`).
- **Sanitization**: Ensure `ApiException` payloads do not leak internal file paths or raw variable dumps.
