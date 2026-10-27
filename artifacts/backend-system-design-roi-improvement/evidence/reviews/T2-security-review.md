# T2 independent security review

## Verdict: CHANGES REQUESTED

Settled-source review only; not human approval, runtime safety proof or measured efficacy. Source treated as semi-trusted candidate material; bounded local inspection, no source edits, no external publication. Governing evidence: approved PRD §§4/T2, lead-dispatch-contract.md and review-contract.md. Compared the two existing files with their baseline-snapshot equivalents; tenant-safe-retrieval.md is new.

Loaded review rules (MCP audit completed): common-code-review, common-security-audit, common-owasp, common-llm-security, common-security-standards, system-design-principles; file routing additionally loaded common-feedback-reporter, common-session-retrospective, common-skill-creator, common-workflow-writing. Keyword router also returned unrelated language/mobile rules; those surfaces are not affected. Audit reports a generic Markdown/product-management coverage warning; this review is canonical security guidance, not product-management authoring.

## Confirmed MAJOR — revoked data must not be served merely marked stale

Evidence: `skills/system-design/system-design-data-architecture/references/tenant-safe-retrieval.md:80` defines the combined deletion/revocation invariant as “before it, reads are denied or marked.” Lines 60 and 63 also leave partial-state behavior conditional; line 63's final sentence correctly prohibits serving an unauthorized result. `T2-report.md:67` explicitly interprets the choice as permitting marked-stale results. This conflicts with the reference's current-authority rule at line 7, immediate denial at line 62, and canonical `SKILL.md:46` / `flow-contracts.md:10`.

Why: The concrete combined counterexample authorizes an unsafe alternative despite the surrounding prohibition. Timeline: principal has access, summary/export is cached; permission is withdrawn at t1; invalidation is pending until t2; during (t1,t2) the implementation returns the cached source text tagged stale by following line 80. The principal receives bytes it is no longer authorized to read. A label is not access control. This violates AC-ROI-05 and undermines AC-ROI-06's lifecycle contract. Confidence: high; a contradictory guidance contract, not a claimed deployed exploit.

Fix: Separate authorization from erasure/freshness. After revocation, deny protected content immediately at every serving path irrespective of pending byte deletion; a partial/stale marker may describe status without including revoked content, or accompany stale content only when current authority still permits it. Make lines 60/63/80 and report risk 67 unambiguous. Keep asynchronous physical erasure and bounded propagation. Do not require a new engine/schema/runtime.

Repair verification: Walk t1 revocation → stale index/cache/export hit before t2 invalidation; the only allowed user-visible result contains no revoked content. Separately walk still-authorized stale content and pending-erasure status to preserve legitimate product choices. Check all three canonical files retain one authority rule.

## AC assessment and reviewed mechanisms

- **AC-ROI-05: not accepted pending finding.** Positive coverage: source query/authenticated identity 13–16,23; lexical/vector 24–25; authorized-only rerank plus fusion check 26; scoped cache key and reauthorization 27; authenticated async scope and start/output checks 28; untrusted query/model identifiers 36–38. SQL/RLS privileges 42–47 correctly distinguish owner/privileged bypass and derived stores; pooled context 51–56 binds SET LOCAL to the transaction, denies missing scope, and requires failure/reset verification. The alternate revoked-output timeline defeats the end-to-end invariant.
- **AC-ROI-06: not accepted pending finding.** Copy inventory, owners, invalidation triggers/bounds, epoch/tombstone restoration fences, and copy-level probes are explicit at 15–17,29–30,60–65. Revocation versus erasure is correctly distinguished at 62, but line 80 permits the opposite behavior while propagation is pending.
- Canonical consistency otherwise: flow-contracts extends Authority and copies rather than forking the contract; body/reference routing and relevance-not-authorization agree. Existing database-scaling.md:76–80 lifecycle guidance remains compatible.

## Source binding

Independently observed with `rtk proxy shasum -a 256`:

| File under skills/system-design/system-design-data-architecture/ | SHA256 |
| --- | --- |
| SKILL.md | e673583ba86f4fb92be74924a85eb139df4476b93b5ce7ddf1730ccd591a796d |
| references/flow-contracts.md | 6215b36242151b6238253d52dfcdbf4eaf8fe6acae137d1618aae8d2aa77281c |
| references/tenant-safe-retrieval.md | 4d354b7cdaa725784d27a20c1014a73ddd2bc5700d4182881732bc6691a9e38d |

These match the settled T2 report. Baseline originals read from baseline-snapshot/skills/system-design/system-design-data-architecture/; no baseline or source writes.

## Evidence limits

No builds/tests/lints/formatters/generators, production probes, model/eval calls, or T5 sealed content. Adverse timeline is semantic source review, not executable conformance. No runtime, recall, latency, authorization-cache freshness, or efficacy claim. Primary links were inspected as source citations in the candidate, not independently fetched in this review. T6 owns integrated checks; paid T7 and human acceptance remain separate. Scope excludes generic search tuning and optional T4 features. No independent security finding is inferred solely from absent tests under this mid-flight gate.
