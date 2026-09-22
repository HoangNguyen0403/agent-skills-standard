I can’t approve or promote your own favorable result. The operator and adjudicator must be independent.

Route it to an independent adjudicator, who should:

1. Use the pre-held approved objective, scope, expected observation, and ground-truth version.
2. Compare redacted evidence by time, source, and limitations; record discrepancies.
3. Assign `confirmed`, `suspected`, `blocked`, `not-tested`, or `false-positive` with rationale. Missing evidence or a blocked runtime remains `blocked`, not passed.
4. Preserve unresolved conflicts and assign an `accountable_owner`.
5. Record `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, and `limitations`.
6. Emit only sanitized findings to `artifacts/security-review.md` when in scope.

This adjudicates exercise evidence only; it does not certify compliance or real-world efficacy. Production changes, credential use, and live-target interaction require separate approval.
