---
name: nestjs-error-handling
description: Implement Global Exception Filters and standard error formats in NestJS. Use when implementing global exception filters or standardizing error responses in NestJS.
metadata:
  triggers:
    files:
    - '**/*.filter.ts'
    - 'main.ts'
    keywords:
    - ExceptionFilter
    - Catch
    - HttpException
---
# NestJS Error Handling Standards

## **Priority: P1 (OPERATIONAL)**


- **Requirement**: Centralize error formatting.
- **Platform Agnostic**: **not** import `Request`/`Response` from Express/Fastify types directly.
 - **Use**: `HttpAdapterHost` to access underlying platform response methods.
 - `const { httpAdapter } = this.httpAdapterHost;`
- **Structure**:
 - Implement strictly typed error responses.
 - Refer to **[API Standards](../nestjs-api-standards/SKILL.md)** for `ApiErrorResponse`.

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
3. **Global Filter**: Formats final JSON response.

## Built-in Exceptions

- **Use**: Throw `NotFoundException`, `ForbiddenException`, `BadRequestException`.
- **Custom**: Extend `HttpException` only for domain-specific failures that need specific status codes.

## Logging

- **Context**: Always pass `MyClass.name` to `Logger` constructor.
- **Levels**:
 - `error`: 500s (Stack trace required).
 - `warn`: 400s (Client errors).

## Security (Information Leakage)

- **Production**: **NEVER** expose stack traces in HTTP responses (`process.env.NODE_ENV === 'production'`).
- **Sanitization**: Ensure `ApiException` payloads not leak internal file paths or raw variable dumps.


## Anti-Patterns

- **No stack traces in production**: Gate stack exposure behind `NODE_ENV === 'production'` check.
- **No Express types in filters**: Use `HttpAdapterHost` for platform-agnostic error handling.
- **No HttpException in services**: Throw domain errors in services; let Interceptors map to HTTP exceptions.