# T3 independent security review

## Verdict: APPROVE — bounded source/security review

No confirmed Blocker/Major security defect in the settled three-file candidate when read with the linked canonical idempotency contract. This is not human acceptance, runtime conformance, integrated gate approval or efficacy evidence.

Scope: approved PRD §§4/T3; review-contract.md and lead-dispatch-contract.md; exact T3-report.md hashes. Compared current SKILL.md and integration-patterns.md with frozen baseline-snapshot equivalents, read new durable-execution.md and the read-only idempotency-contract.md. Source classified semi-trusted candidate content; local bounded inspection, no source edits, credentialed publication or delegation.

Loaded standards: code-review workflow; common-code-review, common-security-audit, common-owasp, common-llm-security, common-security-standards, system-design-principles. File routing also loaded common-feedback-reporter, common-session-retrospective, common-skill-creator, common-workflow-writing. Keyword routing returned unrelated language/mobile rules; those surfaces are outside scope. MCP audit completed before verdict. Its generic Markdown/product-management warning does not establish a missing security rule for these skill references.

## AC and adverse-timeline evidence

| AC | Source-review status | Mechanism and adverse timeline |
| --- | --- | --- |
| AC-ROI-07 | PASS, guidance only | SKILL.md:46; integration-patterns.md:31; durable-execution.md:34–41,58,60–61. Provider commits then loses reply, or cancellation races a later commit: local timeout/cancel cannot establish failure; retain operation/attempt and unknown/queryable state, reconcile before retry/compensation. No rule permits minting a fresh operation key to escape uncertainty. |
| AC-ROI-08 | PASS, guidance only | SKILL.md:45,49; integration-patterns.md:18–22,29; durable-execution.md:27,32,40,51–52,59–60. Concurrent same-event deliveries arbitrate inbox/local effect together; two distinct events or a workflow replay retain the business-operation ID, not event/correlation identity. Crash after effect but before result recording invokes authoritative recovery rather than a fresh effect. Canonical idempotency-contract.md:7–12 supplies atomic owner arbitration, normalized-payload conflicts and retention/recovery horizons. |
| AC-ROI-09 | PASS for security consequences of versioning, guidance only | durable-execution.md:19–22,45–47,62,69. Old execution resumes after deploy: old history must remain deterministic or be explicitly migrated/pinned; retained-history replay, old-execution inventory, lifetime and cutover are required. Stable effect identity at :32/:40 still applies across the upgrade; a deploy is not permission to create a fresh payment intent. Architecture reviewer owns broader compatibility assessment. |

## Concrete checks

- Unknown provider commit: a local pending/unknown record alone cannot arbitrate remote effect; canonical effect-owner recovery at idempotency-contract.md:8–10 is linked, not replaced by broker semantics. Lost reply remains queryable; no blind new-key retry.
- Same operation under distinct event IDs: delivery dedupe is insufficient; operation-scoped arbitration is explicit in body :45 and both references. Inbox-before-effect crash is explicitly rejected at integration-patterns.md:22. Retention must cover replay horizon with durable lookup after expiry.
- Timeout/cancellation: durable-execution.md:33–35 rejects treating worker timeout or cancellation as proof the provider stopped, including overlapping attempts and late completion. Compensation is not attempted against an unresolved possibly-landing effect.
- Irreversible effects: baseline universal per-step compensation/end-of-sequence rule was removed. integration-patterns.md:27/31 requires domain-valid reversal and treats compensation as another identified, fallible effect with recovery; irreversible or uncertain steps use reconciliation/forward recovery, not invented rollback.
- Canonical ownership: idempotency-contract.md remains governing authority; source hashes independently match its reported unchanged receipt. No duplicate canonical contract introduced. New outbox/inbox guidance does not claim atomicity across an external API boundary.

## Nonblocking interpretive limits

- durable-execution.md:40 allows a same-ID repeat without preliminary query only when the effect owner actually treats it as the same effect. Read this with the linked contract's scope/parameter/retention/arbitration conditions; merely sending a header is insufficient. This conditional is not a new-key retry allowance. The other timelines conservatively require reconciliation.
- “Additive decision changes” at durable-execution.md:46 is not itself proof of replay compatibility. Lines 45/47 and the retained-history checks remain the acceptance condition; adding a new scheduled command into an old execution path is not automatically safe. No source-review approval substitutes for that check.
- Event dedupe must use the declared event identity's uniqueness scope. integration-patterns.md:18 explicitly states CloudEvents source + id; “event ID” at :22 must retain that scope, not strip source when accepting multiple producers.
- Cancellation/heartbeat explanation cites Temporal. This review does not certify every engine/activity type shares that delivery mechanism; the security invariant is the explicit no-proof-of-stoppage rule.

## Independently observed source binding

Command: `rtk proxy shasum -a 256` over the three candidate files and read-only governing contract. All four match T3-report.md.

| Path | SHA256 |
| --- | --- |
| skills/system-design/system-design-integration-patterns/SKILL.md | ba4eb4986391f81c340f9bb2b32cc709d7aec485664de84848630c5ef475a11a |
| skills/system-design/system-design-integration-patterns/references/integration-patterns.md | edfbb0b69aa4245cda53dfe94d29c0cd84e0faa97c9cd62af672f775c6ee2dc5 |
| skills/system-design/system-design-integration-patterns/references/durable-execution.md | d6f6a2bb78cb850997acb3a805e5e6d91442e6ad9a786480f71687260f153835 |
| skills/system-design/system-design-principles/references/idempotency-contract.md | 72c8785c970aa03238832380a8dcd2059594bcfd76c8132d529fc424e68b2b7a |

## Evidence limits and next gate

No builds/tests/lints/formatters/generators, models/paid evals, production/provider calls, commit/push or T5 sealed content. No executable duplicate-effect, cancellation, retention-expiry or retained-history replay was run; timelines above are semantic review evidence only. Citations were read in candidate text, not independently fetched. No claim of hidden efficacy or ROI. T6 integrated checks, architecture review, any separately authorized T7 and human acceptance remain independent gates. Existing case-2 stale compensation/step-count assertions are reported in T3-report.md for T5's owner, not repaired or independently evaluated here.

Telemetry: MCP get_session_cost returned partial telemetry only; host token counts/prices and monetary total unavailable. No numeric total inferred.
