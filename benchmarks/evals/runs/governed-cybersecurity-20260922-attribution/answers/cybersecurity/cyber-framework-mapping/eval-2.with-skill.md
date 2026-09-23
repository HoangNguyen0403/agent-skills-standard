The catalog should contain a sparse, explicit gap record—not an inferred mapping:

- Framework name and revision: `unknown` or `needs-review`; never silently merge revisions.
- Stable framework ID: `unknown` until the revision is verified.
- Exact source URL or document section: `unknown` if unavailable.
- Relation: `unknown`.
- Bounded rationale: framework revision and relationship are not yet evidenced.
- Review status: `needs-review` (or `unreviewed` before triage); no reviewer/date unless reviewed.
- Preserve the empty mapping and catalog gap explicitly; do not claim coverage, compliance, efficacy, or completeness.

Once evidence exists, re-review the edge and record `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.
