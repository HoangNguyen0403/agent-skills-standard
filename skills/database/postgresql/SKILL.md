---
name: PostgreSQL Database
description: Data access patterns, scaling, migrations, and ORM selection for PostgreSQL. Use when designing PostgreSQL schemas, writing migrations, or choosing an ORM.
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

## SQL Gotchas & Performance Tips

1.  **UPDATE ... FROM Query (PostgreSQL Pitfall)**:
    - The target table (e.g., `UPDATE "table" t`) **cannot** be referenced inside a `JOIN` within the `FROM` clause.
    - **Wrong**: `UPDATE "table" t ... FROM "other" o JOIN "table" t2 ON t2.id = t.id ...`
    - **Right**: Use a comma-separated `FROM` list and move join conditions to the `WHERE` clause.
      ```sql
      UPDATE "vaccination_records" vr
      SET "scheduledDate" = (c."dob" + make_interval(months => vst."targetAgeValue"))::date
      FROM "children" c, "vaccine_schedule_templates" vst
      WHERE c."id" = vr."childId"
        AND vst."id" = vr."scheduleTemplateId";
      ```
2.  **Indexing and RLS**:
    - RLS adds a small overhead to _every_ query. Always index columns used in RLS policies (e.g., `user_id`, `tenant_id`).
    - Avoid complex `JOIN`s or subqueries inside RLS policy definitions.

## Pagination and Performance

1.  **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
2.  **Indexing**: Define indexes in code (decorators/schema) for frequently filtered columns (`where`, `order by`).
3.  **Transactions**: Use `QueryRunner` (TypeORM) or `$transaction` (Prisma) for all multi-step mutations to ensure atomicity.
