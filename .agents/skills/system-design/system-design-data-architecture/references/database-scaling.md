# Database Scaling

## Store Classes by Access Pattern

| Class | Serves well | Fails at | Typical use |
| --- | --- | --- | --- |
| Relational | Joins, transactions, ad-hoc queries, constraints | Very high write fan-out, schema-variant documents | Orders, accounts, inventory |
| Key-value | Single-key reads/writes at very high QPS | Any query that is not by key | Sessions, counters, hot lookups |
| Wide-column | Massive ordered writes, time series by partition | Joins, ad-hoc filters | Event history, feeds, telemetry |
| Document | Aggregates read as a unit, variable fields | Cross-document transactions at scale | Catalogs, profiles, CMS |
| Graph | Multi-hop relationship traversal | Bulk analytics, high write throughput | Social graph, permissions, fraud rings |
| Search index | Full text, facets, relevance ranking | Source of truth, strong consistency | Product search, log search |
| Object store | Large immutable blobs, cheap durable bytes | Queries, transactions | Images, video, exports, backups |

Rule: the search index and the cache are derived views. The system must be able to rebuild both from
the owning store. If it cannot, they became a source of truth by accident.

## Replication Topologies

| Topology | Consistency | Failure behavior | Cost |
| --- | --- | --- | --- |
| Single primary, async replicas | Eventual on replicas | Failover loses the lag window | Low |
| Single primary, sync replica | Strong on the sync pair | Write latency includes the replica | Medium |
| Multi-primary | Conflict resolution required | Partition tolerant, conflicts real | High |
| Quorum (N, W, R) | Tunable; strong when W + R > N | Survives node loss | Medium-high |

Replica lag consequences: read-after-write breaks, pagination skips or repeats rows, and derived
counters drift. Fix by routing critical reads to the primary, pinning a session, or including a
write token the read path can wait for.

## Sharding

**Strategies**

- **Hash**: even distribution, no range scans, resharding moves most keys unless virtual buckets are used.
- **Range**: preserves ordered scans, hot partition follows the newest range for time-ordered keys.
- **Directory/lookup**: a mapping service assigns entities to shards; flexible and rebalanceable, but the directory becomes a dependency and a SPOF if not replicated.
- **Geo**: shard by region for latency and residency; cross-region entities need a home-region rule.

**Costs to accept before choosing to shard**

- Cross-shard joins and aggregates move to the application or to an analytics copy.
- Unique constraints and auto-increment ids stop working globally; use a distributed id scheme.
- Transactions cannot span shards; use a saga or keep co-located entities in one shard.
- Rebalancing needs a plan and a rehearsal, not a runbook written during an incident.

**Virtual buckets**: map keys to a fixed large number of buckets (for example 4096), then map buckets
to physical shards. Growth moves buckets, never keys, and the mapping is small enough to cache.

## Hot Partition and Celebrity Keys

- Detect: per-partition QPS and latency percentiles, not cluster averages. A healthy cluster average
  hides one saturated partition.
- Salt: append a bounded suffix to spread writes across N sub-keys, then fan-in on read.
- Replicate: keep the popular record on several nodes or in a client-side cache with a short TTL.
- Isolate: give the celebrity entity its own dedicated capacity when the workload is predictable.

## Denormalization

- Denormalize to serve a specific read pattern that joins cannot serve at the required latency.
- Each denormalized copy needs a named owner, a refresh trigger (event, CDC, or scheduled job), and a
  staleness bound documented next to it.
- Prefer deriving copies from an event log so the copy can be rebuilt after a bug.

## Migration Patterns

- **Expand-contract**: add the new column or table, dual-read with fallback, backfill, switch reads,
  then stop writing the old shape and drop it. Never a big-bang rename.
- **Change data capture**: stream the existing store's log into the new store, verify with a
  reconciliation job, then cut over reads.
- **Backfill safety**: batch with limits, throttle by replica lag, make every batch resumable, and
  record progress outside the job.
