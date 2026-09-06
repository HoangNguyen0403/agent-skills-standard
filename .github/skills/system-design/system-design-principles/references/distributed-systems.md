# Distributed Systems: CAP Theorem & Consistency Patterns

## CAP Theorem

> A distributed system can guarantee only **two of three** properties simultaneously:
>
> - **Consistency (C)**: Every read receives the most recent write or an error.
> - **Availability (A)**: Every request receives a response (not necessarily the most recent).
> - **Partition Tolerance (P)**: The system continues operating despite network partitions.

Network partitions are inevitable in distributed systems — **P is non-negotiable**. The real trade-off is **C vs A**.

### Decision Tree

```bash
Is strong consistency required?
├── YES → CP system (e.g., relational DB, ZooKeeper, etcd)
│         Accept: returns error during partition rather than stale data
└── NO  → AP system (e.g., DynamoDB, Cassandra, CouchDB)
          Accept: may return stale data; resolves via eventual consistency
```

### Common System Profiles

| System              | Profile | Rationale                            |
| ------------------- | ------- | ------------------------------------ |
| Banking ledger      | CP      | Money cannot be double-spent         |
| Shopping cart       | AP      | Better to show stale cart than error |
| Session store       | AP      | Availability > consistency for UX    |
| Config store (etcd) | CP      | All nodes must see same config       |

## Eventual Consistency {#eventual-consistency}

Data written to one node will propagate to all nodes — **eventually** (milliseconds to seconds).

**Design rules for eventually consistent systems:**

1. **Idempotent writes**: Safe to replay the same write multiple times.
2. **Conflict resolution**: Define a strategy — Last Write Wins (LWW), vector clocks, CRDTs, or application-level merge.
3. **Read-your-writes**: If a user writes data, they must see their own write. Use sticky sessions or read from the primary for the writer's session.
4. **Monotonic reads**: A user should never see older data after seeing newer data.

## Idempotency {#idempotency}

An idempotent operation: calling it once or N times has the same result.

**HTTP verbs**: `GET`, `PUT`, `DELETE` are idempotent by spec. `POST` is not.

**Pattern — Idempotency Key**:

```bash
POST /payments
Idempotency-Key: uuid-v4-client-generated

Server: store (idempotency_key, result) in durable store.
On duplicate key: return stored result without re-processing.
```

**Database upserts** are a common idempotency mechanism:

```sql
INSERT INTO payments (id, amount, status)
VALUES ($1, $2, 'pending')
ON CONFLICT (id) DO NOTHING;
```
