# Production Case Packs

These are lazy-loaded production exercises, not claims about deployed systems. Every number,
team, budget, and incident timeline below is a **synthetic assumption** unless a historical
source is named. Recalculate the shape for the user's workload; never copy the numbers as facts.

## Source Discipline

- [Stripe: Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency) is the historical source for the payment idempotency mechanism. It does not substantiate the synthetic payment volume or recovery timeline below.
- [GitHub: October 21 post-incident analysis](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/) is the historical source for the replication/failover incident pattern, not a database-migration incident. It does not substantiate the synthetic database size, SLO, or proposed design.
- [C4 model diagrams](https://c4model.com/diagrams) and the [C4 checklist](https://c4model.com/diagrams/checklist) are primary guidance for choosing a view, not evidence that any component is deployed.
- All other case details are synthetic teaching fixtures. Label them `ASSUMED` in a live design.

Each pack has the same contract: assumptions/workload/SLO/team/budget; invariant; minimal design;
rejected alternative; adverse timeline and recovery; selected views; changed-constraint variant;
acceptance criteria; and scaling trigger.

## 1. Payment Timeout and Duplicate Webhook

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 50k checkout attempts/minute at peak, 99.95% successful capture effect, p99 client response 500 ms, six engineers, $25k/month. Processor calls may time out after committing.
- **Invariant:** One payment business operation and one ledger effect per stable operation ID; transport retries and duplicate webhooks never create a second effect.
- **Minimal design:** Checkout API creates one business-operation record keyed by a stable client operation ID (the same ID across transport retries) plus a payload hash; each processor attempt references it. A webhook inbox deduplicates event IDs, a reconciler compares attempts with processor reports, and an unknown outcome returns `202 PENDING` with a status endpoint rather than an invented success or failure.
- **Rejected alternative:** “Exactly once” distributed transactions; the processor and local ledger do not share a transaction boundary.
- **Adverse timeline / recovery:** The processor commits but the response is lost. A same-operation retry returns `PENDING`, not a second capture; status lookup and webhook/reconciliation disambiguate the outcome before the ledger advances. If the provider lacks idempotency, prohibit blind automatic capture retry until the original outcome is disambiguated. Historical mechanism anchor: Stripe source above; the timeline is synthetic.
- **Selected views:** `context(exec)` ownership and trust boundary; `container(tech)` API, ledger, outbox, webhook inbox, reconciler; `sequence(tech)` timeout/retry/webhook race; `state(tech)` attempt lifecycle. Omit views that do not answer a review question.
- **Changed constraint:** The provider offers no idempotency and peak traffic is 10x; retain the stable business-operation key, prohibit blind automatic retry, poll/reconcile before another capture, and state that the guarantee is local-effect idempotency, not processor exactly-once.
- **Acceptance criteria:** Replaying a request for the same business operation or webhook leaves one ledger effect; an unknown processor outcome remains `PENDING` and queryable by operation key; reconciliation reports unresolved attempts; conflicting terminal states stop automatic capture.
- **Scaling trigger:** Pending outcomes older than 2 minutes exceed 0.1% for 5 minutes, processor rate-limit headroom falls below 20%, or ledger write p99 exceeds 500 ms for 10 consecutive minutes.

## 2. Flash-Sale Reservation Expiry and Payment Race

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: one hot SKU receives 20k reserve requests/s, 100k total SKUs, reserve p99 200 ms, 99.9% availability, five engineers, $18k/month. Payment may take 30 seconds.
- **Invariant:** Committed inventory never becomes negative and one order cannot consume two reservations.
- **Minimal design:** Inventory owner performs an atomic conditional decrement into a reservation record with an expiry; payment is a saga; expiry workers propose release and the owner validates the reservation version before restoring stock.
- **Rejected alternative:** A global lock or synchronous payment inside the inventory transaction; both serialize unrelated buyers and hold scarce locks across a slow dependency.
- **Adverse timeline / recovery:** Expiry fires while payment success commits. If `EXPIRED` wins first, the late payment is voided or refunded and the order is not fulfilled; if `PAID` wins first, expiry is a no-op. A versioned state transition chooses the winner, and reconciliation compares stock, reservations, orders, and refund completion.
- **Selected views:** `container(tech)` inventory/order/payment; `sequence(tech)` reserve-pay-expire race; `state(tech)` reservation states. An exec context view is optional when ownership boundaries need review.
- **Changed constraint:** Peak becomes 200k requests/s or payment p99 grows to 90 seconds; isolate hot-SKU contention with a single owner/partition and extend the lease policy, rather than adding a queue without a drain and expiry budget.
- **Acceptance criteria:** Concurrent reserves cannot oversell; late payment after expiry produces a tracked void/refund within 5 minutes and no fulfillment; payment before expiry preserves the reservation; every transition is idempotent and auditable.
- **Scaling trigger:** Conditional-write contention exceeds 5% for 5 minutes, reservation-expiry lag exceeds 30 seconds for 5 minutes, or reconciliation delta exceeds 0.01% of reservations.

## 3. Multi-Tenant SaaS Isolation

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 500 tenants, 2k API requests/s, three large tenants create 80% of traffic, p95 250 ms, 99.9% availability, seven engineers, $20k/month. Tenant data is confidential.
- **Invariant:** A principal can read or mutate only records belonging to its tenant; quota and deletion boundaries are tenant-scoped.
- **Minimal design:** A modular service derives tenant identity from authenticated claims, enforces it at repository and database policy boundaries, namespaces every cache key with tenant ID, and carries validated tenant scope in every queued job before worker data access. Per-tenant quotas and cells are added only where measurements require them.
- **Rejected alternative:** A database per tenant from day one; it multiplies migrations, connections, backups, and on-call without a stated isolation or residency requirement.
- **Adverse timeline / recovery:** A missing filter in a bulk query or an unscoped cache/job path exposes another tenant. Block the path, revoke affected tokens/jobs, invalidate only affected tenant cache keys, audit access, and apply tenant-scoped compensating mutations or export/rebuild. Do not casually restore a shared snapshot and roll back unaffected tenants; code review evidence does not prove deployment.
- **Selected views:** `context(exec)` tenant trust boundary; `container(tech)` identity, policy, service, store, audit; `sequence(tech)` scoped request; `deployment(tech)` cells and blast radius when cells exist.
- **Changed constraint:** A regulated tenant requires residency and dedicated keys; move that tenant to an explicit cell/region boundary while preserving the same contract, and price the operational duplication.
- **Acceptance criteria:** Every API, repository, cache key, and queued job carries enforced tenant scope; cross-tenant reads and writes fail closed; quotas isolate noisy tenants; audit entries identify tenant and principal; recovery preserves unaffected tenants.
- **Scaling trigger:** A tenant consumes over 20% of shared capacity for 10 minutes, any unscoped cache/job is detected, shared-store lock/IO headroom falls below 20% for 10 minutes, or residency/key requirements exceed shared-cell guarantees.

## 4. Cache Stampede and Invalidation

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 5k reads/s for a hot product view, origin safely serves 300 reads/s, p99 150 ms, 99.95% availability, four engineers, $8k/month. Freshness target is 60 seconds.
- **Invariant:** A cache entry is never served beyond its declared freshness policy, and invalidation cannot make a newer version disappear behind an older write.
- **Minimal design:** Optimize the origin query first. Use versioned keys, TTL jitter, one bounded-lease fill owner per hot key across instances, a global origin-concurrency cap, and write-triggered invalidation. Readers use only the current version; a late refill cannot replace a newer version pointer. Stale-if-error is allowed only within the declared 60-second freshness bound; beyond it, return a retryable degraded response instead of stale data.
- **Rejected alternative:** An unbounded cache with permanent TTL; it hides origin defects and makes correctness depend on manual deletion.
- **Adverse timeline / recovery:** A deploy expires a popular key across all instances and a write races with refill. Coalescing limits origin load, versioned keys prevent stale overwrite, and the owner purges the affected version while serving a bounded fallback only when policy allows.
- **Selected views:** `container(tech)` origin/cache/invalidation; `sequence(tech)` miss coalescing and write invalidation. No diagram is required for a one-component cache decision if prose answers the question.
- **Changed constraint:** Origin capacity drops to 100 reads/s or freshness must be 5 seconds; narrow the cached projection and increase refresh capacity only after measuring query cost, rather than adding a queue by reflex.
- **Acceptance criteria:** A concurrent miss burst admits one active fill per key across instances; an expired fill owner cannot publish over a newer version; stale writes cannot overwrite newer data; no response exceeds the freshness bound; origin concurrency and invalidation lag are observable.
- **Scaling trigger:** Origin saturation exceeds 80% for 10 minutes, coalescer wait p99 exceeds 200 ms for 5 minutes, invalidation lag exceeds 10 seconds, or hit ratio falls below 90% for 15 minutes.

## 5. Notification Provider Outage and Backlog

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 100k notifications/hour, 99% accepted within one minute, delivery within 15 minutes for normal traffic, six engineers, $12k/month. Push, email, and SMS have different limits.
- **Invariant:** A notification intent is not silently lost; retries do not create more than one user-visible delivery per idempotency key where the provider supports dedupe.
- **Minimal design:** Persist an intent, route to per-channel workers with provider adapters, use bounded retries with jitter and a dead-letter path, enforce user/channel rate limits, and record provider feedback.
- **Rejected alternative:** Synchronous fan-out to all providers; one provider outage would consume request timeouts and block unrelated channels.
- **Adverse timeline / recovery:** Email provider returns errors for 20 minutes while push remains healthy. Stop email retries at the budget, alert on oldest age, keep push flowing, and fail over only to a contracted provider. The 15-minute delivery objective is breached, not silently redefined. After recovery, drain still-valid intents oldest first with dedupe; expired time-sensitive intents enter an auditable expired/review state rather than sending stale messages.
- **Selected views:** `context(exec)` channel ownership; `container(tech)` intent store, channel workers, adapters, feedback; `sequence(tech)` retry/provider failure; `state(tech)` intent delivery states.
- **Changed constraint:** A provider forbids replay for a regulated message class; persist a human-review state and require an explicit resend decision instead of silently failing over.
- **Acceptance criteria:** Provider outage does not block healthy channels; backlog age and drain rate are visible; retry budgets and DLQ ownership are explicit; duplicate delivery is bounded and explainable.
- **Scaling trigger:** Oldest backlog age exceeds 5 minutes, a provider has less than 20% quota headroom, retry amplification exceeds 1.2x for 10 minutes, or worker drain rate falls below 120% of arrival rate for 15 minutes.

## 6. Chat Reconnect and Resume

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 50k concurrent connections, 5k messages/s, seven-day history, send acknowledgement p99 300 ms, 99.95% gateway availability, eight engineers, $22k/month.
- **Invariant:** Messages are ordered per conversation, acknowledged only after durable acceptance, and a reconnect never applies the same client message twice.
- **Minimal design:** Gateways hold connections, the conversation owner appends messages with client IDs, cursors let clients resume, and bounded offline delivery uses the durable history rather than gateway memory.
- **Rejected alternative:** Global ordering; it adds cross-conversation coordination without improving the stated invariant.
- **Adverse timeline / recovery:** An availability-zone fault reconnects 30k clients at once. Admission control and jittered backoff protect gateways; clients resume from cursors, duplicate client IDs are ignored, and unread gaps are measured until drained.
- **Selected views:** `context(exec)` users and connection boundary; `container(tech)` gateway, conversation owner, history, presence; `sequence(tech)` send/ack/resume; `state(tech)` connection and delivery cursors.
- **Changed constraint:** Mobile clients reconnect intermittently and traffic is 10x; cap resume windows, prioritize active conversations, and partition by conversation while retaining per-conversation ordering.
- **Acceptance criteria:** A reconnect within retained history resumes the missing cursor range; an expired cursor returns an explicit resync-required outcome and current-state recovery, never a false complete-history claim. Duplicate sends have one effect; per-conversation order is stable; reconnect storms do not exhaust the store.
- **Scaling trigger:** Resume backlog age exceeds 60 seconds, gateway connection saturation exceeds 80% for 10 minutes, a conversation partition exceeds 70% capacity for 10 minutes, or message-ack p99 exceeds 300 ms for 5 minutes.

## 7. Live Database and Search Migration

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 200M source rows, 5k writes/s, search p99 300 ms, 99.99% read availability, eight engineers, $30k/month. The source database remains authoritative. Cutover requires at least 99.99% sampled-result parity, zero critical mismatches, and CDC lag below 30 seconds for 15 minutes.
- **Invariant:** No committed source write is lost; search results are either derived from the source or explicitly marked stale, never treated as a second source of truth.
- **Minimal design:** Expand schema compatibly, capture changes, and backfill in throttled partitions. Every backfill write carries the source version/LSN it read and applies only with compare-and-set if that version is still current; a newer CDC version always wins. Shadow-read and compare results, switch reads behind a flag, and contract only after rollback evidence.
- **Rejected alternative:** Big-bang dual-write migration; it couples deploy and backfill failure to an irreversible cutover.
- **Adverse timeline / recovery:** A mapping bug produces divergent results while replication lag grows, or a backfill write races with newer CDC data. Version fencing skips the stale backfill instead of overwriting the newer value. Stop backfill, keep source reads available, revert the read flag if parity drops below 99.99%, critical mismatches become nonzero, CDC lag exceeds 60 seconds for 5 minutes, or search p99 exceeds 300 ms for 10 minutes; fix and replay from source/change log, then record the divergence window. Historical incident pattern anchor: GitHub's official analysis above; this fixture is synthetic.
- **Selected views:** `container(tech)` source, change capture, backfill, index, query service; `dataflow(tech)` ownership and lag; `sequence(tech)` expand/backfill/switch/contract; `state(tech)` migration phases.
- **Changed constraint:** Backfill competes with production writes at 4x current volume; throttle when replica lag exceeds 30 seconds, checkpoint every 1 million rows, and defer cutover if the 99.99% parity or 30-second lag gate cannot hold.
- **Acceptance criteria:** Backfill is restartable and version-fenced; parity is at least 99.99% on the declared sample with zero critical mismatches; CDC lag stays below 30 seconds for 15 minutes; rollback leaves source writes intact and is triggered by the stated mismatch, lag, or p99 thresholds.
- **Scaling trigger:** Source replication lag exceeds 30 seconds for 5 minutes, parity falls below 99.99%, any critical mismatch appears, backfill forecast slips beyond the migration window by 20%, or query p99 exceeds 300 ms for 10 minutes.

## 8. Small Internal Application Counterexample

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 40 internal users, 2 requests/s peak, p95 1 second, business-hours availability, one maintainer, $200/month. No cross-team contract or sensitive residency constraint.
- **Invariant:** Each submitted counter increment is applied once and remains auditable.
- **Minimal design:** A modular monolith with one relational transaction, a managed backup, a small audit table, and a straightforward admin UI. Store a unique client-operation key, payload hash, increment, and result atomically; retries return the stored result, while key reuse with a different payload is rejected. Keep the deployment and runbook proportional to the risk.
- **Rejected alternative:** Microservices, a cache, and a message broker; they add failure modes and on-call cost without a measured bottleneck.
- **Adverse timeline / recovery:** A proposed “scale-ready” topology loses its only maintainer and a broker credential expires. Remove the unnecessary hops, restore the simple transaction path, and document the actual recovery procedure; complexity is the incident.
- **Selected views:** `context(exec)` users and owner; `container(tech)` UI, application, relational store. A sequence view is optional and only useful if the increment invariant is disputed.
- **Changed constraint:** Usage grows to 100 requests/s, 24x7, with a second team; first measure the database and split only the proven boundary, preserving the simple path until a trigger is met.
- **Acceptance criteria:** Concurrent duplicate operation keys produce one increment and one auditable result; conflicting payload reuse is rejected; backups restore within 30 minutes; one maintainer can deploy and recover; review does not penalize absent cache, queue, or multi-region machinery.
- **Scaling trigger:** Measured p95 exceeds 1 second for 10 minutes, database saturation exceeds 70% for 15 minutes, backup restore exceeds 30 minutes, or usage exceeds 100 requests/s for 15 minutes.

## 9. Video Publishing

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 100 uploads/minute, 1 GB average source, publish within five minutes, playback start p95 under two seconds, four engineers, $10k/month, seven-year source retention. Sizing check: `100 × 60 × 24 × 365 × 7 = 367.9 million GB`, about **367.9 PB of source bytes before renditions**. That tuple is rejected as infeasible at $10k/month; select a revised rate/retention or re-baseline the budget before claiming a design is viable. A candidate budget-feasible envelope to price is 1 upload/minute, 30-day hot retention plus archival lifecycle, not a guaranteed cost.
- **Invariant:** The source asset is durable and a video is publishable only after its required renditions and manifest pass validation.
- **Minimal design:** Direct-to-object-storage upload, metadata service, durable transcode jobs with idempotent stage outputs, managed workers, manifest validation, and CDN delivery. This topology is not presented as satisfying the rejected 367.9 PB/$10k tuple; the design gate first approves a feasible storage, egress, and retention budget.
- **Rejected alternative:** Synchronous transcoding in the upload request; it ties user latency to long-running work and makes retries unsafe.
- **Adverse timeline / recovery:** One rendition worker dies after writing a partial output. Mark the stage incomplete, resume from the idempotent source/output key, keep the asset unpublished, and alert on job age rather than CPU alone.
- **Selected views:** `context(exec)` creator, platform, CDN; `container(tech)` upload, object store, metadata, transcode, manifest, CDN; `dataflow(tech)` source to renditions; `state(tech)` upload/publish lifecycle.
- **Changed constraint:** Upload volume becomes 1k/minute or DRM is required; isolate tenant/region processing and add a DRM contract only where its compliance and cost are explicit.
- **Acceptance criteria:** Interrupted jobs resume without corrupting a rendition; manifests reference validated outputs; source retention and deletion are auditable; playback SLO and queue age are visible; the storage/egress forecast is approved against the selected rate-retention-budget envelope.
- **Scaling trigger:** Transcode backlog age exceeds 10 minutes, playback-start p95 exceeds 2 seconds for 15 minutes, object-store egress exceeds 80% of budget for a month-to-date projection, or retained bytes forecast exceeds the approved budget envelope by 10%.

## 10. Ride Dispatch

- **Assumptions / workload / SLO / team / budget:** `ASSUMED`: 20k concurrent rides, 1k driver location updates/s, match p95 two seconds, 99.9% availability, eight engineers, $28k/month. Driver location is ephemeral; trip assignment is durable.
- **Invariant:** A driver has at most one active assignment and a rider sees one authoritative trip state.
- **Minimal design:** Ingest location with TTL into geo cells, query nearby candidates, and let a dispatch authority manage an offer state machine. Persist `ACCEPTED/ASSIGNED` with a fencing/version token before treating the trip as assigned; publish trip events for downstream views.
- **Rejected alternative:** A global nearest-driver lock or globally ordered stream; both create a hot coordination point and solve more ordering than dispatch requires.
- **Adverse timeline / recovery:** The driver accepts but the acknowledgement is lost. Reconcile with the authoritative dispatch/trip state: if `ASSIGNED` persisted, do not expire the lease or re-offer; send status from the authority. Re-offer only when the authoritative state is still `OPEN` and the same fencing/version token matches, so a stale response cannot claim the trip.
- **Selected views:** `context(exec)` rider/driver/platform; `container(tech)` location ingest, geo index, dispatch authority, trip store, event consumers; `sequence(tech)` offer/accept/timeout; `state(tech)` trip and lease lifecycle.
- **Changed constraint:** Ten cities require 10x updates and tighter pickup radius; partition by city/cell, measure false-negative matches, and only add a regional coordinator if the measured handoff requires it.
- **Acceptance criteria:** No driver receives two active trips; an accepted/assigned trip cannot expire as an unaccepted offer; re-offer requires an `OPEN` state and matching fencing token; stale locations are excluded; dispatch p95 and trip-state convergence are measurable.
- **Scaling trigger:** Cell hotness exceeds 70% capacity for 10 minutes, offer timeout rate exceeds 5% for 5 minutes, location staleness exceeds 10 seconds for 5 minutes, dispatch p95 exceeds 2 seconds for 10 minutes, or lease-conflict rate exceeds 1% for 5 minutes.
