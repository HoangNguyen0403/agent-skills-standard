# PostgreSQL Production Gotchas

## 🛡️ `UPDATE ... FROM` Query

The target table **cannot** be referenced inside a `JOIN` within the `FROM` clause. Use a comma-separated `FROM` list to avoid unexpected `INNER JOIN` behavior or syntax errors.

```sql
-- BAD
UPDATE users SET active = true FROM profiles JOIN users ON ...

-- GOOD
UPDATE users SET active = true FROM profiles WHERE users.id = profiles.user_id;
```

## 🌍 Timezone Confusion (`TIMESTAMP` vs `TIMESTAMPTZ`)

Always use `TIMESTAMPTZ`. Standard `TIMESTAMP` ignores the session timezone and can lead to silent data corruption when moving between servers or handling DST.

- `TIMESTAMPTZ`: Stores UTC internally, converts to session TZ on display.
- `TIMESTAMP`: Perspective-less wall clock time.

## ❓ The `NULL` Trait

In SQL, `NULL` is "unknown," not "empty."

- `val = NULL` → Returns `NULL` (falsy in `WHERE`).
- **Fix**: Use `val IS NULL` or `val IS NOT NULL`.
- **Note**: `NOT (val = 'x')` will skip rows where `val` is `NULL`. Use `IS DISTINCT FROM` for null-safe inequality.

## ⚡ Case-Insensitive Search (`ILIKE`)

`ILIKE` is convenient but ignores standard B-tree indexes.

- **Fix**: Use a functional index `CREATE INDEX ... ON table (LOWER(column))` or use the `pg_trgm` extension for GIN/GIST index support on pattern matching.

## 📦 `JSONB` Containment

Use the containment operator `@>` instead of `->>` for better performance on large JSONB columns.

```sql
-- FAST (Uses GIN index)
SELECT * FROM logs WHERE data @> '{"level": "error"}';

-- SLOW (Linear scan)
SELECT * FROM logs WHERE data->>'level' = 'error';
```
