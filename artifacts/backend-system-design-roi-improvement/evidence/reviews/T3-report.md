# T3 — Durable effects and reconciliation

Status: T3 source edits settled after one independent-review repair (T3-A1); AC-ROI-07/08/09 addressed in canonical guidance. No efficacy, acceptance, release, model-run or test claim. Evidence is prose + static source checks only.

## Scope and deliverables

Exclusive ownership honored; no files outside the three T3 paths were modified. Partial edits left by the canceled Luna worker were re-read, preserved where correct, and completed rather than reverted.

| Path | State | Words | SHA256 |
| --- | --- | --- | --- |
| `skills/system-design/system-design-integration-patterns/SKILL.md` | edited | 699 | `090c5da313f93e27a7b30bf63dff2b355e87ee35474e302f8632016958851a42` |
| `skills/system-design/system-design-integration-patterns/references/integration-patterns.md` | edited | 1,097 | `d9a7c2b62030cdef45338fd9125803a06853367870d05569fa5cbbe34ad9167a` |
| `skills/system-design/system-design-integration-patterns/references/durable-execution.md` | new | 1,079 | `eb41305df4fbe02931de0df55fc151388c289d260c50a4b5a7194fc5d7bf16f4` |

Baseline (T0 manifest, revision `92d06c420f6a41f08e11579423e4e3eacdb7880d`) for comparison:

- `.../SKILL.md`: 3,856 bytes, `471d75bdf0c94942132559d999be6b6c7a131d3a50527790929b80b2d9aed358`
- `.../references/integration-patterns.md`: 4,825 bytes, `1be06e602c65413f7d4aedb6736e18271804980268a5f5d4332154064930cae9`
- Read-only governing input `skills/system-design/system-design-principles/references/idempotency-contract.md`: 6,453 bytes, `72c8785c970aa03238832380a8dcd2059594bcfd76c8132d529fc424e68b2b7a` — unchanged.

## AC evidence

### AC-ROI-07 — unknown outcome is not blind retry

- `SKILL.md:46`: "A timeout after a possible commit is an unknown outcome: query or reconcile before retrying, never retry blindly."
- `references/durable-execution.md:39` (Unknown Outcomes): persist operation ID + attempt, then query provider/ledger/authoritative event stream before retry or compensation; state track `pending -> in-flight -> unknown -> reconciled`.
- `references/integration-patterns.md:33`: saga step with unknown outcome records unknown state and reconciles with the step owner before retry/compensation; compensating a possibly-landed effect is itself a second problem.
- `references/durable-execution.md:58` adverse timeline "Lost reply": kill after provider commit before response → one effect + queryable status.

### AC-ROI-08 — stable effect identity across replay/crash/distinct events

- `SKILL.md:45`: dedupe delivery on the normalized event identity (source + event ID, or equivalent globally unique ID), arbitrate effects on stable business-operation identity; a bare event ID from two sources is two events; broker guarantees stop at the broker.
- `SKILL.md:49`: correlation IDs trace only, never arbitrate.
- `references/integration-patterns.md:16-20`: event ID vs business-operation ID vs correlation ID distinction; CloudEvents uniqueness `source + id` and explicit statement that delivery identity is the pair, never the bare `id`.
- `references/integration-patterns.md:22`: inbox record + local effect commit in one consistency boundary keyed on consumer + normalized `(source, id)` + tenant/producer scope where required; dedupe-row-before-effect is explicitly unsafe; retention covers the source replay horizon.
- `references/integration-patterns.md:24`: collision check — same `(source, id)` is one delivery; same bare `id` from different sources must not be suppressed and must reach business arbitration; source-qualified key needs no new store.
- `references/durable-execution.md:32,39-40`: every activity attempt carries the operation ID; replays and distinct events never mint a new business identity.
- `references/durable-execution.md:52,59`: consumer dedupe on normalized `(source, id)` separated from operation arbitration; timeline verifies a same-`id` second source still applies its distinct operation.
- Read-only `idempotency-contract.md` reused by link (`integration-patterns.md:22`, `durable-execution.md` Decision Frame) — not forked or edited.

### AC-ROI-09 — compatible replay/migration for in-flight executions

- `SKILL.md:49`: long-running progress must be replay-safe and version-compatible.
- `references/durable-execution.md:43-47` (Running-Workflow Compatibility): old histories must replay under deployed code; strategies = changes preserving recorded command/history compatibility, version gates/patches, pinning old executions to old code, continue-as-new/migration at a defined boundary; "additive" is explicitly not automatically replay-safe; record remaining old-version executions, max lifetime, cutover plan, replay test. A deploy does not reset running executions.
- `references/durable-execution.md:62` adverse timeline "Version upgrade": replay captured old histories in CI, assert completion.
- `references/durable-execution.md:17-22` replay determinism: IO/clock/randomness belong in activities, nondeterminism appears on old-history replay; workflow replay is distinguished from event-projection replay and queue redelivery.

## Contradiction removal (overlap map T3 rows)

| Contradictory baseline rule | Disposition |
| --- | --- |
| IP reference `:5` "The only safe way to change state and tell the world about it" | Replaced with a conditional outbox rule; direct change-stream publication is allowed when publication is not tied to a local commit. |
| Body `:41` "Never dual-write … outbox or CDC" as unconditional | Now "where local state and a publication must commit together"; anti-pattern reworded the same way (`SKILL.md:61`). |
| Body `:42-43` orchestration beyond ~4 steps / choreography 2-3 services | Removed; selection driven by visibility, ownership, coupling, failure isolation, recovery (`SKILL.md:47`, reference `:28`). |
| Body `:32,44` and reference `:36-37` universal compensation / last-step rule | Removed; reversibility is a per-effect property, irreversible/ambiguous effects use retry, reconciliation, or forward recovery; compensation is a fallible effect with its own identity (`SKILL.md:48`, reference `:28-33`). |
| Event-ID-only dedupe (reference `:9`) | Extended with atomic inbox arbitration and the event-vs-operation identity split; delivery identity is normalized to `(source, id)` so a shared bare `id` across sources cannot suppress a distinct operation (`:22-24`); no forked idempotency semantics. |

Preserved existing correct mechanisms: outbox relay table and depth/age monitoring, saga persisted state and correlation, CQRS/event-sourcing adoption and event versioning rules, leader-election fencing, topology table, strangler phases.

## Citations (primary protocol/vendor)

- CloudEvents `id`: `source` + `id` unique per distinct event; a re-sent duplicate MAY reuse the id — https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md#id (used in `integration-patterns.md:18`).
- Debezium outbox event router, CDC form — https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html (`integration-patterns.md:12`).
- Kafka design: idempotent producer + transactions are atomic across topic partitions — https://kafka.apache.org/documentation/#design (`durable-execution.md:51`).
- Temporal workflow definition/determinism and replay — https://docs.temporal.io/workflow-definition (`durable-execution.md:22`).
- Temporal activity execution: cancellation requires heartbeats; running attempts can outlive cancellation/timeouts — https://docs.temporal.io/activity-execution (`durable-execution.md:33-35`).
- Temporal safe deployments and patching — https://docs.temporal.io/develop/safe-deployments, https://docs.temporal.io/patching (`durable-execution.md:47`).
- Stripe idempotent requests (already cited by the read-only contract) — https://docs.stripe.com/api/idempotent_requests (reused via link, not duplicated).

## Public prompt candidates (unsealed, for T5 consideration)

1. "Our payment provider times out after we submit a charge. The client retries. How should the system decide whether to charge again?"
2. "A Kafka consumer occasionally receives the same order event twice, and a workflow replay re-executes the same activity. How do we guarantee one ledger entry?"
3. "We deploy new workflow code while 4,000 executions are mid-flight. What must be true before and after the release?"
4. "A worker is cancelled during an external refund call. Can we treat cancellation as proof the refund did not happen?"

## Independent-review repair (T3-A1)

Review: `.agent/sdd/backend-system-design-roi-improvement/T3-architecture-review.md`, verdict CHANGES REQUESTED, major finding T3-A1 — the inbox key used a bare event ID although the same section states CloudEvents uniqueness as `source + id`; consumer + bare-`id` dedupe could suppress a distinct legitimate operation from another source.

Repair (bounded, no new mechanism):

- `integration-patterns.md:18`: delivery identity is explicitly the pair `(source, id)` or an equivalent globally unique normalized ID, never the bare `id`.
- `integration-patterns.md:22`: inbox key = consumer + normalized `(source, id)` + tenant/producer scope where the canonical identity contract requires it; separate business-operation arbitration retained.
- `integration-patterns.md:24`: both collision edges stated — same `(source, id)` is one delivery; same bare `id` from different sources is a distinct event that must not be suppressed.
- `SKILL.md:45` and `durable-execution.md:52`: body/reference shorthand qualified to normalized identity; two-source bare-`id` case named.
- `durable-execution.md:59`: duplicate-event timeline verification now also sends the same bare `id` from a second source and asserts both operations apply.

Nonblocking observations from the same review addressed in the same owned files:

- `durable-execution.md:46`: "additive decision changes" replaced with changes preserving recorded command/history compatibility, plus an explicit statement that additive is not automatically replay-safe.
- `durable-execution.md:33`: heartbeat cancellation labeled as the runtime mechanism it belongs to (Temporal remote activities), with the framework-neutral requirement stated first.
- `durable-execution.md:66,68`: duplicate-effect/timer checks scoped to an admitted effect and a due expiry so rejected operations and cancelled timers are not forced to produce effects.

Unchanged by repair: compensation/reversibility rules, saga selection criteria, replay determinism, version-compatibility inventory/cutover requirements, citations, fingerprint of the read-only idempotency contract.

| File | Pre-repair SHA-256 | Post-repair SHA-256 |
| --- | --- | --- |
| `SKILL.md` | `ba4eb4986391f81c340f9bb2b32cc709d7aec485664de84848630c5ef475a11a` | `090c5da313f93e27a7b30bf63dff2b355e87ee35474e302f8632016958851a42` |
| `references/integration-patterns.md` | `edfbb0b69aa4245cda53dfe94d29c0cd84e0faa97c9cd62af672f775c6ee2dc5` | `d9a7c2b62030cdef45338fd9125803a06853367870d05569fa5cbbe34ad9167a` |
| `references/durable-execution.md` | `d6f6a2bb78cb850997acb3a805e5e6d91442e6ad9a786480f71687260f153835` | `eb41305df4fbe02931de0df55fc151388c289d260c50a4b5a7194fc5d7bf16f4` |

Receipt: `rtk proxy shasum -a 256` over the three paths; `rtk proxy wc -w` for footprint. No source outside the three T3 paths touched. Ready for revision-bound re-review.

## Verification performed

- Relative link resolution for all Markdown links in the three files: targets exist (`../../system-design-principles/references/idempotency-contract.md`, `references/durable-execution.md`, `references/integration-patterns.md`); repair added no new links.
- YAML frontmatter parses; 13 trigger keywords (3 added: `durable execution`, `workflow replay`, `reconciliation`); no collision inside `system-design` category.
- Scoped replication of `check-alignment` logic for this skill ran before the repair at 11/11 non-negative assertions grounded; after the repair every asserted phrase was re-confirmed present in `SKILL.md` (`No dual write`, `No two-phase commit on the hot path`, `saga`, `No CQRS by default`, `audit needs an audit log`, `Projections, event versioning`, `Two models, sync lag, doubled tests`, `complexity`, `cost`). The repo gate was not run (T6 owns consolidated checks).
- Word footprint: SKILL body 604 → 699; `integration-patterns.md` 831 → 1,097; new `durable-execution.md` 1,079 (loaded lazily via the References section). No savings claimed.

## Risks and open gaps

1. `evals/evals.json` case 2 still pins the removed step-count rule ("No choreography past 4 steps", "Every saga step needs its compensation…", "Saga with compensations") at lines 43-59. T5 must replace case 2; T3 must not edit eval files.
2. Semantic behavior is unverified: no model run, no eval, no executable duplicate-effect harness. Prose consistency is not efficacy; the T3-A1 collision case is asserted in guidance only.
3. `skills/metadata.json`, `skills/README.md`, `skills/system-design/_INDEX.md` do not yet reflect the new reference/keywords; T6 owns those shared paths.
4. A producer that mints a new event ID for the same business event still needs operation identity to avoid a second effect — stated in the text; only T5 cases can test whether models apply it.
5. Keyword additions (`durable execution`, `workflow replay`, `reconciliation`) change routing surface; `audit:keywords` and routing evals must confirm no new ambiguity at T6/T5.
6. Cancellation guidance is framework-neutral with the Temporal heartbeat mechanism labeled; other engines may differ, so an implementer must still verify its runtime's delivery channel.

## Session limits observed

No delegation, no generators, no mirrors, no eval/meta edits, no builds/lints/tests/formatters, no model/cloud calls, no commits or pushes. `rtk`-prefixed shell used for checksums and static checks only.
