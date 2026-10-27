---
name: system-design-building-blocks
description: "Select infrastructure components by the constraint each removes: load balancers, caches and invalidation, queues and pub/sub, CDN, API gateway, rate limiting, consistent hashing. Use when choosing cache, queue, replica, or edge layers; defer engine tuning to the database category."
metadata:
  triggers:
    keywords:
      - load balancer
      - cache strategy
      - message queue
      - cdn
      - api gateway
      - consistent hashing
      - pub/sub
      - rate limiter
      - backpressure
---

# System Building Blocks

## **Priority: P1 (HIGH)**

Add a component only to remove a named constraint. Every component adds failure modes and cost.

## Selection Table

| Constraint observed | Component | Cost accepted |
| --- | --- | --- |
| One instance saturates CPU or connections | Horizontal scaling behind a load balancer | Statelessness required; session moves to a store |
| Read QPS exceeds store ceiling; data tolerates staleness | Read-through cache | Stale reads up to TTL; invalidation complexity |
| Write spikes exceed sustainable store throughput | Queue plus async worker | Eventual completion; needs idempotent consumers |
| Slow non-critical work blocks the request path | Background job or event | Extra delivery guarantees to reason about |
| Static or media bytes dominate egress | CDN | Cache purge lag; origin still needed for misses |
| Cross-cutting authn, quota, routing repeated per service | API gateway | Central chokepoint; fails closed and needs its own failure capacity |
| One tenant or key can exhaust capacity | Rate limiter or admission control | Rejections need clear client contracts |
| Cache or shard nodes change count during scaling | Consistent hashing | Rebalancing logic; hot-key skew persists |

## Caching Rules

- Default to **cache-aside** for read-heavy paths; use write-through only when read-after-write must be exact.
- Set TTL from tolerable staleness, not from convenience. Every cached key needs a stated TTL and an invalidation trigger.
- Guard the miss path: single-flight or request coalescing prevents a stampede when a hot key expires.
- Never cache what you cannot invalidate. Never cache per-user data under a shared key.

## Queue Rules

- Choose delivery semantics explicitly: at-least-once plus idempotent consumers is the safe default.
- Partition by the entity that must stay ordered; ordering is per partition, never global.
- Size the queue for the burst, and define the drain rate. An unbounded queue converts a throughput problem into a latency and memory problem.
- Apply backpressure at the producer when depth exceeds the drain budget; shedding beats silent growth.

## Session State

- Default to a stateless token (signed JWT or opaque id verified at the edge); the app tier keeps nothing per user.
- Move to a shared session store (Redis) when sessions must be revocable immediately or carry more than a token can hold.
- Sticky sessions are a last resort: they survive one deploy badly and block scale-in. Never store session state in app memory.

## Edge and Traffic Rules

- L4 balances connections, L7 balances requests. HTTP/2 and HTTP/3 multiplex many streams over one connection, so connection counts understate load; choose the layer by the unit you must route, enforce, or shed.
- Least connections assumes equal work per unit in flight. For mixed or long-lived requests, weight by measured request cost or track active requests instead.
- Readiness means "serve this request now" and may depend on required dependencies. Liveness means "this process is broken" and must not. An optional dependency degrades its response and must never eject the fleet; a mandatory one — auth, quota — fails closed for the request instead. Shared blast radius never makes a mandatory check optional.
- Capacity is what survives failure: admitted demand must fit surviving instances × safe per-instance load after the largest in-scope instance or zone loss. Otherwise shed or degrade at admission rather than claim HA.
- One retrying layer per chain, with the remaining deadline propagated; caller timeout, queue wait, and retries must fit inside that deadline.
- Gateway authentication and quota enforcement fail closed when their dependency is unreachable; only optional enrichment may pass through degraded.
- Rate limit at the edge by identity and by cost class; return a retry hint the client can honor.

## Anti-Patterns

- **No component without a constraint**: a box that solves no stated problem gets removed.
- **No cache as a correctness fix**: caching hides a slow query; fix the query, then cache.
- **No queue without a consumer budget**: define drain rate and DLQ before shipping.
- **No shared mutable session in app memory**: it blocks horizontal scaling.
- **No HA from instance count**: redundancy that cannot carry the load after a failure is cost, not a guarantee.

## References

- [Building Blocks Detail](references/building-blocks.md) - per-component decisions, health detection and drain, failure capacity, gateway authority, limiter atomicity, stream bounds
