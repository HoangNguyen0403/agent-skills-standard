---
name: angular-http-client
description: Integrate HttpClient, Interceptors, and API interactions in Angular. Use when integrating HttpClient, writing interceptors, or handling API calls in Angular.
metadata:
  triggers:
    files:
    - '**/*.service.ts'
    - '**/*.interceptor.ts'
    keywords:
    - HttpClient
    - HttpInterceptorFn
    - withInterceptors
    - httpResource
    - resource
---
# HTTP Client

## **Priority: P1 (HIGH)**

## Principles

- **Functional Interceptors**: Use **HttpInterceptorFn** (e.g., `(req, next) => next(req.clone({ setHeaders: { Authorization: token } }))`). Clone requests with `req.clone(` — **class-based interceptors deprecated**. Register via **withInterceptors([...])** in **provideHttpClient**.
- **Typed Responses**: Always type `http.post<T>()`, `http.get<T>()`. Use `inject(HttpClient)` in services (not constructor injection). Add **provideHttpClient(withInterceptors([...]), withFetch())** to `app.config.ts`.
- **Services**: **Encapsulate all HTTP calls in Services**. Never call `http` in Components.

## Signal-Based HTTP (Angular 17+)

Prefer **httpResource<T>()** over manual subscribe for reactive data loading — it auto-refetches when its signal inputs change:

```typescript
// Reactive: refetches automatically when userId() changes
userResource = httpResource<User>(() => `/api/users/${this.userId()}`);
// States: .isLoading() | .hasValue() | .error() | .value() | .reload()
```

Use **resource<T, P>({ request: () => params(), loader: ... })** for non-HTTP async operations with full **.isLoading()** lifecycle control.

## Guidelines

- **Caching**: Implement caching in interceptors or using `shareReplay(1)` in services.
- **Error Handling**: **Handle errors in service** using `catchError` or global interceptors, not components. Use **notification service** for display.
- **Context**: Use **HttpContext** to pass metadata to interceptors (e.g., **skip error handling** or specific caching rules).

## Anti-Patterns

- **No HTTP in Components**: **Encapsulate all HTTP calls in Services**.
- **No class-based interceptors**: Use `HttpInterceptorFn` functional interceptors.
- **No manual subscribe for GET**: Use **httpResource()** or `toSignal(http.get(...))` instead.

## References

- [Interceptors](references/interceptors.md)