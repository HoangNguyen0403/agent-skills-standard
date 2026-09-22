The mapping should be marked **needs-review** because it was copied from an old ATT&CK technique version. Do not silently reuse the technique ID or assume the relationship remains valid.

Assumption: no observation, evidence record, ATT&CK version, or source URL was supplied.

Review and update it as follows:

```text
framework: MITRE ATT&CK
framework_version: <version used for re-review>
stable_id: <current ATT&CK technique/sub-technique ID>
legacy_id: <copied old ID>
relation: unknown
rationale: The mapping was inherited from an older technique revision; current evidence has not yet been checked against the current official technique definition.
source: <exact official ATT&CK URL or document section>
review_status: needs-review
reviewer: <name>
review_date: <YYYY-MM-DD>

engagement_scope_ref: <scope reference>
skill_version: <mapping skill version>
observed_at: <timestamp>
finding_status: <status>
evidence_refs: [<observation/evidence IDs>]
limitations: <missing or inconclusive evidence>
accountable_owner: <owner>
```

Re-review steps:

1. Confirm the current ATT&CK framework version, stable technique ID, name, and exact official source.
2. Determine whether the old ID was deprecated, revoked, split, merged, or otherwise revised.
3. Tie the mapping to a specific evidence record and observed procedure; a keyword or catalog similarity is insufficient.
4. Select exactly one relation: `supports`, `describes`, `observed-as`, `partial`, `unknown`, or `conflicts`.
5. Preserve unmapped or uncertain cases explicitly as `unknown`; do not fabricate completeness.
6. Keep the mapping separate from control claims, measured efficacy, compliance assertions, or outcome certification.
7. Re-review again whenever the ATT&CK version or evidence source changes.

Until those checks are complete, retain the legacy mapping for provenance only and do not report it as current ATT&CK coverage.
