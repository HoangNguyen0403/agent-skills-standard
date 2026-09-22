# Adjudication Record

```text
engagement_scope_ref: [approved reference]
ground_truth_ref: [independent version/hash]
evidence_refs: [redacted inputs]
observed_at: [UTC timestamp]
comparison: [expected vs observed, bounded]
finding_status: confirmed | suspected | blocked | not-tested | false-positive
limitations: [gaps and uncertainty]
accountable_owner: [role]
adjudicator: [independent role]
decision_rationale: [evidence-linked rationale]
```

Freeze ground truth before review. Keep disagreements unresolved until evidence or owner decision changes them. Emit sanitized conclusions to `artifacts/security-review.md` when the workflow chain uses it.
