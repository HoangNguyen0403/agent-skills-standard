---
name: PostgreSQL Best Practices
description: Expert rules for performant, secure, and scalable PostgreSQL database design and querying.
metadata:
  labels: [postgresql, database, sql, performance, security, rls]
  triggers:
    files:
      ['**/*.sql', '**/migrations/*', 'schema.prisma', '**/typeorm/*.entity.ts']
    keywords: [postgres, sql, migration, index, rls, database]
---

# PostgreSQL Best Practices

## **Priority: P0 (CRITICAL)**

## Guidelines

- **Indexing**:
  - Default to **B-Tree**. Use **GIN** for `jsonb`/`tsvector`.
  - Index Foreign Keys (FKs) manually; Postgres doesn't do it auto.
  - Use **Partial Indexes** (`WHERE status = 'active'`) for sparse data.
  - **Covering Indexes**: `INCLUDE (col)` to avoid heap lookups.
- **Data Types**:
  - IDs: Use `bigint` or `uuid`. Avoid `int` (overflow risk).
  - Text: Use `text`. Avoid `char(n)` (padding) or `varchar(n)` (useless limit).
  - Time: Use `timestamptz`. Avoid `timestamp` (timezone confusion).
  - Money: Use `numeric`. Avoid `money` (locale issues) or `float` (precision loss).
- **Security (RLS)**:
  - **Enable Always**: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`.
  - **Policies**: Wrap `auth.uid()` or session checks in `(SELECT ...)` optimization.
  - **Principle of Least Privilege**: Grant specific permissions, not `ALL`.
- **Query Performance**:
  - **No `SELECT *`**: Fetch only needed columns.
  - **Pagination**: Use Cursor-based (`WHERE id > last_id`) vs OFFSET (O(n)).
  - **Transactions**: Keep short. Avoid long-running idle transactions.
  - **Upsert**: Use `INSERT ... ON CONFLICT DO UPDATE`.
- **Concurrency**:
  - **Isolation**: Understand `READ COMMITTED` (default) vs `REPEATABLE READ`.
  - **Locking**: Avoid explicit locks (`LOCK TABLE`). Use strict row-level locks (`FOR UPDATE`) sparingly.
  - **Deadlocks**: Order your updates consistently (e.g., sort by ID) to prevent them.
- **Monitoring**:
  - **Enable**: `pg_stat_statements` extension for query analysis.
  - **Logging**: Log slow queries (`log_min_duration_statement = 1000ms`).
- **Connection Management**:
  - **Pooling**: Use a pooler (PgBouncer) for production. Keep transactions short.

## Anti-Patterns

- **No `NOT IN`**: Use `NOT EXISTS` or `LEFT JOIN / IS NULL` (NULL handling).
- **No `serial`**: Use `GENERATED ALWAYS AS IDENTITY`.
- **No Unindexed FKs**: Causes locking issues on cascading deletes.
- **No Logic in DB**: Keep complex logic in app layer (unless performance critical).
- **No `BETWEEN` for Time**: Use `>= start AND < end` (exclusive end).
- **No `count(*)` on Big Tables**: Use `pg_class.reltuples` estimate.
- **No Upper Case**: Use snake_case for all identifiers.

## References

- [Best Practices Guide](references/best-practices.md)
- [Anti-Patterns details](references/anti-patterns.md)
- [Review Checklist](references/checklist.md)
