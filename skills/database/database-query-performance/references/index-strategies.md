# Index Strategies

## Match the index to the query shape

- **Equality filters**: a B-tree index on the filtered column(s), leftmost-first for composite indexes.
- **Range filters** (`>`, `<`, `BETWEEN`): the ranged column should be the last column in the composite index — columns after it in the index can't be used efficiently.
- **Sort (`ORDER BY`)**: an index matching the sort column(s) and direction avoids a separate sort step; combine with the filter columns first, then sort columns.
- **Joins**: index the foreign-key column on the "many" side of the join.

## Composite index column order

For an index on `(a, b, c)`:
- Equality on `a` and `b`, range on `c` → put `a, b` first, `c` last.
- A query that only filters on `b` or `c` alone cannot use this index efficiently (no leading-column match) — it needs its own index or a reordered composite.

## Covering indexes

- Include commonly selected columns in the index (`INCLUDE` in Postgres/SQL Server, extra columns in MySQL) so the query is satisfied entirely from the index without a heap/table lookup.
- Worth it for hot, narrow read paths (e.g. a listing endpoint selecting 4-5 columns); not worth it for `SELECT *` on wide tables.

## Reading the explain plan

- Look for sequential/full scans on tables above a few thousand rows in a hot path — that's the primary signal an index is missing.
- A `Nested Loop` join fed by a full scan on the inner side usually means the join column needs an index.
- An index that exists but isn't used often means: the query wraps the column in a function/cast (`WHERE lower(email) = ...` needs an index on `lower(email)`, not `email`), or the planner estimates the table is small enough that a scan is cheaper (this can be correct — verify row counts before forcing index use).

## Write-cost tradeoff

- Every index adds write amplification (insert/update/delete must maintain it) and storage. Before adding an index, name the query path it serves — an index with no query owner is a maintenance cost with no benefit.
