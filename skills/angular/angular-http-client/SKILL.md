---
name: angular-http-client
description: "Best practices for HttpClient, Interceptors, and API interactions. Use when integrating HttpClient, writing interceptors, or handling API calls in Angular. (triggers: **/*.service.ts, **/*.interceptor.ts, HttpClient, HttpInterceptorFn, withInterceptors)"
---

# HTTP Client

## **Priority: P1 (HIGH)**

## Principles

- **Functional Interceptors**: Use `HttpInterceptorFn`. Class-based interceptors are deprecated.
- **Typed Responses**: Always type `http.get<User[]>()`.
- **Services**: Encapsulate all HTTP calls in Services. Never call `http` in Components.

## Guidelines

- **Caching**: Implement caching in interceptors or using `shareReplay(1)` in services.
- **Error Handling**: Catch errors in services or global interceptors, not components.
- **Context**: Use `HttpContext` to pass metadata to interceptors (e.g., specific caching rules).

## References

- [Interceptors](references/interceptors.md)


## 🚫 Anti-Patterns

- Do NOT use standard patterns if specific project rules exist.
- Do NOT ignore error handling or edge cases.
