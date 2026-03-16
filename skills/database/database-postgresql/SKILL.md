---
name: database-postgresql
description: "Data access patterns, scaling, migrations, and ORM selection for PostgreSQL. (triggers: **/*.entity.ts, prisma/schema.prisma, **/migrations/*.sql, TypeOrmModule, PrismaService, PostgresModule)"
---

# PostgreSQL Database Standards

## **Priority: P0 (FOUNDATIONAL)**

Integration patterns and ORM standards for PostgreSQL applications.

## Patterns & Architecture

- **Repository Pattern**: Isolate database logic. Use `@InjectRepository()` or `PrismaService`.
- **Relationship Integrity**: Avoid redundant raw ID columns. Favor relation properties.

## Migrations (Strict Rules)

- **NEVER** use `synchronize: true` in production.
- **Generation**: Modify `.entity.ts` -> run `pnpm migration:generate`.
- **Zero-Downtime**: Use Expand-Contract pattern (Add -> Backfill -> Drop) for destructive changes.
- **RLS**: `typeorm migration:generate` cannot detect Row-Level Security. Use raw `queryRunner.query()` SQL for RLS.

## Performance & Gotchas

- **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
- **Indexing**: Define indexes in code for frequently filtered columns. RLS columns MUST be indexed.
- **Transactions**: Use `QueryRunner` or `$transaction` for multi-step mutations.

## 🚫 Anti-Patterns

- **N+1 Queries**: Avoid lazy-loading relations inside loops. Use query builders.
- **Complex RLS Subqueries**: Avoid heavy `JOIN`s inside RLS definitions.

## References
- [SQL Gotchas (UPDATE FROM)](references/sql-gotchas.md)
