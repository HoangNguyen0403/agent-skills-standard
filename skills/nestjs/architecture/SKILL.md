---
name: NestJS Architecture
description: Module organization, Dependency Injection patterns, and Project Structure.
metadata:
  labels: [nestjs, architecture, modularity]
  triggers:
    files: ['**/*.module.ts', 'main.ts']
    keywords: [Module, forRoot, forFeature, Dependency Injection]
---

# NestJS Architecture Standards

## **Priority: P0 (FOUNDATIONAL)**

## Core Principles

- **Modularity**: Domain logic **must** be encapsulated in `@Module` files.
- **DI**: Use constructor injection. Never use `new` for services/providers.
- **Scalability**: Layer via Feature, Core (Global), and Shared (Stateless) modules.

## Module Strategies

- **Dynamic Modules**: Use `ConfigurableModuleBuilder`. See [Advanced Patterns](references/advanced-patterns.md).
- **Circular Deps**: Use `forwardRef()` or re-architect to a shared common module.
- **Shutdown Hooks**: Enable via `app.enableShutdownHooks()` in `main.ts`.

## Provider Scopes

- **Singleton (Default)**: Use for 99% of use cases.
- **Request Scope**: Bubbles up to controllers. High overhead. Use `Durable Providers` for multi-tenancy.

## Project Organization

- **Feature Modules**: Domain Logic (`UsersModule`, `AuthModule`).
- **Shared Module**: Stateless utilities. Re-exported.
- **Core Module**: Global infrastructure (Guards, Interceptors). Import ONLY in `AppModule`.

## Observability & Health

- **Terminus**: Implement `/health` checks for DB, Cache, and Memory.
- **Pino**: Use JSON logging with `req-id` traces for all requests.

## References

- [Advanced Patterns](references/advanced-patterns.md)
- [Dynamic Modules](references/dynamic-module.md)
