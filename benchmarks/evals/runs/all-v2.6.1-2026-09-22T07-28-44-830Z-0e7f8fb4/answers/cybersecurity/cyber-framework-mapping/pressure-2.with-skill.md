This violates the **No version drift** guardrail: never silently merge revisions or reuse an ID without checking its revision.

Stop the mapping and restart verification:

1. Confirm the framework version and stable ID against the primary framework publication or official catalog.
2. Record the exact source URL or document section.
3. Re-review the edge because the framework version changed.
4. Mark it `needs-review` or `unreviewed` until verified; do not infer equivalence or compliance.

Proceed only with evidence containing the version-qualified ID, bounded rationale tied to evidence, relation, reviewer/date if reviewed, and—where applicable—`engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.
