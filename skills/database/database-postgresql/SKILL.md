---
name: database-postgresql
description: Apply PostgreSQL standards for migrations, indexing, transactions, and ORM boundaries. Use when editing entities, Prisma schema, migrations, RLS, or query-performance work for PostgreSQL.
metadata:
  triggers:
    files:
      - "**/*.entity.ts"
      - "prisma/schema.prisma"
      - "**/migrations/*.sql"
    keywords:
      - TypeOrmModule
      - PrismaService
      - PostgresModule
---

# PostgreSQL Database Standards

## **Priority: P0 (CRITICAL)**

## Rules

- Keep PostgreSQL choices driven by real read/write paths.
- Use explicit migrations; never rely on `synchronize: true` in production.
- Treat RLS, constraints, and indexes as first-class schema behavior; use `queryRunner.query()` when raw migration SQL is required.
- Enable RLS explicitly in a migration (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`) and create tenant policies before application rollout.
- Put multi-step consistency inside one transaction boundary.

## Verify

- [ ] Destructive schema change uses expand -> backfill -> contract rollout.
- [ ] Query shape has matching indexes for filter, join, and sort paths.
- [ ] Pagination strategy is explicit.
- [ ] Transaction boundary matches one business action.
- [ ] RLS or tenant predicates are supported by indexes.

## Anti-Patterns

- **No N+1 queries**: Use query builders or eager-load relations instead of lazy-loading in loops.
- **No heavy RLS joins**: Keep RLS predicates simple; move complex logic to query/view layer.
- **No synchronize in production**: Always run explicit migrations; `synchronize: true` destructive.
- **No blind index sprawl**: each index needs a query owner.

## References

- [Framework Map](../references/framework-map.md)
- [Implementation Examples](references/implementation.md)
- [SQL Gotchas (UPDATE FROM)](references/sql-gotchas.md)
