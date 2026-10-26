# T3 independent architecture review

## Verdict: CHANGES REQUESTED

Scope: the three settled canonical T3 guidance sources, compared with T0 frozen originals where present; the durable-execution reference is new. No source edit, build, test, formatter, generator, model evaluation, cloud execution, commit, push or delegation. No T5 sealed scenario was read before completing this source review. This is documentary mechanism review, not proof of implementation or efficacy, human acceptance or release.

Rules: code-review and review-system-design workflows, common/common-code-review, common/common-architecture-audit, common/common-security-audit, common/common-security-standards, common/common-skill-creator, common/common-feedback-reporter, common/common-session-retrospective, common/common-workflow-writing, common/common-best-practices, specialists/specialist-architecture-guard, system-design/system-design-methodology, system-design/system-design-principles, system-design/system-design-review; semantic-evaluation.md and the canonical idempotency contract. Router additionally loaded Go/Python architecture and React Native security, not applicable to this Markdown-only scope. File-specific MCP loading and compliance audit performed independently; generic Markdown/product-management routing warning is not an identified architecture-coverage gap.

## Confirmed blocking finding

### [MAJOR] T3-A1 — inbox key omits the event-source namespace required by its own protocol

Evidence: `skills/system-design/system-design-integration-patterns/references/integration-patterns.md:18` correctly states CloudEvents uniqueness as `source + id`. Line `:22` then prescribes an inbox "keyed on the consumer plus event ID" without requiring source-qualified event identity or an equivalent globally unique internal identity. Body `SKILL.md:45` and durable reference `:52` use the same unqualified event-ID shorthand, so the actual key recipe is the decisive ambiguity.

Why: two independent producers may legally use the same `id` for distinct events. Consumer-plus-bare-ID arbitration can treat a legitimate second operation as a duplicate, dropping it before business-operation arbitration is reached. Exactly-once local atomicity does not fix collision in the identity used to decide which effect exists.

Adverse timeline: consumer C subscribes to source A and source B. A emits `id=42`, operation OA; C atomically commits its inbox row and effect. B emits `id=42`, operation OB, a distinct valid event and intent. A uniqueness constraint on `(C,42)` reports a duplicate, C acknowledges/drops B, and OB never takes effect. There is no duplicate external call to reconcile; this is lost legitimate work.

Violated contract: AC-ROI-08 stable effect identity across distinct events and replay; T3 event-vs-business identity and atomic inbox boundary; canonical idempotency contract identity/scope and authoritative arbitration. The newly explicit CloudEvents namespace must survive into the key recipe.

Bounded repair: define event identity as `(source,id)` (plus tenant/scope when not already incorporated), or explicitly require an equivalent globally unique normalized ID. Use `(consumer,source,id)` for inbox arbitration; retain the separate scoped business-operation key for effect arbitration. A source-qualified event ID is sufficient—no new store or mechanism. Add/describe the collision check alongside redelivery checks: same source/id is one delivery; different source/same bare id must not suppress a distinct operation.

## AC dispositions at reviewed hashes

| AC | Evidence | Disposition |
| --- | --- | --- |
| AC-ROI-07 | Body :46; integration reference :27-31; durable :34-41 and :58,60-61 require unknown/queryable state, authoritative reconciliation and no blind compensation | PASS as guidance. Durable :40 permits same-ID reissue only when the effect owner already guarantees one effect, consistent with canonical owner arbitration. A query result of not-found is not proof an in-flight call cannot still land; the governing contract remains necessary. |
| AC-ROI-08 | Body :45,49; integration :18-22,29; durable :27,32,40,51-52 | Stable operation identity, atomic local inbox/effect boundary, retention and broker/external distinction present. Acceptance blocked by T3-A1's source-namespace omission for distinct legitimate events. |
| AC-ROI-09 | Durable :19-22 and :45-47 require old histories to replay, explicit version handling/pinning/migration, inventory/cutover and captured-history tests; :62,69 give verification targets | PASS as guidance, not proof a particular engine/version migration works. No running histories were executed. |

## Other architecture checks

- Outbox is conditional on local business state and publication intent sharing a commit boundary (`integration-patterns.md:5`); relay duplicates are explicit and neither CDC nor outbox is claimed to make arbitrary external effects atomic.
- Inbox and local effect commit together; dedupe-before-effect crash loss is explicitly rejected (`:22`). External effect owner uses the separately linked idempotency/recovery contract; a local inbox is not presented as a transaction spanning an external API.
- Workflow replay, projection replay and queue redelivery are explicitly different (`durable-execution.md:22`); nondeterministic IO/time/random/env results are recorded outside workflow decision logic. Stable operation ID remains the arbiter of effects, not determinism by itself.
- Durable deadlines/expiry actions are persisted and operation-scoped (`:26-28`). Cancellation/shutdown/timeout are explicitly not proof of no external effect (`:34-35`); late completion and compensation have recovery paths.
- Fixed step-count orchestration and universal compensation rules were removed. Domain reversibility, owner, visibility, coupling and recovery now shape the decision. No engine is mandated where a DB-backed state machine suffices.

## Nonblocking qualification observations

1. `durable-execution.md:46` lists "additive decision changes" as a compatible strategy. Additive is not itself replay-safe: inserting a new activity before an existing recorded activity changes the command sequence. The governing :45 old-history invariant and :47 replay test prevent a clean-readiness claim without validation, so this is not a separate failed AC. Prefer "changes that preserve recorded command/history compatibility, otherwise gated or migrated" rather than implying all additions are safe.
2. `durable-execution.md:33` describes cancellation delivery through heartbeats without an explicit engine/activity-kind qualifier. This matches the cited Temporal remote-activity pattern, not every durable runtime or local-activity cancellation mechanism. Framework-neutral requirement is progress/cancellation delivery plus bounded liveness; keep the Temporal mechanism labeled. The implementation report already flags this scope limitation.
3. Verification :66,68 says effect/timer count is one. Treat these as expected outcomes for an admitted effect/expiry that should happen; a canceled timer or deliberately rejected operation should not be forced to produce an effect. The body does not claim a running engine has demonstrated these checks.
4. Source/reference footprint increase is explicit and advanced mechanics remain on demand. No needless new abstraction was identified. Routing/eval assertion updates, generated mirrors and full integration checks belong to T5/T6 and were not independently run here.

## Exact binding and verification

`rtk proxy shasum -a 256` matched all current and retrievable frozen hashes to T3-report.md. `rtk proxy diff -u` compared the body and existing reference with frozen originals (exit 1 means changed bytes, not a test failure). The new durable reference was read in full; it has no frozen original. Governing idempotency source independently hashes equal to its frozen original.

| File | Frozen original SHA-256 | Reviewed SHA-256 |
| --- | --- | --- |
| `skills/system-design/system-design-integration-patterns/SKILL.md` | `471d75bdf0c94942132559d999be6b6c7a131d3a50527790929b80b2d9aed358` | `ba4eb4986391f81c340f9bb2b32cc709d7aec485664de84848630c5ef475a11a` |
| `skills/system-design/system-design-integration-patterns/references/integration-patterns.md` | `1be06e602c65413f7d4aedb6736e18271804980268a5f5d4332154064930cae9` | `edfbb0b69aa4245cda53dfe94d29c0cd84e0faa97c9cd62af672f775c6ee2dc5` |
| `skills/system-design/system-design-integration-patterns/references/durable-execution.md` | absent/new | `d6f6a2bb78cb850997acb3a805e5e6d91442e6ad9a786480f71687260f153835` |
| `skills/system-design/system-design-principles/references/idempotency-contract.md` (read-only) | `72c8785c970aa03238832380a8dcd2059594bcfd76c8132d529fc424e68b2b7a` | `72c8785c970aa03238832380a8dcd2059594bcfd76c8132d529fc424e68b2b7a` |

Baseline revision: `92d06c420f6a41f08e11579423e4e3eacdb7880d`. Citation links were inspected, not independently re-fetched in this review. No runtime, deployment or efficacy claim is approved. Repair belongs to the locked implementation owner, followed by revision-bound re-review. Human acceptance remains separate.

Cost: MCP telemetry obtained; host token counts/prices unavailable, monetary total unknown, not zero.
