---
name: nestjs-database
description: Implement data access patterns, Scaling, Migrations, and ORM selection in NestJS. Use when implementing TypeORM/Prisma repositories, migrations, or database patterns in NestJS.
metadata:
  triggers:
    files:
    - '**/*.entity.ts'
    - 'prisma/schema.prisma'
    keywords:
    - TypeOrmModule
    - PrismaService
    - MongooseModule
    - Repository
---
# NestJS Database Standards

## **Priority: P0 (FOUNDATIONAL)**


## Selection Strategy

See [references/persistence_strategy.md](references/persistence_strategy.md) for database selection matrix and scaling patterns (Connection Pooling, Sharding).

## Patterns

- **Repository Pattern**: Isolate database logic.
 - **TypeORM**: Inject `@InjectRepository(Entity)`.
 - **Prisma**: Create comprehensive `PrismaService`.
- **Abstraction**: Services should call Repositories, not raw SQL queries.

## Configuration (TypeORM)

- **Async Loading**: Always use `TypeOrmModule.forRootAsync` to load secrets from `ConfigService`.
- **Sync**: Set `synchronize: false` in production; use migrations instead.

## Migrations

- **Never** use `synchronize: true` in production.
- **Generation**: Whenever TypeORM entity (`.entity.ts`) modified, migration **MUST** generated using `pnpm migration:generate`.
- **Audit**: Always inspect generated migration file to ensure it matches entity changes before applying.
- **Production Strategies**:
 - **CI/CD Integration (Recommended)**: Run `pnpm migration:run` in pre-deploy or post-deploy job (e.g., GitHub Actions, GitLab CI). Ensure production environment variables correctly set.
 - **Manual SQL (For restricted DB access)**: Use `typeorm migration:show` to get SQL or simply copy `up` method's SQL into management tool (like Supabase SQL Editor). Always track manual runs in `migrations` metadata table.
- **Zero-Downtime**: Use Expand-Contract pattern (Add -> Backfill -> Drop) for destructive changes.
- **Seeding**: Use factories for dev data; only static dicts for prod.

## Best Practices

1. **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
2. **Indexing**: Define indexes in code (decorators/schema) for frequently filtered columns (`where`, `order by`).
3. **Transactions**: Use `QueryRunner` (TypeORM) or `$transaction` (Prisma) for all multi-step mutations to ensure atomicity.


## Anti-Patterns

- **No synchronize in production**: Use explicit migrations; `synchronize: true` drops and recreates columns.
- **No raw entity returns from services**: Map to DTOs before leaving service layer.
- **No unpaginated list queries**: All list endpoints must implement limit/offset or cursor pagination.