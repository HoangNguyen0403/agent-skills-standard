---
name: PostgreSQL Database
description: Data access patterns, Scaling, Migrations, and ORM selection.
metadata:
  labels: [nestjs, database, postgresql, typeorm, prisma]
  triggers:
    files: ['**/*.entity.ts', 'prisma/schema.prisma', '**/migrations/*.sql']
    keywords: [TypeOrmModule, PrismaService, PostgresModule, Repository]
---

# PostgreSQL Database Standards

## **Priority: P0 (FOUNDATIONAL)**

Integration patterns and ORM standards for PostgreSQL applications.

## Selection Strategy

See [references/best-practices.md](references/best-practices.md) for database selection matrix and scaling patterns (Connection Pooling, Sharding).

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
- **Row-Level Security (RLS)**: `typeorm migration:generate` **cannot** detect RLS policies (`CREATE POLICY`). You **MUST** use `migration:create` and write raw `queryRunner.query()` SQL to define and version-control RLS policies.

## Best Practices

1. **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
2. **Indexing**: Define indexes in code (decorators/schema) for frequently filtered columns (`where`, `order by`).
3. **Transactions**: Use `QueryRunner` (TypeORM) or `$transaction` (Prisma) for all multi-step mutations to ensure atomicity.
4. **Row-Level Security (RLS) Performance**:
   - RLS adds a small overhead to _every_ query on the table because the database must evaluate the policy conditions (e.g., `WHERE tenant_id = current_setting('app.tenant_id')`).
   - **Mitigation**: ALWAYS create an index on the columns used in your RLS policies (usually `user_id` or `tenant_id`).
   - **Warning**: Avoid complex `JOIN`s or subqueries inside the RLS policy definition itself, as this can multiply execution time heavily. Keep policies simple (direct column comparisons).
