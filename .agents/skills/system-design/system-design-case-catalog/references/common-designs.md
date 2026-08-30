# Common Designs

Each sketch: defining constraint, minimal component set, and the trade-off that decides the design.

## URL Shortener

- Constraint: ~100:1 read:write, keys must be short, unique, and non-guessable when required.
- Components: id generator, base62 encoder, key-value store, read cache, redirect service, analytics stream.
- Trade-offs: 301 (permanent, cacheable, loses per-click analytics) versus 302 (analytics preserved, more origin traffic). Random keys resist enumeration; sequential keys compress better and guarantee uniqueness cheaply.
- Sizing note: storage is tiny, read QPS is everything. Cache hit ratio is the design.

## Rate Limiter

- Constraint: the decision must be made in under a millisecond, shared across instances, and correct under concurrency.
- Components: shared counter store, algorithm (token bucket or sliding window counter), edge enforcement, client contract.
- Trade-offs: local counters are fast but let N instances multiply the limit; a shared store is correct but adds a hop and a dependency. Decide fail-open (availability) versus fail-closed (protection) before the store fails.
- Always return `429` with `Retry-After`, and expose remaining quota headers.

## News Feed

- Constraint: fan-out cost on write versus latency on read, distorted by celebrity accounts.
- Components: post service, fan-out workers, per-user feed cache, follow graph, ranking service, media CDN.
- Trade-offs: push (fan-out on write) gives fast reads but explodes for high-follower accounts; pull (fan-out on read) is cheap to write but slow to read; hybrid pushes for normal accounts and merges celebrity posts at read time.
- Sizing note: the follower distribution, not the DAU, decides the strategy.

## Chat System

- Constraint: many long-lived connections plus ordering and delivery guarantees per conversation.
- Components: connection gateway (WebSocket), presence service, message store partitioned by conversation, offline queue, push notification bridge.
- Trade-offs: per-conversation ordering is achievable and sufficient; global ordering is not worth its cost. Presence is expensive at scale - sample or batch it rather than broadcasting every change.
- Delivery: store then acknowledge; use a client-generated message id for idempotent resend.

## Notification System

- Constraint: multi-channel delivery (push, email, SMS) with retries, deduplication, and user preferences.
- Components: ingestion API, per-channel queues and workers, template service, preference and quiet-hours store, provider adapters with failover, delivery-status feedback loop.
- Trade-offs: at-least-once delivery plus an idempotency key beats an exactly-once promise. Per-channel isolation prevents an SMS provider outage from blocking push.
- Add rate limits per user to avoid notification storms during incidents or backfills.

## Autocomplete

- Constraint: sub-100ms prefix lookup over millions of terms, with freshness measured in hours not seconds.
- Components: query log aggregation, offline top-k builder, in-memory trie or prefix index, sharded by prefix, edge cache.
- Trade-offs: precomputed top-k per prefix is fast but stale; live ranking is fresh but too slow at the p99 target. Rebuild offline and swap atomically.
- Filter and personalize after the prefix lookup, never inside it.

## Web Crawler

- Constraint: politeness and deduplication at scale; raw fetch throughput is the easy part.
- Components: URL frontier with per-host queues, robots.txt cache, fetcher pool, content fingerprint store (for near-duplicate detection), parser, scheduler with freshness policy.
- Trade-offs: BFS gives coverage, priority scheduling gives value per fetch. Politeness delay per host caps throughput on large hosts, which is intentional.
- Traps: crawler loops, infinite calendar pages, redirect chains, and duplicate content under different URLs.

## Unique ID Generator

- Constraint: unique, roughly time-ordered, generated without a central lock.
- Components: Snowflake-style layout (timestamp bits, node id bits, sequence bits) or a segment allocator handing out ranges from a central store.
- Trade-offs: UUIDv4 is trivially distributed but not ordered and indexes poorly; auto-increment is ordered but centralized; Snowflake balances both at the cost of clock-skew handling and node-id assignment.
- Handle clock rollback explicitly: refuse to issue, or borrow from the sequence space; never silently reuse.

## Search-Like Read Path (generic shape)

- Constraint: query latency over a derived view that must be rebuildable from the owning store.
- Components: owning store, CDC or event stream, indexer, index cluster, query service, result cache.
- Trade-offs: index freshness versus indexing cost; always keep the rebuild path tested, because the index will need to be rebuilt after a mapping change or a bug.
