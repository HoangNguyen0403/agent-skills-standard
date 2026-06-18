# Database Framework Map

Reviewed: 2026-06-17

Official sources:
- PostgreSQL: https://www.postgresql.org/docs/current/indexes.html and https://www.postgresql.org/docs/current/transaction-iso.html
- MongoDB: https://www.mongodb.com/docs/manual/data-modeling/ and https://www.mongodb.com/docs/manual/data-modeling/best-practices/
- Redis: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/ and https://redis.io/docs/latest/commands/expire/

## Default stance

- Start from access patterns and consistency needs, not from tables or collections alone.
- Pick the narrow skill:
  - `database-schema-design`
  - `database-migrations`
  - `database-query-performance`
  - `database-transactions`
  - engine-specific skill: PostgreSQL, MongoDB, Redis

## Decision map

- Schema shape unclear: load `database-schema-design`.
- Backfill, rename, or rollout risk: load `database-migrations`.
- Slow query, missing index, scan, or explain plan: load `database-query-performance`.
- Multi-step write or consistency rule: load `database-transactions`.
- Engine-specific modeling/runtime detail: load PostgreSQL, MongoDB, or Redis.

## Engine defaults

- PostgreSQL: model explicit constraints, use transactions deliberately, and index real filter/sort paths.
- MongoDB: store data that is read together together; embed vs reference from access patterns.
- Redis: treat as latency infrastructure, not your only source of truth.

## Smells that mean "load more skills"

- ORM migration changes columns destructively in one step.
- Indexes are added without query evidence.
- Cross-document or cross-table consistency logic is implicit.
- Cache keys have no TTL or invalidation ownership.
