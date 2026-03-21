---
name: angular-dependency-injection
description: 'Best practices for DI, inject() usage, and providers. Use when configuring Angular dependency injection, using inject(), or defining providers. (triggers: **/*.service.ts, angular inject, providedIn, injection token, provideAppInitializer)'
---

# Dependency Injection

## **Priority: P0 (CRITICAL)**

## Principles

- **`inject()` over Constructor**: Use the **inject(MyService)** function in **class fields or constructor-equivalent** class positions for cleaner injection. It works in any **injection context** (class fields, factory functions, guards).
- **Tree Shaking**: Always use **@Injectable({ providedIn: 'root' })** for app-wide singletons unless specific scoping is required.
- **Tokens**: Use **new InjectionToken<T>('description')** for configuration, primitives, or interface abstraction. Provide via: **{ provide: API_URL, useValue: 'https://api.example.com' }** in `app.config.ts`. Inject with: **inject(API_URL)**.

## Guidelines

- **Providers**: Prefer **provide\*()** functions (e.g., **provideHttpClient()**) in `app.config.ts` providers array over importing NgModules.
- **Factories**: Use `useFactory` strictly when dependencies need runtime configuration.
- **App Initializer**: Use **provideAppInitializer(() => inject(ConfigService).load())** (Angular 19+) to run async code **before app bootstrap** — replaces the old `APP_INITIALIZER` token pattern.
- **Route Providers**: Scope services to a route tree using **providers: [MyService]** in **route config** (the routes array) instead of `providedIn: 'root'`. This creates an instance destroyed when leaving the route.
- **Multi Providers**: Use **{ provide: TOKEN, useClass: Impl, multi: true }** to **collects all multi providers** into an array (e.g., **HTTP_INTERCEPTORS**, validators).

## Anti-Patterns

- **No `providedIn: 'platform'`**: Use `'root'` scoping; reserve platform only for Micro Frontend sharing.
- **No `forwardRef`**: Refactor architecture to eliminate circular dependencies instead.

## References

- [DI Patterns](references/di-patterns.md)
