# PostgreSQL Anti-Patterns ("Don't Do This")

Synthesized from the official Postgres Wiki.

## 1. Data Types

- **Don't use `money`**:
  - **Why?** Locale-dependent output, confusing rounding, hard to migrate.
  - **Do:** Use `numeric(precision, scale)` or integer (store cents).
- **Don't use `char(n)`**:
  - **Why?** Pads with spaces. 'a' becomes 'a '. Slower usually due to padding overhead.
  - **Do:** Use `text` or `varchar` (without length). `text` is the native optimized string type.
- **Don't use `serial`**:
  - **Why?** Old, non-standard, permissions hassle (sequence ownership).
  - **Do:** Use `GENERATED ALWAYS AS IDENTITY` (SQL Standard).
- **Don't use `timestamp` (without time zone)**:
  - **Why?** Assumes local server time. Breaks when server moves or users are global.
  - **Do:** Use `timestamptz`. Stores as UTC, displays in client timezone.

## 2. SQL Constructs

- **Don't use `NOT IN` with NULLs**:
  - **Why?** `val NOT IN (1, NULL)` evaluates to `NULL` (unknown), not `FALSE`.
  - **Do:** Use `NOT EXISTS` or `LEFT JOIN ... WHERE id IS NULL`.
- **Don't use `BETWEEN` for timestamps**:
  - **Why?** `BETWEEN` is inclusive. `2023-01-01` to `2023-02-01` includes midnight Feb 1st.
  - **Do:** `created_at >= '2023-01-01' AND created_at < '2023-02-01'`.
- **Don't use `UPPER CASE` identifiers**:
  - **Why?** Postgres folds unquoted identifiers to lowercase. `"UserTable"` != `UserTable`.
  - **Do:** Use `snake_case` for everything (`user_table`).

## 3. Operations

- **Don't use `psql -W`**:
  - **Why?** Prompts for password, preventing automation.
  - **Do:** Use `.pgpass` file or environment variables.
- **Don't use Rules (`CREATE RULE`)**:
  - **Why?** Complex, often rewritten unexpectedly. Can double-execute functions.
  - **Do:** Use Triggers (`CREATE TRIGGER`).
  - **Why?** Table bloat will kill performance and eventually database availability (transaction ID wraparound).
  - **Do:** Tune `autovacuum_vacuum_scale_factor` for large tables.

## 4. Concurrency Anti-Patterns

- **Don't hold transactions open**:
  - **Why?** Holds locks, prevents vacuuming of old row versions (bloat), increases deadlock risk.
  - **Do:** Commit as soon as the logical unit of work is done.
- **Don't use `LOCK TABLE`**:
  - **Why?** serializes all access to the table, killing performance.
  - **Do:** rely on Row-Level locks or advisory locks (`pg_advisory_lock`) if needed.
