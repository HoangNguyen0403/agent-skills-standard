# Isolation Levels

## The four standard levels

- **Read Uncommitted**: dirty reads possible. Rarely appropriate; most engines (Postgres) treat this as Read Committed anyway.
- **Read Committed** (default in Postgres, SQL Server, Oracle): each statement sees a fresh snapshot. Prevents dirty reads; allows non-repeatable reads and phantom reads.
- **Repeatable Read** (default in MySQL/InnoDB): the whole transaction sees one snapshot. Prevents dirty and non-repeatable reads; phantom reads still possible in some engines (InnoDB closes most phantom cases via next-key locking).
- **Serializable**: transactions behave as if executed one at a time. Prevents all anomalies; pay for it in retry rate under contention.

## Choosing a level

- Default to the engine's default (Read Committed / Repeatable Read) unless a specific anomaly is provable.
- Use **Serializable** only for the specific transactions that need it (e.g. a balance transfer that must never double-spend), not the whole application — it increases serialization-failure retries under load.
- When two transactions can both read-then-write the same row concurrently, either raise isolation for that transaction or use an explicit row lock (`SELECT ... FOR UPDATE`) instead of raising the whole app's default.

## Locking primitives

- `SELECT ... FOR UPDATE`: takes an exclusive row lock; use for read-modify-write sequences (e.g. decrement stock).
- `SELECT ... FOR SHARE`: shared lock, blocks writers but not other readers.
- Optimistic locking (version column + `WHERE version = :v`): prefer when contention is low and you want to avoid holding locks across a round trip.

## Retry on serialization failure

- Serializable and, to a lesser extent, Repeatable Read can raise a serialization-failure error under contention. The transaction must be retried from its start, not resumed — treat this as an expected control-flow path, not an exceptional bug.
