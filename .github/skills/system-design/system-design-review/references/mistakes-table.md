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
| Demonstrated deadline, burst, or isolation violation on synchronous work | Bounded synchronous path misses its stated journey deadline or failure/isolation objective under the evidenced workload | First test the smallest bounded synchronous alternative (deadline, concurrency/queue bound, backpressure); offload asynchronously only when the declared constraints still require it |
| Alerts fire on CPU, users complain first | Alerting on causes, not symptoms | Alert on latency SLO breach and error-budget burn |
| No trace across queue boundary | Context not propagated to consumers | Carry correlation and trace id in message headers |
| One tenant degrades everyone | No isolation or quota | Per-tenant quota, cells, or bulkheads |
| Migration and code shipped together | Irreversible release | Expand-migrate-contract with dual reads and a backfill |
| Rollback requires a redeploy | No flag or traffic switch | Feature flag or blue-green with an instant switch |
| Hot partition on the newest range | Time-ordered partition key | Add a hash or bucket component to the key; salt the hot entity |
| Derived index treated as source of truth | Rebuild path never tested | Prove the index can be rebuilt from the owning store |
| Team cannot answer "who owns this data" | No ownership assignment | Assign one writer per entity; convert other writers to API or event consumers |
| One user action fans out to dozens of remote calls | Chatty I/O across a network boundary | Batch or aggregate at the boundary; add a purpose-built endpoint or BFF |
| Endpoints return far more data than callers use | Extraneous fetching | Project only needed fields; paginate; measure payload against the client's real need |
| Database writes and event publishes drift apart | Dual write with no outbox | Write the outbox row in the same transaction; relay via poller or CDC |
| Retry reported successful, operation still unresolved | Transport attempt counted instead of the user journey | Count the stable business operation once; keep pending/unknown outside success until its declared completion condition is met |
| SLO denominator changes during incident | Exclusions hide pending, failed, or degraded user outcomes | Declare eligible population and exclusions before scoring; include the retry/background-completion rule and owner action |
| Derived projection is stale or replay resurrects deleted data | Authority, freshness, or deletion propagation was not traced | Identify source owner, freshness/deletion invariant, adverse timeline, and verification across every material copy |
| Queue depth is healthy but oldest work misses its promise | Backlog measured without age, drain capacity, or completion deadline | Bound backlog age and drain/recovery; surface missed journey SLOs and name the response owner |
| High aggregate score hides a tenant leak or lost/duplicated effect | Correctness/security failure treated as one compensable score contribution | Apply the non-compensable flow gate; block readiness, trace the violated invariant, and assign the smallest fix |
| Proposal called operationally ready based on a planned drill | Target or plan reported as observed evidence | Qualify readiness by scope; require the corresponding implementation or measured operations evidence |
| Logical DFD rules used to reject a physical direct upload | Modeling convention confused with runtime topology | Declare logical/physical scope; review signed-upload boundary, authorization, object ownership, and lifecycle controls |
