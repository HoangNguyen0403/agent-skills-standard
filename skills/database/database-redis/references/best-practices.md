# Redis Detailed Best Practices

## 1. Caching & Memory Strategies

- **Cache-Aside (Lazy Loading)**:
  - App checks cache -> Miss -> Load from DB -> Set Cache -> Return.
- **TTL Jitter**:
  - `TTL = Base_TTL + Random(0, 10% of Base_TTL)`. Prevents "Cache Stampede".
- **Eviction Policies**:
  - `allkeys-lru`: Best for general caching where any key can be evicted.
  - `volatile-lru`: Best for mixed workloads (some keys persistent, some expiring).
- **Ziplist Optimization**: Redis uses `ziplist` for small hashes/lists/sets. Keep these structures small to leverage O(1) memory efficiency (check `hash-max-ziplist-entries` config).

## 2. Command Efficiency

- **O(N) Avoidance**:
  - NEVER use `KEYS` in production. Use `SCAN` (cursor-based iteration).
  - Use `UNLINK` instead of `DEL` for large keys to delete in a background thread.
  - Use `MGET`/`MSET` for batching, but be careful with extremely large batches as they still account for atomic operation time.
- **Lua Scripting**:
  - Use `EVALSHA` to run pre-loaded scripts. This ensures atomicity for complex operations (e.g., "Check if exists, increment, update TTL").
- **Limit Ranges**:
  - Unbounded `ZRANGE` or `LRANGE` on massive collections can choke the network. Always use `LIMIT` or small ranges.

## 3. Resilience & Cloud Patterns

- **Connection Pooling**: Mandatory. Use a pool (e.g., `ioredis` built-in or `generic-pool`) to avoid the high cost of TCP handshakes.
- **Regional Affinity**: Ensure the application and Redis cluster are in the same cloud region to minimize latency.
- **Hostname vs IP**: Always connect via hostname. Cloud providers may change IPs during failover or scaling.
- **Retry Logic**: Implement exponential backoff for connection retries.

## 4. Monitoring & Health

- **Key Metrics to Watch**:
  - **Cache Hit Ratio**: `keyspace_hits / (keyspace_hits + keyspace_misses)`. Low ratio indicates poor caching strategy.
  - **Memory RSS**: Total memory used by the process. If `RSS >> Dataset`, fragmentation is high.
  - **CPU Usage**: Watch for the "Main Thread" saturation. High CPU usually indicates an O(N) command spike.
  - **Connected Clients**: Monitor for sudden spikes (connection leaks).
- **In-Built Tools**:
  - `INFO MEMORY`: Detailed breakdown of memory usage.
  - `bigkeys`: Use `redis-cli --bigkeys` to find memory hogs.
  - `slowlog`: Regularly check `SLOWLOG GET` to identify poorly performing queries.

## 5. Security Architecture

- **ACLs (Redis 6+)**:
  - Move away from `requirepass`. Use `ACL SETUSER` to create least-privilege users (e.g., `read-only-user`).
- **Dangerous Commands**:
  - Rename or disable commands in `redis.conf`:
    - `rename-command FLUSHALL ""`
    - `rename-command CONFIG ""`
- **TLS**: Use TLS 1.2+ for all production traffic.
