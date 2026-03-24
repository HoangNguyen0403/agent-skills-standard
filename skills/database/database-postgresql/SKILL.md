---
name: database-postgresql
description: "Enforce repository patterns, zero-downtime migrations, and indexing standards for PostgreSQL with TypeORM or Prisma. Use when defining entities, writing migrations, adding RLS policies, or optimizing query performance. (triggers: **/*.entity.ts, prisma/schema.prisma, **/migrations/*.sql, TypeOrmModule, PrismaService, PostgresModule)"
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

### Example: Expand-Contract Migration

```sql
-- Step 1: Add new column (non-breaking)
ALTER TABLE orders ADD COLUMN status_v2 VARCHAR(50);

-- Step 2: Backfill
UPDATE orders SET status_v2 = status;

-- Step 3: Drop old column (after code deploys)
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders RENAME COLUMN status_v2 TO status;
```

## Performance & Gotchas

- **Pagination**: Mandatory. Use limit/offset or cursor-based pagination.
- **Indexing**: Define indexes in code for frequently filtered columns. RLS columns MUST be indexed.
- **Transactions**: Use `QueryRunner` or `$transaction` for multi-step mutations.

## Anti-Patterns

- **No N+1 queries**: Use query builders or eager-load relations instead of lazy-loading in loops.
- **No heavy RLS joins**: Keep RLS predicates simple; move complex logic to the query/view layer.
- **No synchronize in production**: Always run explicit migrations; `synchronize: true` is destructive.

## References
- [SQL Gotchas (UPDATE FROM)](references/sql-gotchas.md)
