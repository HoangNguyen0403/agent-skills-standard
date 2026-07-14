Prevent a stampede by combining three controls: add random TTL jitter so keys do not expire together, use a distributed lock so only one worker recomputes a value, and let other requests receive stale data or wait briefly while the refresh completes.

For high-traffic reads, use L1 memory plus Redis L2 and a stale-while-revalidate flow. The lock must have an expiry and the recomputation must be idempotent; release it only if the caller owns it. Do not solve grouped invalidation with Redis `KEYS`, and do not use process-local memory as the shared cache in a multi-pod deployment.

