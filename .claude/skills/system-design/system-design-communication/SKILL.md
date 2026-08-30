---
name: system-design-communication
description: "Select how services talk: REST, gRPC, GraphQL, WebSocket, SSE, or webhook per hop, sync versus async per flow, service discovery mode, and DNS/edge routing. Use when choosing a protocol or API paradigm; defer REST contract detail (status codes, pagination, OpenAPI) to common-api-design."
metadata:
  triggers:
    keywords:
      - grpc
      - graphql vs rest
      - websocket
      - server-sent events
      - webhook
      - service discovery
      - protocol choice
      - api paradigm
      - dns routing
---

# Communication Selection

## **Priority: P1 (HIGH)**

Choose the paradigm per hop from the constraint, not from familiarity. One flow may legitimately use three.

## Paradigm Table

| Constraint observed | Paradigm | Cost accepted |
| --- | --- | --- |
| Resource CRUD for broad, unknown clients; HTTP caching wanted | REST | Over/under-fetching; N round trips for aggregates |
| Internal service-to-service, low latency, streaming, schema-first | gRPC | Browser needs a proxy; L7 balancers need HTTP/2 awareness |
| One client aggregates many sources with client-shaped responses | GraphQL | Query-cost limits and N+1 resolvers become your problem |
| Bidirectional real-time (chat, collaboration, gaming) | WebSocket | Stateful connections; LB affinity; reconnect protocol |
| Server push only (feeds, progress, notifications) | SSE | One direction; plain HTTP, auto-reconnect built in |
| Cross-organization async callback | Webhook | Receiver retries, signature verification, idempotency required |

## Sync vs Async per Flow

- The caller needs the answer to proceed -> synchronous call with a timeout and a fallback.
- The caller needs completion, not the answer now -> queue or event; return an id to poll or push the result.
- Never chain more than 2 synchronous internal hops on a user-facing path; each hop multiplies latency and failure.

## Service Discovery

- Start with DNS-based discovery of a load balancer; it is discovery enough for most systems.
- Move to a health-checked registry (server-side discovery) when instances churn faster than DNS TTLs propagate.
- Client-side discovery only when the client must pick the instance (cache affinity, zone-local routing); it couples every client to the registry.

## DNS and Edge Routing

- DNS TTL is a failover lever: low TTL enables fast region switch, at the cost of resolver load.
- Geo-DNS routes users to the nearest region; it is routing, not failover - pair it with health checks.
- Do not use DNS for instance-level balancing; resolvers cache and ignore your weights.

## Versioning

- Additive changes only on live contracts: new fields optional, old fields never repurposed.
- Breaking change = new version side by side, a deprecation window with usage telemetry, then removal.
- Internal gRPC/proto: reserve removed field numbers; never reuse them.

## Anti-Patterns

- **No one-paradigm-everywhere**: edge REST plus internal gRPC plus async events is normal, not inconsistency.
- **No WebSocket for server-push-only**: SSE is cheaper and survives proxies better.
- **No webhook without signature, retry policy, and idempotency key**: all three, or it is not production.
- **No GraphQL as a proxy for missing API design**: schema sprawl without owners is the same mess with resolvers.
- **No sync call to a service that only needs to know**: notifications are events.

## References

- [Communication Selection Detail](references/communication-selection.md) - per-paradigm failure modes, hop-by-hop guidance, migration notes
