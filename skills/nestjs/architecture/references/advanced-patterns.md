# NestJS Advanced Architecture Patterns

## Dynamic Modules

Use `ConfigurableModuleBuilder` to standardise `forRoot`, `register`, and `forFeature` methods.

- `forRoot`: Global (DB, Global Config).
- `register`: Local/Instance configuration.
- `forFeature`: Extending existing modules with entities/providers.

## Advanced Providers

- **Factory Providers**: `useFactory` for async initialization or configuration-dependent logic.
- **Aliasing**: `useExisting` to abstract implementations or provide compatibility.

## Scopes & Lifecycle (Performance)

- **Request Scope (`Scope.REQUEST`)**: Bubbles up to controllers. Use sparingly due to re-instantiation overhead.
- **Durable Providers**: Use `durable: true` in multi-tenant apps to keep performance high while isolating contexts.
- **Graceful Shutdown**: Always call `app.enableShutdownHooks()` in `main.ts` to handle `SIGTERM`.

## Reliability

- **Health Checks**: Use `@nestjs/terminus` for `/health` endpoints (DB, Redis, Disk).
- **Structured Logging**: Use `nestjs-pino` for JSON logs with Request ID correlation.
