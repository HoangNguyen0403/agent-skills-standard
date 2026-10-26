---
name: cyber-evidence
guardrail: true
description: Captures redacted, provenance-aware cybersecurity observations with shared status fields, independent ground truth, and honest limitations. Use when recording exercise evidence, findings, validation results, or security-review handoffs.
metadata:
  labels: [cybersecurity, evidence, provenance]
  triggers:
    keywords: [security evidence, evidence record, redacted evidence, finding status, ground truth, evidence gap]
---
# Cyber Evidence

## **Priority: P0 (CRITICAL)**

Record what was observed, how it was sourced, and what remains unknown; never turn absence of proof into proof.

## Structure

```text
cyber-evidence/
├── SKILL.md
├── references/evidence-record.md
└── evals/evals.json
```

## Workflow
1. Bind record to `engagement_scope_ref`, `skill_version`, and `source`.
2. Capture `observed_at`, observer, method, and evidence references; redact secrets and sensitive payloads.
3. For paired exercised-lab validation claims, attach optional `lab_validation` extension with transitive binding chain: `ObservationRecord.action_receipt_ref -> ActionReceipt.gate_ref -> GateDecision.request_ref -> ActionRequest`. Unpaired analysis uses the base record directly.
4. Set exactly one `finding_status`: `confirmed`, `suspected`, `blocked`, `not-tested`, or `false-positive`. Retain prior corroborated findings if a retest step blocks.
5. For paired defensive controls, set outcome: `blocked`, `prevented`, `detected`, `responded`, or `telemetry-gap`.
6. State limitations, missing controls, residual cleanup state, and accountable owner.
7. Update canonical `artifacts/security-review.md` when a continuous workflow chain owns it.
Base fields: `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, `accountable_owner`. Optional metadata: `observer`, `method`, `expected_observation`, `authorization_ref`, `redaction_note`, `independent_ground_truth_ref`.

## Rules
- Hashes and timestamps support provenance; they do not prove trusted origin or efficacy.
- Paired exercised-lab claims require complete transitive binding; ordinary source or supplied-evidence confirmation does not require host receipts.
- Retain corroborated confirmed or suspected findings across blocked retests; attempting a blocked retest never erases prior findings or forces them to not-tested (IR03).
- Default to `finding_status: not-tested` only when no supplied or exercised evidence exists (AC-CLV-11); `blocked` finding denotes an evidence-backed barrier, not a mechanical step-state copy.
- Failed reproduction does not prove vulnerability absence (AC-CLV-18); mark negative/insufficient, never `false-positive` without independent invalidating evidence.
- An exercised action without observation yields `telemetry-gap` (AC-CLV-12). An observation alone cannot prove an action occurred.
- Unverified or failed teardown must disclose `residual` or `unverified` state (AC-CLV-13); post-expiry teardown requires surviving authority.
- Correlation key `(run_id, attempt_id, test_id)` is immutable per attempt; conflicting or reused keys are rejected.
- Keep raw evidence separate from sanitized reports; never persist credentials, real secrets, or unnecessary personal data.
- Promotion requires independent review; an operator cannot approve their own result.
## Anti-Patterns

- **No scanner-only finding**: Corroborate tool output or mark suspected.
- **No invented certainty**: Use limitations and status fields.
- **No unredacted persistence**: Minimize and sanitize before storage.
- **No rewritten history**: Append corrections with provenance.

## References

- [Evidence record fields](references/evidence-record.md)
- [Canonical security review conventions](../../common/common-security-audit/references/trust-review-policy.md)
