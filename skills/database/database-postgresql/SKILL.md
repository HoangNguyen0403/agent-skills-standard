---
name: database-postgresql
description: Enforce repository patterns, zero-downtime migrations, and indexing standards for PostgreSQL with TypeORM or Prisma. Use when defining entities, writing migrations, adding RLS policies, or optimizing query performance.
metadata:
  triggers:
    files:
    - '**/*.entity.ts'
    - 'prisma/schema.prisma'
    - '**/migrations/*.sql'
    keywords:
    - TypeOrmModule
    - PrismaService
    - PostgresModule
---
# PostgreSQL Database Standards

## **Priority: P0 (FOUNDATIONAL)**


## Patterns & Architecture

- **Repository Pattern**: Isolate database logic. Use `@InjectRepository()` or `PrismaService`.
- **Relationship Integrity**: Avoid redundant raw ID columns. Favor relation properties.

## Migrations (Strict Rules)

- **NEVER** use `synchronize: true` in production.
- **Generation**: Modify `.entity.ts` -> run `pnpm migration:generate`.
- **Zero-Downtime**: Use Expand-Contract pattern (Add -> Backfill -> Drop) for destructive changes.
- **RLS**: `typeorm migration:generate` cannot detect Row-Level Security. Use raw `queryRunner.query()` SQL for RLS.

See [implementation examples](references/implementation.md) for Expand-Contract migration patterns.

## Performance & Gotchas

- **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
- **Indexing**: Define indexes in code for frequently filtered columns. RLS columns MUST indexed.
- **Transactions**: Use `QueryRunner` or `$transaction` for multi-step mutations.

## Anti-Patterns

- **No N+1 queries**: Use query builders or eager-load relations instead of lazy-loading in loops.
- **No heavy RLS joins**: Keep RLS predicates simple; move complex logic to query/view layer.
- **No synchronize in production**: Always run explicit migrations; `synchronize: true` destructive.

## References
- [SQL Gotchas (UPDATE FROM)](references/sql-gotchas.md)