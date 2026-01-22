---
name: Dependency Injection
description: Best practices for DI, inject() usage, and providers.
metadata:
  labels: [angular, di, injection, providers]
  triggers:
    files: ['**/*.service.ts', '**/*.ts']
    keywords: [angular inject, providedIn, injection token]
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

## Anti-Patterns

- **Global State**: Avoid `providedIn: 'platform'` unless absolutely necessary (share between Micro Frontends).
- **Circular Deps**: Use `forwardRef` only as a last resort; refactor architecture instead.

## References

- [DI Patterns](references/di-patterns.md)
