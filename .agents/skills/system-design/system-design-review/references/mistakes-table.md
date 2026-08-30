# Mistakes Table

| Symptom observed | Root cause | Corrective action |
| --- | --- | --- |
| Diagram exists, requirements do not | Architecture drawn before intake | Reconstruct requirements and NFR targets, then re-derive components |
| Capacity numbers absent or stale | No estimation phase, or traffic changed since | Recompute peak QPS, storage, bandwidth; re-check every ceiling |
| Two instances, one config plane | Redundancy without independence | Isolate credentials, config, and control plane per replica |
| Failover documented but never run | DR treated as documentation | Schedule a drill, measure RTO, record the gap |
| Cache added, database still saturated | Cache hides an unoptimized query | Fix the query and index first, then cache the result |
| Cache invalidation ad hoc | No TTL or ownership per key | Assign TTL, invalidation trigger, and owner per cache key class |
| Sharded early, cross-shard joins everywhere | Sharding before replicas and caching | Reassess; consider consolidating until a real ceiling is hit |
| Queue grows without bound | No drain-rate budget or backpressure | Set drain rate, DLQ, producer backpressure, alert on queue age |
| Retry storms during incidents | Unbounded retries without budget | Exponential backoff with jitter, per-client retry budget, shed load |
| Everything synchronous on request path | No async offload analysis | Move non-critical work to events; keep the critical path explicit |
| Alerts fire on CPU, users complain first | Alerting on causes, not symptoms | Alert on latency SLO breach and error-budget burn |
| No trace across queue boundary | Context not propagated to consumers | Carry correlation and trace id in message headers |
| One tenant degrades everyone | No isolation or quota | Per-tenant quota, cells, or bulkheads |
| Migration and code shipped together | Irreversible release | Expand-migrate-contract with dual reads and a backfill |
| Rollback requires a redeploy | No flag or traffic switch | Feature flag or blue-green with an instant switch |
| Hot partition on the newest range | Time-ordered partition key | Add a hash or bucket component to the key; salt the hot entity |
| Derived index treated as source of truth | Rebuild path never tested | Prove the index can be rebuilt from the owning store |
| Team cannot answer "who owns this data" | No ownership assignment | Assign one writer per entity; convert other writers to API or event consumers |
