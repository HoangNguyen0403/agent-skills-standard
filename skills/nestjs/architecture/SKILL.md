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

## Core Principles

1. **Modularity**: Every feature **must** be encapsulated in its own `@Module`.
   - **Do**: `users.module.ts`, `auth.module.ts`.
   - **Don't**: Everything in `app.module.ts`.
2. **Dependency Injection (DI)**: Invert control. Never manually instantiate classes (e.g., `new Service()`).
   - **Use**: Constructor injection `constructor(private readonly service: Service)`.
3. **Scalability**: Use **Feature Modules** for domain logic and **Core/Shared Modules** for reusable utilities.

## Module Configuration

### Dynamic Modules

- **Modern Pattern**: Use `ConfigurableModuleBuilder` class to auto-generate `forRoot`/`register` methods properly.
- **Reference**: See [Dynamic Module Builder Implementation](references/dynamic-module.md) for the boilerplate code.
  - **Conventions**:
    - `forRoot`: Global configurations (Db, Config).
    - `register`: Per-instance configurations.
    - `forFeature`: Extending a module with specific providers/entities.

### Circular Dependencies

- **Avoid**: Re-architect to move shared logic to a common module.
- **Constraint**: If unavoidable, use `forwardRef(() => ModuleName)` on **both** sides of the import.

## Advanced Providers

- **Factory Providers**: Use `useFactory` heavily for providers dependent on configuration or async operations.
- **Aliasing**: Use `useExisting` to provide backward compatibility or abstract different implementations.

## Scopes & Lifecycle

- **Default**: **Singleton**. Best performance.
- **Request Scope**: Use `Scope.REQUEST` sparingly.
  - **Performance Warning**: Request scope **bubbles up**. If a Service is request-scoped, every controller injecting it becomes request-scoped, triggering re-instantiation per request (~5-10% latency overhead).
- **Multi-tenancy**: If request-scope is needed (e.g. Tenant ID header), use **Durable Providers** (`durable: true`) with `ContextIdFactory` to reuse DI sub-trees.
- **Shutdown**: `SIGTERM` doesn't trigger cleanup by default.
  - **Mandatory**: Call `app.enableShutdownHooks()` in `main.ts`.

## Structure & Organization

- **Feature Modules**: Domain logic (`ShopModule`, `AuthModule`). Encapsulated.
- **Shared Module**: Reusable providers (`DateService`, `MathService`) exported to other modules. **Stateless**.
- **Core Module**:
  - **Role**: Global infrastructure setup ONE TIME (Interceptors, Filters, Loggers).
  - **Rule**: Import `CoreModule` **only** in `AppModule`.
  - **Contents**: `APP_INTERCEPTOR`, `APP_FILTER`, `APP_GUARD` providers.

## Reliability & Observability

- **Health Checks**: Mandatory for K8s/Docker.
  - **Tool**: Use `@nestjs/terminus`. Expose `/health` endpoint checking DB, Cache (Redis), and Memory.
- **Structured Logging**:
  - **Warning**: Default NestJS logger is unstructured text.
  - **Standard**: Use `nestjs-pino` for JSON-formatted logs with automatic `req-id` correlation and request duration tracking.
  - **Context**: Inject `Logger` into services to keep traces connected.
