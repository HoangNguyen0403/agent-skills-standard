# Durable Execution

Durable execution keeps a business process alive across process loss, retries, and deploys. The engine is not the guarantee: guarantees come from persisted history, deterministic replay, stable effect identity, and reconciliation.

## Decision Frame

| Constraint observed | Choice | Cost accepted |
| --- | --- | --- |
| Retry around one effect inside one request | [Idempotency contract](../../system-design-principles/references/idempotency-contract.md) plus bounded retry | None new |
| Process must survive crash/deploy and resume mid-flow | Persisted workflow state (engine, or a DB-backed state machine and scheduler) | History storage, engine operations, replay discipline |
| Wait or approval measured in hours/days | Durable timer plus an expiry policy | Timer records, late-action handling |
| Steps cross services and effects need recovery | Saga or durable workflow | Persisted progress, retries, reconciliation |
| Effect is irreversible or the provider outcome is ambiguous | Forward recovery plus authoritative reconciliation | Reconciliation path; no clean rollback |

Choose by process lifetime, who owns recovery, visibility needs, and ownership boundaries. Step count alone does not select a coordination style.

## Replay Determinism

- Persisted history is the workflow state. On replay, the process re-derives decisions from recorded results, so decisions must be deterministic.
- Keep IO, clock reads, randomness, and environment lookups in activities whose results are recorded; the workflow logic consumes those results.
- Nondeterminism surfaces when old histories replay under new code, not in fresh runs. A replay test over retained histories is the check.
- Workflow replay, event-projection replay (rebuild a read model), and queue redelivery are different mechanisms. One does not substitute for another. See [Temporal's workflow definition](https://docs.temporal.io/workflow-definition).

## Durable Timers

- Persist the deadline, owner, and expiry action. An in-process `sleep` dies with the process and silently drops the business wait.
- Expiry is an effect: fire it through operation identity so restart or replay cannot deliver it twice.
- A fired timer proves a deadline elapsed, not that the counterparty acted. Confirm the expected state before advancing.

## Activities, Attempts, and Cancellation

- Each activity attempt carries the stable business-operation ID; internal retries reuse it rather than minting a new identity.
- Provide a progress and cancellation delivery channel. Where the runtime delivers cancellation through activity heartbeats (for example Temporal remote activities), heartbeats are required: without them a cancellation request is not delivered, and a task timeout can leave the first attempt running while a second starts.
- Cancellation, timeout, and worker shutdown are not evidence that an external effect stopped; a request already accepted may commit afterwards. Treat that outcome as unknown until reconciled.
- Late completion must be handled idempotently at the effect owner. Do not compensate an effect that may still land. See [Temporal activity execution](https://docs.temporal.io/activity-execution).

## Unknown Outcomes

- A timeout after sending is an unknown outcome, not a failure. Persist the operation ID and attempt, then query the provider, ledger, or authoritative event stream before retrying or compensating.
- Retry blindly only when the effect owner treats repeat under the same operation ID as the same effect. Different events, replays, or transports never justify a fresh business identity.
- Track the operation as `pending -> in-flight -> unknown -> reconciled`, and expose the unknown state rather than inventing a success or failure.

## Running-Workflow Compatibility

- Old histories must replay under the deployed code. Otherwise in-flight executions stall or fail on nondeterminism when workers pick them up after an upgrade.
- Compatible strategies: changes that preserve recorded command/history compatibility, version gates/patches for changed branches, pinning old executions to old code, or continue-as-new/migration at a defined boundary. "Additive" is not automatically replay-safe: inserting a command ahead of a recorded one changes the sequence.
- Record which executions remain on the old version, their maximum lifetime, the cutover plan, and a replay test of captured histories. A deploy does not reset running executions. See [safe deployments](https://docs.temporal.io/develop/safe-deployments) and [patching](https://docs.temporal.io/patching).

## Broker Delivery Versus Business Effect

- Broker guarantees stop at the broker boundary. Kafka's idempotent producer and transactions make writes to Kafka topic partitions atomic; they do not make an external database or API call atomic with them ([Kafka design](https://kafka.apache.org/documentation/#design)).
- Consumer deduplication on the normalized event identity `(source, id)` prevents handling one message twice; business-operation identity prevents applying the effect twice from distinct events or replays. A bare `id` shared by two sources is two events. Both are needed, and neither is end-to-end exactly-once.

## Adverse Timelines

| Failure | Timeline | Invariant | Verification |
| --- | --- | --- | --- |
| Lost reply | Provider commits, response lost, workflow retries | Outcome stays unknown until queried; no second effect | Kill after commit before response; assert one effect and a queryable status |
| Duplicate event | Relay or broker redelivers the same event while the first is processing | One effect under operation identity; `(source, id)` dedupe is atomic with the effect | Deliver concurrently and after a crash mid-effect; assert one effect. Then send the same bare `id` from a second source; assert both distinct operations apply |
| Crash mid-activity | Worker dies after the external call, before recording the result | Recovery reconciles before retrying or compensating | Terminate worker post-call; assert reconciliation precedes any new attempt |
| Cancel or timeout | Cancellation arrives while the provider call is in flight and later commits | Cancellation is not proof of no effect | Cancel, let the call commit, assert reconciliation and no compensating duplicate |
| Version upgrade | Old execution resumes on new code | Replay stays deterministic or the execution is migrated | Replay captured old histories in CI; assert completion |

## Verification

- Duplicate-effect count for an admitted effect after crash, replay, and redelivery is one; a deliberately rejected operation or cancelled timer is not forced to produce an effect.
- The unknown-outcome path returns pending/queryable, never an invented result.
- Every timer and expiry action that is due fires once across restart.
- Captured old-version histories replay to completion on the new code.
- Cancellation of a possibly-committed effect triggers reconciliation, not a blind compensation.

## Cost and Reversal

Durable execution charges history storage, engine operations, replay-safe coding discipline, and versioning work for every behavior change affecting live executions. Revert to bounded retry plus the idempotency contract when the process fits one request and one effect, or to a database-backed state machine plus scheduler when the engine's feature set is not used.
