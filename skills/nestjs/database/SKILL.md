---
name: NestJS Database
description: Data access patterns, Scaling, Migrations, and ORM selection.
metadata:
  labels: [nestjs, database, typeorm, prisma, mongodb]
  triggers:
    files: ['**/*.entity.ts', 'prisma/schema.prisma']
    keywords: [TypeOrmModule, PrismaService, MongooseModule, Repository]
---

# NestJS Database Standards

## **Priority: P0 (FOUNDATIONAL)**

Database integration patterns and ORM standards for NestJS applications.

## Selection Strategy

See [references/persistence_strategy.md](references/persistence_strategy.md) for database selection matrix and scaling patterns (Connection Pooling, Sharding).

## Patterns

- **Repository Pattern**: Isolate database logic.
  - **TypeORM**: Inject `@InjectRepository(Entity)`.
  - **Prisma**: Create a comprehensive `PrismaService`.
- **Abstraction**: Services should call Repositories, not raw SQL queries.

## Configuration (TypeORM)

- **Async Loading**: Always use `TypeOrmModule.forRootAsync` to load secrets from `ConfigService`.
- **Sync**: Set `synchronize: false` in production; use migrations instead.

## Migrations

- **Never** use `synchronize: true` in production.
- **Generation**: Whenever a TypeORM entity (`.entity.ts`) is modified, a migration **MUST** be generated using `pnpm migration:generate`.
- **Audit**: Always inspect the generated migration file to ensure it matches the entity changes before applying.
- **Production Strategies**:
  - **CI/CD Integration (Recommended)**: Run `pnpm migration:run` in a pre-deploy or post-deploy job (e.g., GitHub Actions, GitLab CI). Ensure the production environment variables are correctly set.
  - **Manual SQL (For restricted DB access)**: Use `typeorm migration:show` to get the SQL or simply copy the `up` method's SQL into a management tool (like Supabase SQL Editor). Always track manual runs in the `migrations` metadata table.
- **Zero-Downtime**: Use Expand-Contract pattern (Add -> Backfill -> Drop) for destructive changes.
- **Seeding**: Use factories for dev data; only static dicts for prod.

## Best Practices

1. **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
2. **Indexing**: Define indexes in code (decorators/schema) for frequently filtered columns (`where`, `order by`).
3. **Transactions**: Use `QueryRunner` (TypeORM) or `$transaction` (Prisma) for all multi-step mutations to ensure atomicity.
