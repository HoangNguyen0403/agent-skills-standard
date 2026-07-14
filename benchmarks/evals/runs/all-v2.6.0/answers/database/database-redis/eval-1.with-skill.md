For a multi-tenant Redis design, make the key name encode tenant, domain, entity, and purpose so ownership and invalidation scope are obvious at a glance.

A good default pattern is:

`<product>:tenant:<tenantId>:<domain>:<entity>:<identifier>[:<variant>]`

Examples:

- `app:tenant:t_42:user-profile:user:123`
- `app:tenant:t_42:catalog:product:987:summary`
- `app:tenant:t_42:rate-limit:api-key:abc123`

Why this shape works:

- It prevents tenant collisions.
- It makes bulk reasoning safer because the tenant boundary is explicit.
- It gives you predictable invalidation scope. For example, deleting or rotating all cached product summaries for one tenant is much easier when those keys share a clear prefix.

Recommended rules:

1. Put the tenant identifier near the front of the key.
   - This makes tenant scope obvious in logs, dashboards, and scan-based maintenance jobs.

2. Namespace by business domain.
   - Use segments like `billing`, `catalog`, `session`, `feature-flag`, or `rate-limit` instead of generic names like `data` or `cache`.

3. Include only stable identifiers.
   - Prefer immutable IDs over mutable names or emails so keys do not drift when attributes change.

4. Add a variant suffix when the same entity has multiple cache shapes.
   - Example: `product:987:summary` vs `product:987:details`.

5. Set a TTL for ephemeral data.
   - Cache entries, sessions, throttling windows, temporary coordination locks, and derived views should expire unless you have a documented reason not to.
   - For high-traffic caches, add small TTL jitter so many keys do not expire at the exact same moment.

6. Do not store critical system truth only in Redis.
   - Redis should support latency and coordination, not be the only durable record for tenant-critical data.

7. Avoid oversized values.
   - If a value grows large, split it into smaller keys or use a Hash for field-level access instead of storing one big serialized blob.

Practical examples by use case:

- Cached object:
  - `app:tenant:t_42:orders:order:5001`
- Session:
  - `app:tenant:t_42:session:s_abc123`
- Rate limit bucket:
  - `app:tenant:t_42:rate-limit:user:123:/reports/export`
- Distributed lock:
  - `app:tenant:t_42:lock:invoice:5001`

Operational guidance:

- Never use `KEYS app:tenant:t_42:*` in application paths. If you need to inspect or clean up by prefix, use `SCAN` in admin or background workflows.
- Make connection timeouts and pooling explicit in the application config.
- Document which service owns invalidation for each major key family.

In short: design Redis keys so they answer three questions immediately — which tenant owns this, what data family it belongs to, and how it should be invalidated.

