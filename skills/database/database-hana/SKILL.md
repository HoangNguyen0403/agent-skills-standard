---
name: database-hana
description: Apply SAP HANA database standards for SQL parameterization, in-memory engine optimization, dynamic IN query chunking, column aliasing on joins, and datatype casting. Use when writing SQL for SAP HANA, optimizing HANA queries, or diagnosing HANA driver errors.
metadata:
  triggers:
    files:
      - "**/*hana*.go"
      - "**/*sap*.go"
      - "**/hana/**"
      - "**/*hana*.sql"
    keywords:
      - HANA
      - SAP HANA
      - hdb
      - go-hdb
      - CalculationView
---

# SAP HANA Database Standards

## **Priority: P0 (CRITICAL)**

## Rules

- **Strict Parameterization**: Always use `?` parameter placeholders for SAP HANA queries. Never use raw string concatenation, `fmt.Sprintf`, or untrusted interpolation for values.
- **Batching & Chunking Limits**: Chunk large `IN (...)` parameter lists into batches of at most 1,000 items to avoid HANA driver and engine parameter limits.
- **Explicit Column Aliasing**: Always explicitly alias columns in multi-table queries (e.g. `m.code AS code`, `m.name AS name`). SAP HANA and Go database drivers map scan columns by name; duplicate column names across joins silently collide or overwrite values. Never use `SELECT *`.
- **HANA Datatype Casting Gotchas**: SAP HANA functions (such as `COALESCE`, `SUBSTR`, `CONCAT`) require strictly compatible parameter types. Explicitly cast values when comparing or falling back (e.g. `COALESCE(col, 'default')`, `TO_VARCHAR(...)`, `CAST(? AS NVARCHAR)`).
- **Identifier Case-Sensitivity**: Unquoted SQL identifiers in SAP HANA default to UPPERCASE. Quoted identifiers (`"columnName"`) preserve case. Keep identifiers consistent with schema conventions.
- **Keyset & Streaming Pagination**: Avoid deep `LIMIT/OFFSET` on large columnar tables. Prefer keyset/seek pagination (`WHERE id > ? ORDER BY id ASC LIMIT ?`) and stream large result sets using `rows.Next()` directly into models to prevent memory spikes.
- **Transaction Scope**: Keep transactions short and focused on atomic write operations. Never perform slow external I/O or unbounded operations inside an open transaction. Always pair with `defer tx.Rollback()`.

## Verify

- [ ] Query uses `?` placeholders for all user-supplied or dynamic values.
- [ ] Large `IN (...)` queries chunk parameters into batches of ≤ 1,000 items.
- [ ] All joined queries use explicit, distinct column aliases without `SELECT *`.
- [ ] Built-in functions (`COALESCE`, `SUBSTR`) use matching datatypes or explicit `CAST`/`TO_VARCHAR`.
- [ ] Pagination enforces strict `LIMIT` caps and stable `ORDER BY`.
- [ ] Transactions are scoped to write paths with `defer tx.Rollback()`.

## Anti-Patterns

- **No SQL String Concatenation**: Never build dynamic `WHERE` clauses by concatenating unescaped strings. Build parameterized placeholder slices.
- **No Unbounded IN Clauses**: Passing thousands of IDs in a single `IN (?, ?, ...)` clause triggers HANA driver buffer overflow or query parsing degradation.
- **No SELECT \* on Joins**: Scanning duplicate column names across joined tables leads to silent bugs where one table's ID overwrites another.
- **No Incompatible COALESCE Arguments**: Providing mismatched types (e.g. integer column with string fallback) causes runtime HANA `inconsistent datatype` errors.
- **No Heavy Reads Inside Transactions**: Do not perform long calculation view aggregations or external network calls while holding an open transaction lock.

## References

- [SAP HANA Patterns & Query Builders](references/hana-patterns.md)
- [SAP HANA SQL Gotchas](references/sql-gotchas.md)
