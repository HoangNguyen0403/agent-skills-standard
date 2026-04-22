---
name: nestjs-architecture
description: Design decoupled, testable NestJS module boundaries with feature, core, and shared modules. Use when structuring module imports, creating feature modules, or enforcing separation of concerns in NestJS.
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

Design decoupled, testable modules with clear boundaries.

## Workflow: Create New Feature Module

1. **Generate module** — `nest g module users` creates feature module.
2. **Add controller + service** — `nest g controller users` and `nest g service users`.
3. **Register dependencies** — Import `TypeOrmModule.forFeature([User])` in module.
4. **Validate inputs** — Apply `class-validator` decorators on all DTOs.
5. **Check circular deps** — Run `madge --circular src/` to verify no cycles.

## Module Structure Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Modules**: Feature Modules (Auth) vs Core (Config/DB) vs Shared (Utils).
- **Controllers**: Thin controllers, fat services. Verify DTOs here.
- **Services**: Business logic only. Use Repository pattern for DB.
- **Config**: Use `@nestjs/config`, never `process.env` directly.

## Architecture Checklist (Mandatory)

- [ ] **Circular Deps**: there any circular dependencies? (Use `madge`).
- [ ] **Env Validation**: Joi/Zod schema used for env vars?
- [ ] **Exception Filters**: global filters catching unhandled errors?
- [ ] **DTO Validation**: `class-validator` decorators on all inputs?
- [ ] **Dependency Integrity**: all `@InjectRepository()` or injected services properly registered in module's `imports` (via `TypeOrmModule.forFeature`) or `providers`?

## Anti-Patterns

- **No Global Scope**: Avoid global pipes/guards unless truly universal.
- **No Direct Entity**: Don't return ORM entities; return DTOs.
- **No Business in Controller**: Move logic to Service.
- **No Manual Instantiation**: Use DI, never `new Service()`.

## References

- [Advanced Patterns](references/advanced-patterns.md)
- [Dynamic Modules](references/dynamic-module.md)