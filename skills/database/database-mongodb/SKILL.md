---
name: database-mongodb
description: Apply expert schema design, indexing, and performance rules for MongoDB. Use when designing MongoDB schemas, creating indexes, or optimizing NoSQL query performance.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.js'
    - '**/*.json'
    keywords:
    - mongo
    - mongoose
    - objectid
    - schema
    - model
---
# MongoDB Best Practices

## **Priority: P0 (CRITICAL)**

## Schema Design

- **Embed vs Reference**:
 - **Embed** (1:Few): Addresses, Phone Numbers. Optimization: Read locality.
 - **Reference** (1:Many/Infinity): Logs, Activity History. Optimization: Document size limits (16MB).
- **Bucket Pattern**: For time-series or high-cardinality "One-to-Many", bucket items into documents (e.g., `DailyLog`).

## Optimize Indexes

- **ESR Rule**: Equality, Sort, Range. Order your index keys `(status, date, price)` if you query `status='A'`, sort by `date`, filter `price > 10`.

See [implementation examples](references/implementation.md) for compound index and pagination patterns.

- **Text Search**: Use `$text` search instead of `$regex` for keywords. `$regex` slow (linear scan) unless anchored (`^prefix`).
- **Covered Queries**: Project only indexed fields to avoid fetching document (`PROJECTION` key).
- **Explain Plan**: Target `nReturned` / `keysExamined` ratio of ~1. If `docsExamined` >> `nReturned`, index inefficient.

## Scale with Sharding

- **Shard Key**: Avoid monotonically increasing keys (e.g., `Timestamp`, `ObjectId`) for high-write workloads (creates "Hot Shards"). Use Hashed Sharding or high-cardinality natural keys.

## Improve Query Performance

- **Cursor-Based Pagination**: Use `_id` or sort-key based pagination instead of `skip()`. `skip(10000)` scans 10000 docs.

- **Aggregation**: Prefer Aggregation Framework (`$match`, `$group`) over bringing data to client (JS).

## Configure Operations

- **Write Concern**: Understand `w:1` (Ack) vs `w:majority` (Safe).
- **Transactions**: Use only when ACID across multiple documents stricter than performance needs.

## Anti-Patterns

- **No unbounded arrays**: Use `$push` with `$slice` or redesign using Bucket Pattern.
- **No client-side filtering**: Project only needed fields; never fetch full docs to filter in memory.
- **No deep nesting**: Keep nesting ≤4 levels; flatten paths that frequently queried.

## References

- [Best Practices Guide](references/best-practices.md)
- [Anti-Patterns](references/anti-patterns.md)
- [Postgres vs Mongo Comparison](references/postgres-comparison.md)