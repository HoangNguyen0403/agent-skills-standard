---
name: nestjs-architecture
description: Design NestJS module boundaries and provider ownership. Use only when structuring feature/core/shared modules, controller-service boundaries, or provider lifetime; defer JWT/security, caching, and unrelated request-pipeline recipes.
metadata:
  triggers:
    files:
    - '**/*.module.ts'
    - 'main.ts'
    keywords:
    - NestFactory
    - Module
    - Controller
    - Injectable
---
# NestJS Architecture Expert

## **Priority: P0 (CRITICAL)**

Design feature modules with singleton-first providers and explicit request-pipeline choices.

## Decision Map

- **Module role**: Feature Modules (Auth) vs Core (Config/DB) vs Shared (Utils). Feature owns its controllers, application services, and adapters. Shared exports stateless helpers only.
- **Provider scope**: default singleton. Use request scope only for tenant context, request-local caching, or request tracking. Treat request scope as a measured exception.
- **Pipeline choice**: middleware for raw HTTP concerns, guard for access decisions, pipe for validation/transforms, interceptor for cross-cutting request/response behavior, filter for error translation.

## Recipe

1. **Create bounded feature**: module + controller + application service + persistence adapter.
2. **Keep controller thin**: Thin controllers, fat services. No business in Controller. Move logic to Service.
3. **Register dependencies once**: imports for modules, providers for services, exports only for true consumers. `@InjectRepository()` dependencies need `TypeOrmModule.forFeature([...])`.
4. **Validate at edges**: DTO validation pipes for incoming data; never trust raw payloads in services.
5. **Check circular imports**: check circular dependencies with `madge`; refactor contracts first and use `forwardRef()` only as last resort.

## Verify

- [ ] Feature module owns one business capability, not a mixed grab bag.
- [ ] Providers are singleton unless request scope has a written reason.
- [ ] Guard/pipe/interceptor/filter placement matches the request lifecycle.
- [ ] Config uses `@nestjs/config` or a typed config layer, not scattered `process.env`.
- [ ] Dependency Integrity: DB repositories, queues, and clients are registered in the module graph, not manually instantiated.

## Anti-Patterns

- **No request scope by default**: Singleton first; justify heavier scope.
- **No business logic in controllers**: Delegate orchestration to services/use cases.
- **No entity leakage**: Don't return ORM entities; return DTOs or response models.
- **No manual instantiation**: Use DI; never `new Service()` inside Nest code.

## References

- [Framework Map](../references/framework-map.md)
- [Advanced Patterns](references/advanced-patterns.md)
- [Dynamic Modules](references/dynamic-module.md)

## Module-boundary checklist

- Separate Feature Modules (Auth) from Core (Config/DB) and Shared (Utils); keep controllers thin and do not return ORM entities directly.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Dependency Integrity
- Don't return ORM entities
- Feature Modules (Auth) vs Core (Config/DB) vs Shared (Utils)
