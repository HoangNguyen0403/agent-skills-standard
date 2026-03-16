# Redis Review Checklist

## Setup & Configuration

- [ ] **Connection Resilience**: Is a connection pool used with non-zero min/max settings?
- [ ] **Error Handling**: Are `ioredis` (or similar) error listeners attached to avoid unhandled rejections?
- [ ] **Security (ACL)**: Are specific users used instead of a global `requirepass`?
- [ ] **Security (TLS)**: Is TLS enabled for transit between app and Redis cluster?
- [ ] **Dangerous Commands**: Are `FLUSHALL`, `CONFIG`, and `KEYS` disabled or renamed?

## Performance & Commands

- [ ] **O(N) Avoidance**: strictly no `KEYS`? Are list/set scans using `SCAN`/`SSCAN`?
- [ ] **Background Deletion**: Are large keys being deleted with `UNLINK`?
- [ ] **Range Limits**: Do `ZRANGE`, `LRANGE`, and `HGETALL` have explicit limits or small expected sizes?
- [ ] **Lua/Atomicity**: Are multi-step updates using `EVALSHA` for atomicity?
- [ ] **Pipelining**: If performing bulk operations, is a pipeline used?

## Memory & Data Design

- [ ] **TTL**: strictly enforced on all ephemeral keys?
- [ ] **Jitter**: Is random jitter applied to TTLs for high-velocity cache keys?
- [ ] **Data Types**: Are Hashes used for object storage instead of full JSON strings?
- [ ] **Eviction Policy**: Is the `maxmemory-policy` aligned with the workload (e.g., `allkeys-lru`)?

## Monitoring & Ops

- [ ] **Instrumentation**: Are metrics like `Cache Hit Ratio` and `RSS Memory` being logged or exported?
- [ ] **Bigkeys Review**: Has the keyspace been scanned for unexpectedly large values?
- [ ] **Latency**: Have the most frequent scripts been benchmarked or checked via `SLOWLOG`?
