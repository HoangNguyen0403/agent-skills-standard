# T2 scoped security rereview

## Verdict: APPROVE — prior MAJOR resolved in guidance

Historical `T2-security-review.md` remains unchanged and records the original CHANGES REQUESTED verdict. This report supersedes that verdict only for the scoped corrected candidate below; it is not human acceptance, executable conformance or efficacy evidence.

## Candidate binding and scope

- `skills/system-design/system-design-data-architecture/references/tenant-safe-retrieval.md`: SHA256 `fa37e6f2569c328b0dd9cd87d103e523968d47a2c7f0ea47932b44198683d571`, 12,001 bytes, supplied by the lead and recorded in T2-report.md corrective receipt. No checksum command rerun under the explicit no-checks instruction; digest is receipt-attested, not independently recomputed in this rereview.
- SKILL.md remains at receipt `e673583ba86f4fb92be74924a85eb139df4476b93b5ce7ddf1730ccd591a796d`; flow-contracts.md remains at receipt `6215b36242151b6238253d52dfcdbf4eaf8fe6acae137d1618aae8d2aa77281c`. Re-read their authority clauses; no new checksum claim.
- Read corrected reference lines 49–89 (including full line 80), T2-report.md corrective receipt, SKILL.md:43–49 and flow-contracts.md:8–12. Other previously reviewed content retains its prior assessment, not a fresh whole-package review.

## Finding disposition and AC status

**Resolved: marked-stale revoked-content disclosure.** Reference :60 now requires an immediate deny path independently of physical erasure; :62 denies reuse at every serving path even while bytes remain; :63 allows only non-sensitive pending-erasure status without record content, and freshness markers only for still-authorized content. Decision :73 and adverse invariant :80 agree. Report risk :67 no longer endorses returning unauthorized stale bytes. These clauses now agree with canonical current-authority requirements in SKILL.md:46 and flow-contracts.md:10.

Adverse timeline re-walk (semantic, not executable): principal authorized at t0; authority withdrawn at t1; stale index/cache/export survives until t2. Any request during (t1,t2) must withhold revoked content immediately. A response may expose non-sensitive deletion status without the record; labeling the old record stale is not allowed. At the propagation bound the derived bytes must be erased; :64/:80 preserve the no-resurrection fence for replay/restore. Still-authorized stale content remains a separate, legitimate freshness decision.

- **AC-ROI-05: PASS as canonical guidance.** Prior source-to-output authority coverage remains; the contradictory marked-content escape is removed.
- **AC-ROI-06: PASS as canonical guidance.** Immediate authorization denial and bounded asynchronous physical erasure are now separate; copy-level lifecycle and replay/restore fences remain explicit.

No new Blocker/Major found in the scoped correction.

## T3 source-qualified event-identity clarification

The originally reviewed T3 candidate defined CloudEvents source + id at reference :18 but keyed the inbox as consumer + event ID at :22. It suggested the correct interpretation, but did **not unambiguously exclude a reader implementing the literal bare id**. A bounded clarification was warranted: otherwise source A/id=42 can suppress source B/id=42 as a false duplicate, losing a legitimate distinct operation before business arbitration. This is delivery data loss, not duplicate-effect prevention.

Current `skills/system-design/system-design-integration-patterns/references/integration-patterns.md`, observed snapshot tag `984C`, already contains that clarification: :18 explicitly requires `(source, id)` or equivalent globally unique normalized identity and says never bare id; :22 uses consumer plus normalized delivery identity with required tenant/producer scope; :24 explicitly distinguishes same-pair redelivery from same bare id across different sources. **Current guidance clearly excludes literal cross-source id collisions; no further ambiguity repair needed for this point.** T3-report.md read during this rereview still held the older settled receipt, so this observation is not a new full-T3 hash-bound approval. Lead must bind the corrected T3 bytes to a fresh receipt; the historical T3 report remains valid only for its recorded candidate.

## Audit and limits

MCP compliance audit completed before this report. Applicable previously loaded rules remain common-code-review, common-security-audit, common-owasp, common-llm-security, common-security-standards and system-design-principles, plus file-routing skill-authoring rules. The generic Markdown/product-management audit warning remains outside this security-guidance scope.

No source edits, shell checks, builds/tests/lints/formatters/generators, model/eval calls, delegation or sealed-case inspection. Only this evidence report written. Semantic timeline review is not runtime proof; integrated checks, source-hash freshness, architecture review, separately authorized evaluation and human acceptance remain separate gates.
