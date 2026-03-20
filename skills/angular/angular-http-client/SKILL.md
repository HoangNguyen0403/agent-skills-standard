---
name: angular-http-client
description: "Best practices for HttpClient, Interceptors, and API interactions. Use when integrating HttpClient, writing interceptors, or handling API calls in Angular. (triggers: **/*.service.ts, **/*.interceptor.ts, HttpClient, HttpInterceptorFn, withInterceptors, httpResource, resource)"
---

# HTTP Client

## **Priority: P1 (HIGH)**

## Principles

- **Functional Interceptors**: Use `HttpInterceptorFn`. Class-based interceptors are deprecated.
- **Typed Responses**: Always type `http.get<User[]>()`.
- **Services**: Encapsulate all HTTP calls in Services. Never call `http` in Components.

## Signal-Based HTTP (Angular 17+)

Prefer `httpResource()` over manual subscribe for reactive data loading:

```typescript
// Reactive: refetches automatically when userId() changes
userResource = httpResource<User>(() => `/api/users/${this.userId()}`);
// States: .isLoading() | .hasValue() | .error() | .value() | .reload()
```

Use `resource()` for non-HTTP async operations with full lifecycle control.

## Guidelines

- **Caching**: Implement caching in interceptors or using `shareReplay(1)` in services.
- **Error Handling**: Catch errors in services or global interceptors, not components.
- **Context**: Use `HttpContext` to pass metadata to interceptors (e.g., specific caching rules).

## Anti-Patterns

- **No HTTP in Components**: Encapsulate all HTTP calls in Services.
- **No class-based interceptors**: Use `HttpInterceptorFn` functional interceptors.
- **No manual subscribe for GET**: Use `httpResource()` or `toSignal(http.get(...))` instead.

## References

- [Interceptors](references/interceptors.md)
