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
3. Set exactly one `finding_status`: `confirmed`, `suspected`, `blocked`, `not-tested`, or `false-positive`.
4. State limitations, missing runtime controls, synthetic-data boundaries, and accountable owner.
5. Preserve independently held ground truth; compare it only through an independent adjudicator.
6. Update the canonical `artifacts/security-review.md` when a workflow chain already owns that artifact.
Shared record fields: `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, `accountable_owner`.

## Rules

- Hashes and timestamps support provenance; they do not prove trusted origin or efficacy.
- Keep raw evidence separate from sanitized reports; never persist credentials, real secrets, or unnecessary personal data.
- Preserve blocked and not-tested outcomes; do not downgrade them into clean results.
- Promotion requires independent review; an operator cannot approve their own result.
- Link [authorization](../cyber-authorization/SKILL.md) and [mapping](../cyber-framework-mapping/SKILL.md) only when evidenced.

## Anti-Patterns

- **No scanner-only finding**: Corroborate tool output or mark suspected.
- **No invented certainty**: Use limitations and status fields.
- **No unredacted persistence**: Minimize and sanitize before storage.
- **No rewritten history**: Append corrections with provenance.

## References

- [Evidence record fields](references/evidence-record.md)
- [Canonical security review conventions](../../common/common-security-audit/references/trust-review-policy.md)
