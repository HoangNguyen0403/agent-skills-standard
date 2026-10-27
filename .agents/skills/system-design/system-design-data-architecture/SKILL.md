---
name: system-design-data-architecture
description: "Design system data flows and data-layer ownership, consistency, and store choices from access patterns. Use for critical-flow design, DFD semantic review, data lineage, authority, replication, retention, or a data-tier bottleneck. Avoid unrelated framework stream/dataframe implementation questions."
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
      - system data flow
      - critical data flow
      - DFD review
      - data lineage
      - data authority
      - tenant isolation
      - multitenant retrieval
      - retrieval authorization
      - deletion propagation
---

# Data Architecture

## **Priority: P1 (HIGH)**

Access patterns and per-operation invariants choose the store. Ownership precedes schema. Shard last, not first. Trace critical flows before committing to stores or transport; diagrams are conditional.

## Store Selection

1. List every read and write access pattern with its QPS, latency target, and consistency need.
2. Default to a relational store. It wins until a specific pattern proves it cannot serve.
3. Move a pattern to a specialized store only when the relational store fails that named pattern:
   key-value for hot lookups, wide-column for massive ordered writes, document for schema-variant
   aggregates, graph for multi-hop traversal, search index for text and facets, object store for blobs.
4. Every additional store adds sync lag, dual-write risk, and one more operational surface. Justify it.
5. Blobs never live in the primary database; store bytes in object storage and keep the reference.

## Ownership and Consistency

- Name one authoritative writer per entity or state boundary. Distinguish derived copies, replicas, caches, queues, projections, files, and client state; each needs an owner and refresh/rebuild or lifecycle rule.
- Authenticated tenant/user scope is part of authority: carry it from source reads through lexical/vector retrieval, reranking, caches, async jobs and outputs, and deny when it is missing. Ranking relevance never grants access, and a derived copy outlives neither revocation nor its own invalidation. Load [tenant-safe retrieval](references/tenant-safe-retrieval.md) for scoped search, embeddings, caches, or async derived work.
- Choose consistency per operation and invariant. Strong consistency is not implied by a domain label; state the consequence of stale or conflicting reads/writes.
- Read replicas serve reads only when the consistency contract permits; expose lag and use primary routing, session pinning, or a write token where read-after-write matters.
- Choose a bounded synchronous transaction, asynchronous event, saga, or another mechanism from transaction boundaries and failure semantics. A saga is not a universal substitute for atomicity; define recovery and compensations when it is used.

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
- **No relevance as authorization**: ranking, similarity, or a namespace does not decide who may read a row.

## Verify

- [ ] Critical paths name source, sink, transformations, authoritative owner, derived copies, invariant, user-visible outcome, adverse timeline, and observable verification; see [flow contract](references/flow-contracts.md).
- [ ] Every selected store has a stated access-pattern reason; identify single-writer ownership where applicable.
- [ ] Consistency and freshness are stated per relevant operation/flow.
- [ ] Partitioning, hot-key mitigation, retention, archival, and deletion are addressed when workload or lifecycle makes them material.
- [ ] Tenant-scoped flows name authenticated scope at every derived stage, the deny path for missing scope, and derived-copy revocation/invalidation; see [tenant-safe retrieval](references/tenant-safe-retrieval.md).

## References

- [Database Scaling](references/database-scaling.md) - store comparison, replication topologies, sharding mechanics, migration patterns
- [Flow Contracts](references/flow-contracts.md) - critical-flow authority, copies, invariant and verification record
- [Tenant-Safe Retrieval](references/tenant-safe-retrieval.md) - authenticated scope through retrieval, rerank, cache, jobs and derived-copy revocation

## Critical Flows and DFD Review

Before choosing stores or transport, trace ingress, transformations, authority, derived state, consumers, trust boundaries, invariant, adverse timeline, and verification for each critical journey. Add delivery, durability, ordering, deduplication, backlog, recovery, capacity, and lifecycle details when material; explain significant omissions. A diagram is optional when prose or a table answers the question.

Load [flow contracts](references/flow-contracts.md) for the canonical record, [DFD review](references/dfd-review.md) for semantic/scope checks, and [worked flows](references/worked-flows.md) for concise payment, CDC/backfill, and client-sync examples. DFD levels are not C4 levels. Use sequence/state/ERD/deployment views for ordering, lifecycle, schema, and placement; do not claim those from dataflow arrows.

Stateless computations and SDK functions may need no store, queue, or database. Select a mechanism from the invariant and constraints, not a domain-name recipe.
