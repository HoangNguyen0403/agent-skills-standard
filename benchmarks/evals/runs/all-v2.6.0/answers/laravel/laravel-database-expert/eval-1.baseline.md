Start with evidence: log the query and bindings, inspect the generated SQL, run `EXPLAIN`/`EXPLAIN ANALYZE`, and measure rows, latency, and frequency. Select only needed columns, replace per-row queries with joins/subqueries or eager loading, and add indexes that match filtering, joining, and ordering patterns. Avoid functions on indexed columns when they prevent index use.

Use query builder/Eloquent for composability, but write a focused SQL expression when it is clearer. Paginate or stream large results, avoid unbounded `get()`, and verify index selectivity and write costs. Benchmark before/after with representative data and check for regressions in transactions, locking, and returned semantics; an index or rewrite without an execution-plan comparison is not proof of improvement.

