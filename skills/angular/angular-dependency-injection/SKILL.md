---
name: angular-dependency-injection
description: "Best practices for DI, inject() usage, and providers. Use when configuring Angular dependency injection, using inject(), or defining providers. (triggers: **/*.service.ts, angular inject, providedIn, injection token, provideAppInitializer)"
---

# Dependency Injection

## **Priority: P0 (CRITICAL)**

## Principles

- **`inject()` over Constructor**: Use the `inject()` function for cleaner injection updates and type inference.
- **Tree Shaking**: Always use `providedIn: 'root'` for services unless specific scoping is required.
- **Tokens**: Use `InjectionToken<T>` for configuration, primitives, or interface abstraction.

## Guidelines

- **Providers**: Prefer `provide*` functions (e.g., `provideHttpClient()`) in `app.config.ts` over importing modules.
- **Factories**: Use `useFactory` strictly when dependencies need runtime configuration.
- **App Initializer**: Use `provideAppInitializer(() => inject(ConfigService).load())` (Angular 19+) to run async code before app starts — replaces `APP_INITIALIZER` token.
- **Route Providers**: Scope services to a route tree using `providers: [...]` in route config instead of `providedIn: 'root'`.
- **Multi Providers**: Use `{ provide: TOKEN, useClass: Impl, multi: true }` to collect multiple implementations (e.g., validators, interceptors).

## Anti-Patterns

- **No `providedIn: 'platform'`**: Use `'root'` scoping; reserve platform only for Micro Frontend sharing.
- **No `forwardRef`**: Refactor architecture to eliminate circular dependencies instead.

## References

- [DI Patterns](references/di-patterns.md)
