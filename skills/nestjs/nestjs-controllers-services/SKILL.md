---
name: nestjs-controllers-services
description: Separate Controllers from Services and build Custom Decorators in NestJS. Use when defining NestJS controllers, services, or custom parameter decorators.
metadata:
  triggers:
    files:
    - '**/*.controller.ts'
    - '**/*.service.ts'
    keywords:
    - Controller
    - Injectable
    - ExecutionContext
    - createParamDecorator
---
# NestJS Controllers & Services Standards

## **Priority: P0 (FOUNDATIONAL)**

## Controllers

- **Role**: Handler only. Delegate **all** logic to Services.
- **Context**: `ExecutionContext` helpers (`switchToHttp()`) for platform-agnostic code.
- **Custom Decorators**:
- **Avoid**: `@Request() req` -> `req.user` (Not type-safe).
- **Pattern**: Create typed decorators like `@CurrentUser()`, `@DeviceIp()`.

```typescript
import { RequestWithUser } from 'src/common/interfaces/request.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
```

## DTOs & Validation

- **Strictness**:
- `whitelist: true`: Strip properties without decorators.
- **Critical**: `forbidNonWhitelisted: true`: Throw error if unknown properties exist.
- **Transformation**:
- `transform: true`: Auto-convert primitives (String '1' -> Number 1) and instantiate DTO classes.
- **Documentation**:
- **Swagger Plugin**: `@nestjs/swagger` CLI plugin in `nest-cli.json` auto-detects DTO properties — no manual `@ApiProperty()`.

## Interceptors (Response Mapping)

- Map responses in **Interceptors**, not Controllers.
- `map()` wraps success responses (e.g. `{ data: T }`).
- See **[API Standards](../nestjs-api-standards/SKILL.md)** for `PageDto` and `ApiResponse`.
- `catchError()` maps low-level errors (DB constraints) to `HttpException` (e.g. `ConflictException`) _before_ global filter.

## Services & Business Logic

- **Singleton**: Default.
- **Stateless**: No request-specific state in class properties unless `Scope.REQUEST`.

## Pipes & Validation

- **Global**: Register `ValidationPipe` globally.
- **Route Params**: Fail fast. Always use `ParseIntPipe`, `ParseUUIDPipe` on all ID parameters.

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) { ... }
```

## Lifecycle Events

- **Init**: Use `OnModuleInit` for connection setup.
- **Destroy**: Use `OnApplicationShutdown` for cleanup. (Requires `enableShutdownHooks()`).

## Anti-Patterns

- **No business logic in controllers**: Delegate everything to Services; controllers only parse and respond.
- **No req.user access**: Create typed `@CurrentUser()` decorator instead of accessing raw `req`.
- **No REQUEST scope by default**: Use SINGLETON; it makes entire injection chain request-scoped.

## References

- [Decorator, Pipe & Lifecycle Examples](references/REFERENCE.md)
