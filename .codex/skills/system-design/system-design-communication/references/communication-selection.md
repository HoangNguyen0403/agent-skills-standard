# Communication Selection Detail

## Per-Paradigm Failure Modes

| Paradigm | Fails when | Design against it |
| --- | --- | --- |
| REST | Aggregate views need 5+ calls; mobile on poor networks | Add a purpose-built aggregate endpoint or a BFF; do not force clients to orchestrate |
| gRPC | Browser clients, L7 proxies without HTTP/2, opaque debugging | gRPC-Web or a REST edge; ensure the proxy speaks HTTP/2 end to end |
| GraphQL | One expensive query melts the backend; resolvers issue N+1 queries | Query depth/cost limits, persisted queries, dataloader batching, per-field timeouts |
| WebSocket | Deploys drop every connection; sticky sessions block scale-in | Reconnect with backoff and resume token; keep session state off the instance |
| SSE | Client needs to send data too; some corporate proxies buffer | Pair with plain POST for the upstream direction; send periodic heartbeats |
| Webhook | Receiver is down or slow; duplicate deliveries corrupt state | At-least-once with backoff and jitter, DLQ, signed payloads, idempotency key per event |

## Hop-by-Hop Guidance

A single user action commonly crosses three different paradigms, and that is correct:

```
browser --REST/HTTPS--> edge/API gateway --gRPC--> internal services
                                          --event--> async consumers
                                          --SSE--> browser (progress)
```

- **Edge hop**: choose for reach and cacheability. REST over HTTPS is the default; it survives every proxy, CDN, and client.
- **Internal hop**: choose for latency and schema safety. gRPC when the call is hot or streaming; REST when the pair is cold and debuggability matters more than microseconds.
- **Async hop**: choose events when the caller does not need the answer. The contract is the event schema, and it needs the same versioning discipline as an API.
- **Cross-org hop**: webhooks outbound, signed and retried; polling inbound when the partner offers no push.

## Streaming Choice

| Need | Choice |
| --- | --- |
| Server pushes, client only reads | SSE |
| Both directions, low latency, long-lived | WebSocket |
| Both directions, request-shaped, internal | gRPC bidirectional streaming |
| Client tolerates delay of seconds | Polling with `ETag` / `If-None-Match` |

Polling is not a failure. At low update rates it is cheaper and simpler than any connection-based option; move off it when poll frequency times client count exceeds the push cost.

## Webhook Contract Checklist

- Signature: HMAC over the raw body with a shared secret, timestamp included to bound replay.
- Idempotency: a stable event id the receiver can deduplicate on; redelivery must be safe.
- Retry: exponential backoff with jitter, a bounded attempt budget, then a DLQ the sender can inspect.
- Ordering: never promise it. Include a sequence number or version so the receiver can discard stale events.
- Observability: expose delivery status per event; partners will ask "did you send it" on every incident.

## Service Discovery Modes

| Mode | How | Choose when |
| --- | --- | --- |
| DNS + load balancer | Clients resolve one name; the LB owns instances | Default. Instances change slower than TTL |
| Server-side registry | LB or mesh queries a health-checked registry | Autoscaling churn, per-request health awareness |
| Client-side | Client queries the registry and picks | Cache affinity, zone-local routing, consistent hashing |
| Service mesh sidecar | Sidecar owns discovery, retries, mTLS | Many services, uniform policy, team can operate the mesh |

A mesh solves discovery, retry, and mTLS uniformly, and adds an operational surface most small teams should not take on. Decide by team capacity, not by service count alone.

## Migration Notes

- REST to gRPC: run both, route internal callers first, keep REST at the edge. The proto becomes the source of truth; generate the REST shape from it if you can.
- Sync to async: introduce the event alongside the synchronous call, let consumers subscribe, then delete the call once the last caller is off it. Never flip both directions at once.
- Polling to push: keep the polling endpoint alive through the transition; it is the fallback when the connection layer misbehaves.
