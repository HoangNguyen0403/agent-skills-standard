---
name: MongoDB Best Practices
description: Expert rules for schema design, indexing, and performance in MongoDB (NoSQL).
metadata:
  labels: [mongodb, nosql, mongoose, database, performance]
  triggers:
    files: ['**/*.ts', '**/*.js', '**/*.json']
    keywords: [mongo, mongoose, objectid, schema, model]
---

# MongoDB Best Practices

## **Priority: P0 (CRITICAL)**

## Guidelines

- **Schema Design**:
  - **Embed vs Reference**:
    - **Embed** (1:Few): Addresses, Phone Numbers. Optimization: Read locality.
    - **Reference** (1:Many/Infinity): Logs, Activity History. Optimization: Document size limits (16MB).
  - **Bucket Pattern**: For time-series or high-cardinality "One-to-Many", bucket items into documents (e.g., `DailyLog`).
- **Indexing**:
  - **ESR Rule**: Equality, Sort, Range. Order your index keys `(status, date, price)` if you query `status='A'`, sort by `date`, filter `price > 10`.
  - **Text Search**: Use `$text` search instead of `$regex` for keywords. `$regex` is slow (linear scan) unless anchored (`^prefix`).
  - **Covered Queries**: Project only indexed fields to avoid fetching the document (`PROJECTION` is key).
  - **Explain Plan**: Target `nReturned` / `keysExamined` ratio of ~1. If `docsExamined` >> `nReturned`, index is inefficient.

- **Sharding (Horizontal Scale)**:
  - **Shard Key**: Avoid monotonically increasing keys (e.g., `Timestamp`, `ObjectId`) for high-write workloads (creates "Hot Shards"). Use Hashed Sharding or high-cardinality natural keys.
- **Performance**:
  - **Avoid `skip()`**: Use `_id` or sort-key based pagination (`bucket_id > last_id`). `skip(10000)` scans 10000 docs.
  - **Aggregation**: Prefer Aggregation Framework (`$match`, `$group`) over bringing data to client (JS).
- **Operations**:
  - **Write Concern**: Understand `w:1` (Ack) vs `w:majority` (Safe).
  - **Transactions**: Use only when ACID across multiple documents is stricter than performance needs.

## Anti-Patterns

- **Large Arrays**: Don't let arrays grow unboundedly (`$push` without limit).
- **Client-Side Filtering**: Don't fetch 1MB document to use 1KB of data.
- **Deep Nesting**: Avoid >4 levels of nesting (hard to query/update).

## References

- [Best Practices Guide](references/best-practices.md)
- [Anti-Patterns](references/anti-patterns.md)
- [Postgres vs Mongo Comparison](references/postgres-comparison.md)
