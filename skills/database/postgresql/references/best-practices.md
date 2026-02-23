# PostgreSQL Detailed Best Practices

## 1. Indexing Strategy

- **B-Tree (Default)**: Use for `<`, `<=`, `=`, `>=`, `>`. Covers 95% of cases.
- **GIN (Generalized Inverted Index)**:
  - **JSONB**: `CREATE INDEX idx ON table USING GIN (data);` for `@>` containment operators.
  - **Full Text Search**: `tsvector` columns.
- **BRIN (Block Range Index)**: For very large tables with naturally ordered data (dates, IDs). Tiny index size.
- **Partial Indexes**:
  - `CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL;`
  - Reduces index size and maintenance cost.
- **Covering Indexes**:
  - `CREATE INDEX idx_users_email ON users (email) INCLUDE (id, name);`
  - Allows Index-Only Scans (avoids heap lookup).

## 2. Performance Tuning

- **VACUUM & ANALYZE**:
  - **Autovacuum**: Must run frequently. Prevents table bloat and transaction ID wraparound.
  - **ANALYZE**: Updates statistics for query planner. Run manually after bulk inserts.
- **Connection Pooling**:
  - **PgBouncer**: Critical for high-concurrency apps (like Supabase/NestJS).
  - Postgres handles ~100 direct connections well; beyond that, performance degrades sharply.
- **Explain Analyze**:
  - `EXPLAIN (ANALYZE, BUFFERS) SELECT ...`
  - **Sequential Scan**: Bad on large tables (missing index?).
  - **Index Scan**: Good.
  - **Bitmap Heap Scan**: Okay for multiple index combinations.

## 3. RLS (Row Level Security)

- **Always Enable**: `ALTER TABLE secure_table ENABLE ROW LEVEL SECURITY;`
- **Performance Hazard**:
  - Functions in policies run **per row**.
  - Avoid complex joins in policies.
  - **Wrap Session Variables**:

    ```sql
    -- Bad (Function call per row)
    CREATE POLICY "User owns" ON items USING (auth.uid() = user_id);

    -- Better (Postgres caches stable functions, but be careful)
    -- Best: Ensure `auth.uid()` is stable or wrapped in `(SELECT auth.uid())`
    ```

- **Bypass RLS**: Create a `service_role` user with `BYPASS RLS` attribute for admin tasks only.

## 4. Partitioning

- **Declarative Partitioning**: Use for tables >100GB or with high delete rates (time-series).
- **By Range**: Dates (e.g., monthly partitions).
- **By List**: Status/Category.
- **Drop vs Delete**: `DROP TABLE partition_2023` is instantaneous; `DELETE FROM table WHERE year=2023` is slow and generates bloat.

## 5. Concurrency & Locking

- **Transaction Isolation**:
  - **Read Committed (Default)**: Sees data committed before the _query_ began.
  - **Repeatable Read**: Sees data committed before the _transaction_ began. Use for complex reports to ensure consistency.
  - **Serializable**: Strict but prone to serialization failures. Retry logic required.
- **Deadlock Avoidance**:
  - **Consistent Ordering**: Always update multiple rows in the same order (e.g., `ORDER BY id`).
  - **Short Transactions**: The longer a transaction holds locks, the higher the deadlock risk.
- **Explicit Locking**:
  - `SELECT ... FOR UPDATE`: Locks rows for update. Use with care.
  - `FOR UPDATE SKIP LOCKED`: Great for implementing work queues.

## 6. Monitoring & Diagnostics

- **`pg_stat_statements`**:
  - **Must-Have Extension**: Tracks execution stats of all SQL statements.
  - **Key Metrics**: `calls`, `total_exec_time`, `rows`, `shared_blks_hit` (cache hit rate).
- **Log Settings**:
  - `log_min_duration_statement`: Set to `1000` (1s) or `200` (200ms) to catch slow queries.
  - `log_checkpoints`: `on`. Helpful to diagnose I/O spikes.
  - `log_lock_waits`: `on` (if > `deadlock_timeout`). Useful for debugging blocking issues.

## 7. Extensions & Advanced Features

- **Common Extensions**:
  - `uuid-ossp` or `pgcrypto`: For UUID generation.
  - `pg_trgm`: For fuzzy search / trigram matching (better than `LIKE '%...%'`).
  - `postgis`: Industry standard for geospatial data.
- **JSONB Indexing**:
  - Use `gin` index for efficient JSON queries (`@>`, `?`, `?&`).
  - Avoid over-using JSONB for stable, relational data.
