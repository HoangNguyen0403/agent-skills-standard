---
name: cyber-exercise-adjudication
guardrail: true
description: Adjudicates authorized exercise outcomes against independently held ground truth, redacted evidence, and explicit status boundaries. Use when comparing observations, resolving discrepancies, or preparing evidence-led security-review handoffs.
metadata:
  labels: [cybersecurity, adjudication, white-team]
  triggers:
    keywords: [exercise adjudication, independent ground truth, outcome adjudication, evidence discrepancy, exercise finding status]
---
# Cyber Exercise Adjudication

## **Priority: P0 (CRITICAL)**

Compare evidence to pre-held expectations without self-approved promotion or compliance claims.

## Structure

```text
cyber-exercise-adjudication/
├── SKILL.md
├── references/adjudication-record.md
└── evals/evals.json
```

## Workflow

1. Confirm adjudicator independence from operator and evidence collector.
2. Load approved objective, scope, expected observation, and ground-truth version.
3. Compare redacted evidence by time, source, and limitation; record discrepancies.
4. Assign `confirmed`, `suspected`, `blocked`, `not-tested`, or `false-positive` only with rationale.
5. Preserve unresolved conflicts and route them to an accountable owner.
6. Emit sanitized findings to `artifacts/security-review.md` when that artifact is in scope.

## Rules

- Independent ground truth is held before observation review; do not rewrite it to fit results.
- A blocked runtime or missing evidence remains blocked, not passed.
- Adjudication describes exercise evidence; it does not certify compliance or measure real-world efficacy.
- Production changes, credential use, and live target interaction remain separately gated.
Adjudication records carry `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.

## Anti-Patterns

- **No operator grading**: Separate execution from adjudication.
- **No pass by silence**: Missing observation is not success.
- **No certainty inflation**: Keep suspected and not-tested statuses.
- **No raw leakage**: Redact before handoff.

## References

- [Adjudication record](references/adjudication-record.md)
- [Evidence fields](../cyber-evidence/references/evidence-record.md)
