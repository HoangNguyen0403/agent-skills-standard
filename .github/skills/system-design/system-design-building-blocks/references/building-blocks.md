# Building Blocks Detail

## Load Balancing

- **L4 (transport)**: routes by IP/port, cheapest, no payload inspection. Use for raw TCP, gRPC streams, or when TLS terminates downstream.
- **L7 (application)**: routes by path, header, or cookie. Required for canary splits, per-route timeouts, and request-level retries.
- Algorithms: round robin (uniform work), least connections (variable work), consistent hashing (session or cache affinity).
- Health checks: readiness must fail when a required dependency is unusable, otherwise the balancer keeps feeding a broken instance. Liveness must not depend on downstream services, or one outage restarts the fleet.
- Draining: remove from rotation, wait for in-flight requests, then stop. Missing drain turns every deploy into a burst of 502s.

## Caching

| Strategy | Read path | Write path | Use when |
| --- | --- | --- | --- |
| Cache-aside | App checks cache, on miss loads store and populates | App writes store, invalidates key | Default for read-heavy, tolerant reads |
| Read-through | Cache loads from store on miss | Same as cache-aside | Uniform access via a cache library/proxy |
| Write-through | Read from cache | Write cache and store synchronously | Read-after-write must be exact |
| Write-behind | Read from cache | Write cache, flush to store async | Write-heavy, loss window acceptable |
| Refresh-ahead | Cache refreshes hot keys before TTL | Unchanged | Predictable hot keys, latency-critical |

Invalidation options, in order of preference: TTL expiry (simplest, bounded staleness), explicit
delete on write (exact, needs full write coverage), versioned keys (no delete needed, costs memory),
event-driven invalidation (works across services, adds a dependency).

Failure modes to design against:
- **Stampede**: many misses on one hot key at once. Fix with single-flight, jittered TTL, or refresh-ahead.
- **Penetration**: repeated misses for keys that do not exist. Fix with negative caching or a bloom filter.
- **Avalanche**: many keys expiring together. Fix with TTL jitter.
- **Hot key**: one key exceeds one node's capacity. Fix with local replication of that key or client-side caching.

## Queues and Streams

- **Task queue** (SQS, RabbitMQ): work distribution, per-message ack, easy retry and DLQ. Best for jobs.
- **Log/stream** (Kafka, Kinesis): ordered partitions, replayable offsets, multiple independent consumers. Best for events and fan-out.
- Delivery: at-most-once loses messages, at-least-once duplicates them, exactly-once is per-system and costly. Default to at-least-once plus an idempotency key on the consumer.
- Ordering holds within a partition only. Partition by the entity that requires order (user id, order id), and accept that one hot entity limits throughput.
- Always define: max depth, drain rate, retry policy with backoff and jitter, DLQ, and the alert on queue age (not just depth).

## CDN and Edge

- Pull CDN fetches on first miss (simple, origin sees cold traffic). Push CDN pre-publishes (good for large predictable assets, needs a publish pipeline).
- Cache keys must exclude volatile query parameters, or hit ratio collapses.
- Signed URLs for private media; never rely on obscurity.
- Purge lag is real: version asset paths instead of purging when correctness matters.

## API Gateway

- Owns: TLS termination, authn, quota, routing, request/response shaping, and observability tagging.
- Does not own: business rules. Logic in the gateway becomes an untestable second application.
- Gateway is a chokepoint: it must be horizontally scaled and must degrade to pass-through rather than reject on its own dependency failure.

## Rate Limiting

| Algorithm | Behavior | Trade-off |
| --- | --- | --- |
| Fixed window | Count per interval | Burst at window edges |
| Sliding window log | Exact per-request history | Memory heavy |
| Sliding window counter | Approximates the log | Small error, low cost |
| Token bucket | Allows controlled bursts | Needs refill tuning |
| Leaky bucket | Smooths output rate | Adds queuing latency |

Distributed limiting needs a shared counter (Redis) and must decide fail-open (availability first)
or fail-closed (protection first) when the counter is unreachable. Return `429` with `Retry-After`.

## Consistent Hashing

- Maps keys and nodes onto a ring so adding or removing a node moves only `K/N` keys instead of remapping everything.
- Use virtual nodes (100-200 per physical node) to smooth distribution; without them, load skews badly at small cluster sizes.
- Consistent hashing balances key placement, not key popularity. A single hot key still overloads its owner; replicate that key or cache it client-side.

## Session State

| Approach | How | Choose when | Cost |
| --- | --- | --- | --- |
| Stateless token | Signed JWT or opaque id verified at the edge | Default. Any instance serves any request | Revocation needs a deny list or short expiry plus refresh |
| Shared session store | Redis or equivalent keyed by session id | Immediate revocation, server-side data beyond a token | One more dependency on the request path; it becomes a SPOF if unreplicated |
| Sticky sessions | Load balancer pins a client to an instance | Legacy apps that cannot be changed | Breaks on deploy and scale-in; uneven load; blocks autoscaling |
| In-memory session | State lives in the app process | Never in a multi-instance system | Any restart logs everyone out |

Token sizing: keep claims small — the token rides on every request. Put identity and coarse
authorization in the token, and everything else behind an id.

Revocation: a stateless token cannot be un-issued. Either accept the window until expiry (keep it
short and pair with refresh tokens), or check a deny list, which reintroduces the shared store you
were avoiding. Decide this explicitly; it is the trade-off that defines the approach.
