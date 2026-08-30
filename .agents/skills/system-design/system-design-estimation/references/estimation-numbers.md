# Estimation Numbers

## Powers of Two

| Power | Approx value | Name |
| --- | --- | --- |
| 2^10 | 1 thousand | KB |
| 2^20 | 1 million | MB |
| 2^30 | 1 billion | GB |
| 2^40 | 1 trillion | TB |
| 2^50 | 1 quadrillion | PB |

Useful anchors: 86,400 seconds per day (round to 100k), 2.6M seconds per month, 31.5M seconds per year.
1M writes/day is ~12 writes/sec. 1B writes/day is ~12k writes/sec.

## Latency Anchors (order of magnitude)

| Operation | Time |
| --- | --- |
| L1 cache reference | 1 ns |
| Main memory reference | 100 ns |
| Compress 1KB | 10 us |
| SSD random read | 100 us |
| Read 1MB sequentially from memory | 250 us |
| Round trip in same datacenter | 500 us |
| Read 1MB from SSD | 1 ms |
| Disk seek (HDD) | 10 ms |
| Round trip CA to Netherlands | 150 ms |

Consequences: memory is ~100x faster than SSD; cross-region is ~300x a same-DC hop. A design that
crosses a region synchronously on the hot path has already spent its latency budget.

## Single-Node Ceilings (conservative planning defaults)

| Resource | Planning ceiling | Break above this with |
| --- | --- | --- |
| Stateless app instance | 1k-5k QPS | Horizontal scaling behind a load balancer |
| Relational primary (mixed read/write) | 5k-10k QPS | Read replicas, then caching, then sharding |
| Redis / in-memory cache node | 100k+ ops/sec | Cluster with consistent hashing |
| Message broker partition | ~10 MB/s or 10k msg/s | More partitions, batching |
| NIC (10 Gbps) | ~1.2 GB/s | CDN offload, compression, more nodes |
| Instance RAM | 64-256 GB working set | Sharded cache, hot/cold tiering |

## Availability Table

| Nines | Downtime per year | Downtime per month |
| --- | --- | --- |
| 99% | 3.65 days | 7.2 hours |
| 99.9% | 8.77 hours | 43.8 minutes |
| 99.99% | 52.6 minutes | 4.4 minutes |
| 99.999% | 5.26 minutes | 26 seconds |

## Worked Example - Read-Heavy Feed

Inputs: 10M DAU, 20 feed reads/user/day, 2 posts/user/day, 1KB per post, 12-month retention, 3x replication.

- Reads: 10M x 20 / 86,400 = ~2.3k QPS average; peak 5x = ~12k QPS.
- Writes: 10M x 2 / 86,400 = ~230 QPS average; peak ~1.2k QPS.
- Storage: 20M posts/day x 1KB x 365 x 3 = ~22 TB/year.
- Bandwidth egress: 12k QPS x 10KB response = 120 MB/s.
- Shaping quantity: 12k read QPS against a 5-10k relational ceiling. First component added is a
  read-through cache, not a shard - sharding a 230 QPS write path is premature.

## Worked Example - Flash Sale Spike

Inputs: 500k registered buyers, sale opens at a fixed second, 50k units, 60-second buying window.

- Peak factor is not 5x. Assume 30-60% of buyers arrive in the first 10 seconds:
  200k arrivals / 10s = ~20k QPS on the reserve endpoint.
- Writes are contended on a small hot key set (per-SKU stock), so the shaping quantity is
  contention on 50k rows, not raw QPS.
- Consequence: admission control plus queueing plus atomic decrement on a single-owner store;
  read path served from cache and static assets from CDN.
