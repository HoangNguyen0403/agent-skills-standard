---
name: system-design-data-architecture
description: "Choose and scale the data layer: SQL versus NoSQL per access pattern, single data ownership, replication and read scaling, partition key choice, hot partition and celebrity key mitigation. Use when selecting a store, planning sharding, or fixing a data-tier bottleneck."
metadata:
  triggers:
    keywords:
      - sql vs nosql
      - sharding
      - replication
      - partition key
      - denormalization
      - hot partition
      - data store choice
      - read replica
      - polyglot persistence
---

# Data Architecture

## **Priority: P1 (HIGH)**

Access patterns choose the store. Ownership precedes schema. Shard last, not first.

## Store Selection

1. List every read and write access pattern with its QPS, latency target, and consistency need.
2. Default to a relational store. It wins until a specific pattern proves it cannot serve.
3. Move a pattern to a specialized store only when the relational store fails that named pattern:
   key-value for hot lookups, wide-column for massive ordered writes, document for schema-variant
   aggregates, graph for multi-hop traversal, search index for text and facets, object store for blobs.
4. Every additional store adds sync lag, dual-write risk, and one more operational surface. Justify it.
5. Blobs never live in the primary database; store bytes in object storage and keep the reference.

## Ownership and Consistency

- One writer owns each entity. Cross-service reads use an API or an event stream, never a shared table.
- Classify each flow before choosing replication: money, stock, and identity need strong consistency; feeds, counters, and analytics tolerate eventual.
- Read replicas serve reads only, and replica lag is visible to users. Route read-after-write to the primary or pin the session.
- Cross-entity atomicity across services needs a saga with compensations, not a distributed transaction.

## Scaling Order

Apply in order and stop as soon as headroom is sufficient: index and query fixes, then read replicas,
then caching, then vertical scale, then partition or archive cold data, then shard. Sharding is last
because it costs cross-shard queries, rebalancing, and a permanent partition key commitment.

## Partitioning

- Choose a partition key that is high-cardinality, present in the hottest query, and evenly distributed.
- Hash partitioning spreads load but kills range scans; range partitioning keeps scans but creates a moving hot partition on time-ordered keys.
- Mitigate a **celebrity key** by salting the key, replicating the record, or serving it from a dedicated cache.
- Plan resharding before launch: virtual buckets mapped to physical shards let you move buckets without rewriting keys.

## Anti-Patterns

- **No premature sharding**: an unindexed query at 300 QPS is not a sharding problem.
- **No shared database between services**: it silently couples deploy and schema lifecycles.
- **No dual writes without reconciliation**: use an event log or CDC, then reconcile.
- **No unbounded table growth**: define retention, archival tier, and deletion at design time.
- **No denormalization without an update path**: every copy needs an owner and a refresh trigger.

## Verify

- [ ] Every access pattern mapped to exactly one store with a stated reason
- [ ] Single writer named per entity
- [ ] Consistency class stated per flow
- [ ] Partition key chosen with a hot-partition mitigation
- [ ] Retention and archival defined

## References

- [Database Scaling](references/database-scaling.md) - store comparison, replication topologies, sharding mechanics, migration patterns
