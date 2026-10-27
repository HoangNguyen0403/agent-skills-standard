# T3 architecture re-review (r2)

## Verdict: APPROVE — T3-A1 resolved; AC-ROI-07/08/09 coherent; ancillary fixes strictly narrow claims

Independent, revision-bound architecture review of the current T3 candidate. `T3-architecture-review.md` (original CHANGES REQUESTED) and `T3-security-review.md` (original APPROVE) remain unmodified. Not human acceptance, runtime conformance or efficacy evidence.

Rules loaded (MCP): file routing returned `common-feedback-reporter`, `common-session-retrospective`, `common-skill-creator`, `common-workflow-writing`; explicit loads `common-code-review`, `common-security-audit`, `common-llm-security`, `specialist-architecture-guard`, `system-design-principles`; canonical `idempotency-contract.md` read as governing input only. Session compliance audit run: generic Markdown/product-management warning only.

## Source binding (independently recomputed)

`rtk proxy shasum -a 256`, current worktree:

| Path | Current SHA-256 | T3-report.md |
| --- | --- | --- |
| `skills/system-design/system-design-integration-patterns/SKILL.md` | `090c5da313f93e27a7b30bf63dff2b355e87ee35474e302f8632016958851a42` | matches post-repair |
| `.../references/integration-patterns.md` | `d9a7c2b62030cdef45338fd9125803a06853367870d05569fa5cbbe34ad9167a` | matches post-repair |
| `.../references/durable-execution.md` | `eb41305df4fbe02931de0df55fc151388c289d260c50a4b5a7194fc5d7bf16f4` | matches post-repair |
| `skills/system-design/system-design-principles/references/idempotency-contract.md` (read-only) | `72c8785c970aa03238832380a8dcd2059594bcfd76c8132d529fc424e68b2b7a` | unchanged; equals baseline |

Pre-repair T3 hashes from the two prior reviews are superseded and no longer current; the report records them for traceability. Baseline originals for the two edited files are unchanged in the T0 snapshot (`471d75bd…aed358`, `1be06e60…30cae9`).

## T3-A1 disposition — RESOLVED, all four identity properties present

| Required property | Evidence |
| --- | --- |
| Delivery identity is source-qualified, never bare `id` | `integration-patterns.md:18` states CloudEvents uniqueness as `source + id`, that a re-send may reuse it, and that the delivery identity is the pair `(source, id)` or an equivalent globally unique normalized ID — "never the bare `id`"; `SKILL.md:45`; `durable-execution.md:52` |
| Inbox key = consumer + normalized identity + canonical tenant/producer scope | `integration-patterns.md:22` — inbox row and local effect commit in one consistency boundary, "keyed on the consumer plus the normalized delivery identity `(source, id)` plus tenant/producer scope where the canonical identity contract requires it", with retention covering the replay horizon and the read-only idempotency contract linked rather than forked |
| Same bare `id` from another source must not suppress a legitimate second event | `integration-patterns.md:24` — both edges stated: same `(source, id)` redelivered is one delivery; same bare `id` from different sources "names different events and must not be suppressed—dropping it loses a legitimate operation before business arbitration runs"; `SKILL.md:45` ("A bare event ID from two sources is two events"); `durable-execution.md:59` timeline verification sends the same bare `id` from a second source and asserts both distinct operations apply |
| Same source + id is one delivery | `integration-patterns.md:24` ("acknowledge once") and `:22` atomic dedupe-with-effect; `durable-execution.md:59` ("One effect under operation identity; `(source, id)` dedupe is atomic with the effect") |
| Business-operation identity remains separate and is the effect arbiter | `integration-patterns.md:19` (operation ID spans events/retries/replays) and `:20` (correlation traces only); `SKILL.md:45` arbitrates effects on stable business-operation identity; `durable-execution.md:32,40,52` |

Adverse timeline re-walk: consumer C subscribes to sources A and B. A emits `id=42` (operation OA); C commits inbox + effect. B emits `id=42` (operation OB). Under `:22/:24` the inbox key includes source, so `(C,B,42)` is not the `(C,A,42)` row; OB proceeds to business arbitration and is not dropped as a duplicate. Conversely, a redelivery of `(A,42)` matches the existing record and is acknowledged once. No clause now instructs a bare-id inbox key; the previous `:22` wording has been replaced, not merely annotated.

## AC verdicts at the current hashes

| AC | Disposition | Evidence |
| --- | --- | --- |
| AC-ROI-07 | PASS as guidance | `SKILL.md:46`; `integration-patterns.md:33` (saga step with unknown outcome records state and reconciles with the step owner before retry/compensation); `durable-execution.md:37-41` (unknown outcome, reconcile before retry, `pending -> in-flight -> unknown -> reconciled`); `:58` lost-reply timeline. No rule permits minting a fresh key to escape uncertainty. |
| AC-ROI-08 | PASS as guidance | Identity split and inbox arbitration per the table above; atomic local boundary with dedupe-before-effect rejected (`integration-patterns.md:22`); broker-vs-effect boundary explicit (`durable-execution.md:51-52`, `SKILL.md:45`); canonical owner arbitration supplied by the linked contract, not duplicated. |
| AC-ROI-09 | PASS as guidance | `durable-execution.md:43-47` — old histories must replay under deployed code; strategies preserve recorded command/history compatibility, version gates/patches, pinning, continue-as-new/migration at a defined boundary; inventory of old-version executions, lifetime, cutover plan and captured-history replay test; "A deploy does not reset running executions"; `:62` version-upgrade timeline; `:69` verification. |

## Ancillary within-scope fixes — additive and narrowing, not weakening

- `durable-execution.md:46` — "additive decision changes" removed; "Additive is not automatically replay-safe: inserting a command ahead of a recorded one changes the sequence." This tightens the prior text and also closes the first nonblocking note in `T3-architecture-review.md`. It does not relax `:45`/`:47`.
- `:33` — framework-neutral requirement stated first, with the heartbeat channel labeled as the mechanism of Temporal remote activities and cited. This removes an implicit universal engine claim rather than adding one.
- `:66` — duplicate-effect count scoped to "an admitted effect", and rejected operations/cancelled timers explicitly not forced to produce an effect; `:68` scoped to a due expiry. These narrow the verification statements, consistent with `:34-35` (cancellation is not proof of no effect) and `:40` (same-operation-ID repeat only when the effect owner treats it as the same effect).
- No other semantic change was introduced in the three files: saga selection, compensation/reversibility, replay determinism, version-compatibility inventory/cutover and citations are intact; the read-only idempotency contract is linked, not forked or edited.

## Nonblocking observations

1. `integration-patterns.md:24` says "no additional store is required" for a source-qualified key. True for identity, but retention/expiry lookup still needs durable business state or reconciliation per `:22`; the sentence should not be read as removing the retention horizon.
2. `durable-execution.md:40` ("retry blindly only when…") is intentionally conditional; the governing contract's parameter/retention conditions still apply. Current wording keeps the condition, so no repair is needed before freeze.
3. AC-ROI-07/08/09 remain prose-asserted. The report's own gap list (eval case 2 stale assertions, metadata/index regeneration, unrun `audit:keywords`) correctly stays with T5/T6; this review awards no routing or efficacy outcome.

## Evidence limits

No source edits, builds, tests, lints, formatters, generators, model/eval runs, cloud calls, commits or pushes; no T5 sealed content. Verification was SHA-256 binding plus bounded reading of the four paths. Semantic review is not executable proof; T6 integrated checks, T5 binding, any authorized T7 run, human acceptance and release remain separate gates.
