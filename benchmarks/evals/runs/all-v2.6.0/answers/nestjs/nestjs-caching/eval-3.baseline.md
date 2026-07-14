Prevent a stampede by coordinating concurrent misses for the same key. In a single process, keep an in-flight promise map; across replicas, use a short-lived Redis lock (`SET lockKey token NX PX ...`) and have only the lock holder load and populate the value. Other requests should wait briefly, retry the cache, or serve stale data rather than all hitting the database.

Add TTL jitter so related keys do not expire simultaneously, use stale-while-revalidate where acceptable, and set bounded timeouts. The lock must have an expiry, use a unique token, and release only if the token still matches (Lua compare-and-delete). Handle lock-owner failure and avoid holding the lock across an unbounded downstream call. Measure hit rate, concurrent misses, load latency, and lock contention.

