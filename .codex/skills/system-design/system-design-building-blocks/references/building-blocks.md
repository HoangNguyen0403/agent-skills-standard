# Building Blocks Detail

## Load Balancing

- **L4 (transport)**: routes on IP/port, keeps payloads opaque. Use for raw TCP, TLS passthrough, or per-connection stickiness. It cannot see paths, so it cannot canary a route or enforce per-request auth and quota.
- **L7 (application)**: routes by path, header, or cookie; required for canary splits, per-route timeouts, request-level retries, and gateway enforcement.
- **A connection is not a request.** HTTP/2 and HTTP/3 multiplex concurrent streams over one connection ([RFC 9113 §5.1](https://www.rfc-editor.org/rfc/rfc9113#section-5.1)); gRPC streams behave the same. An L4 balancer spreads *connections*, so one client can hold most of its load on one instance. Balance the unit you actually need to distribute.
- Algorithms: round robin (uniform work), least connections (roughly one request per connection, similar cost), least request or weighted cost (mixed or unknown cost), consistent hashing (affinity). Least connections counts in-flight units, not work done: one connection running a 2 s query equals one running 500 fast queries. When cost varies or connections are long-lived, use active-request counts or measured cost weights.

## Health, Detection, and Drain

- Readiness answers "can this instance serve now?" and may consult required dependencies; liveness answers "is the process itself broken?" and must not; startup covers slow boot. Definitions and probe design: [Health Checks](../../system-design-resilience-ops/references/reliability-operations.md#health-checks).
- Classify each readiness dependency **per request class** as required or optional. Failing readiness on an optional dependency ejects healthy capacity during a partial outage; optional dependencies degrade that class of response instead. Shared blast radius is not the test: a shared cache is usually optional, while a shared auth or quota service is mandatory for protected routes.
- Readiness lives in **discovery**; passive outlier detection lives in the **balancer**. Readiness removes an instance from new traffic, while passive detection watches live traffic (consecutive errors, timeouts, latency outliers) and removes a host from the healthy set for a bounded time; active probes restore it ([Envoy outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier)). Bound consecutive failures, base and maximum ejection time, and the ejected fraction so no single dependency ejects the cluster, and confirm recovery from traffic rather than from a probe answer.
- Panic behavior decides **where** traffic goes when too few hosts are healthy — route to all or fail fast ([Envoy panic threshold](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold), default 50%). Neither panic mode nor an ejection cap authorizes skipping authentication or quota: when the mandatory enforcement path is unavailable, reject protected requests locally instead of routing them to unverified endpoints.
- **Drain**: fail readiness and remove from discovery, keep serving in-flight work, then terminate at a deadline; the client contract states what it retries after the deadline. Kubernetes defaults termination grace to 30 s, so unbounded waiting ends in SIGKILL mid-response. Sequence, stream close, and resume handling: [Draining and Termination](../../system-design-resilience-ops/references/reliability-operations.md#draining-and-termination).

## Failure Capacity

Redundancy is a topology fact; availability is arithmetic. For each tier record:

- Per-instance safe load — measured load where p95 sits inside the deadline with headroom, not the saturation point; state the unit, such as requests per second or concurrent requests.
- Surviving instances after the largest in-scope failure: one instance (N+1) or one zone.
- Admission rule: `admitted demand ≤ surviving instances × per-instance safe load`, with both sides in the same unit — rate against measured throughput, or concurrency against measured concurrency at the deadline.

When the inequality fails, name what degrades and in which order: reject by cost class with a retry hint, queue with a deadline and shed on overflow, serve stale or partial results for declared classes, or drop optional work. State the class that degrades first so the behavior is a decision, not an accident.

The same arithmetic constrains downstream, in matching units. `autoscaled callers × per-instance pool size` is a **connection** (or explicit request-concurrency) count, so compare it to the dependency's connection or concurrency ceiling. Achievable rate follows from concurrency and service time — `rate ≈ concurrency / service time` — so 100 pooled connections at 10 ms per call can drive roughly 10,000 requests/s; bound admitted rate against the QPS ceiling separately, with fan-out and retries included ([Reliability Operations](../../system-design-resilience-ops/references/reliability-operations.md) owns pool ceilings). Scaling callers without both caps converts a compute shortage into a connection storm.

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
- Autoscale consumers on queue age against the drain deadline, not depth alone, and cap concurrency by the downstream ceiling. Consumers scaled past that ceiling only add contention and retries.

## Streaming Connections and Buffers

Applies to SSE, WebSocket, gRPC streams, and long-poll.

- A stream is a queue with a socket: bound it in bytes, items, and time. Unbounded producer memory turns one slow consumer into fleet-wide memory pressure and restarts.
- Apply backpressure before the bound is reached — HTTP/2 flow-control window, blocking write, or rejection — and prefer pause over drop unless the contract tolerates gaps.
- On disconnect: cancel upstream reads, release subscriptions, and stop producing. A producer that keeps working for a disconnected client is the most common stream leak.
- Resume needs a cursor and a retention window. Past the window, answer "resume from X" or "restart", never a silent gap.
- Cap concurrent streams per instance and give each a maximum lifetime; a drain that waits for infinite streams never finishes.

## CDN and Edge

- Pull CDN fetches on first miss (simple, origin sees cold traffic). Push CDN pre-publishes (good for large predictable assets, needs a publish pipeline).
- Cache keys must exclude volatile query parameters, or hit ratio collapses.
- Signed URLs for private media; never rely on obscurity.
- Purge lag is real: version asset paths instead of purging when correctness matters.

## API Gateway

- Owns: TLS termination, authn, quota, routing, request/response shaping, and observability tagging.
- Does not own: business rules. Logic in the gateway becomes an untestable second application.
- Split gateway dependencies into **enforcement** and **enrichment**. Identity verification, authorization, and quota are correctness functions: when their service is unreachable, reject the request instead of forwarding unverified traffic, and make the choice explicit — external authorization filters default to failing closed ([Envoy ext_authz](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter)). Enrichment — geo, device, personalization — may fail through with a named default because the request stays safe without it. Blanket pass-through on dependency failure silently disables auth and quota.
- Name the TLS trust boundary: where encryption terminates, whether traffic is re-encrypted or mTLS inside the trust zone, and which identity assertion downstream trusts. A gateway-asserted identity header is trustworthy only if the listener strips or overwrites client-supplied copies; otherwise it is a spoofing path.
- The gateway is a chokepoint with its own failure capacity; if it cannot carry surviving demand after a failure, every route behind it degrades together.
- DNS-based failover in front of the gateway inherits resolver caching and TTL delay; keep that qualification in the communication category rather than restating a new DNS contract here.

## Rate Limiting

| Algorithm | Behavior | Trade-off |
| --- | --- | --- |
| Fixed window | Count per interval | Burst at window edges |
| Sliding window log | Exact per-request history | Memory heavy |
| Sliding window counter | Approximates the log | Small error, low cost |
| Token bucket | Allows controlled bursts | Needs refill tuning |
| Leaky bucket | Smooths output rate | Adds queuing latency |

Limits need one **authority** per allowance, but the edge can hold that allowance in two shapes with different correctness:

- **Disjoint allocation (conserved):** the authority gives each replica a distinct share of the global allowance, for example eight replicas holding 12.5 of a 100 requests/s limit. The shares sum to the limit, so no synchronous call per request is needed. Correctness requires disjoint shares, an exact total, exclusive re-allocation — a stale share plus its replacement is overshoot — and a bounded lease.
- **Copied budget (not conserved):** every replica holds the full allowance or refills its own copy. Aggregate admission can reach `replicas × allowance`, and during a partition of duration `T` with independent refill the excess grows roughly with `T`. Reconciling afterwards is not a bound.

Declare the contract before claiming a limit: allowance unit (requests, tokens, cost) per window, burst allowance, refill owner, allocation or lease lifetime, replica bound, and behavior after authority loss.

- State the bound type explicitly: instantaneous aggregate rate, admissions per window, or cumulative overshoot during a partition. These are different claims; "bounded overshoot" without one of them is not a bound. With disjoint shares and no refill past the lease, total excess is at most the stale shares still in force.
- Atomicity applies to the ledger: check-and-decrement in one operation with expiry for a shared counter, exclusive lease renewal for disjoint shares. An unsynchronized increment admits bursts; a lost expiry creates a permanent block.
- Partition behavior: choose and record one — disjoint shares with no refill past the lease (conserved, bounded by lease), fail-closed against the authority (exact, rejects during partition), or a copied budget with a stated overshoot horizon (fast, not a quota guarantee). Mixing shapes per route without saying which is which is how quota guarantees disappear.
- Mandatory protection wins over availability here too: a quota that is a correctness boundary fails closed on protected routes, while an advisory rate limit may fail open. Shared blast radius does not make a mandatory check optional.
- Granularity and fairness: key by the identity being protected (tenant, key, IP, cost class) and separate expensive from cheap calls; one global bucket lets a heavy caller starve everyone else.
- Return `429` with `Retry-After` and remaining-quota headers so clients back off instead of retrying immediately.
- Exactness costs availability and latency (a synchronous authority call on the request path); state which you traded and what the limiter does when its own store is slow.

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
