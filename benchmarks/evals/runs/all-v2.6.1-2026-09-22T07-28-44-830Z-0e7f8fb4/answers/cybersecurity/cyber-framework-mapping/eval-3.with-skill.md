Assumption: the mapping contains an ATT&CK technique ID copied from an older catalog, but its ATT&CK version, evidence, and source are not provided.

Review result: **needs-review**. Do not reuse the old ID silently. Revalidate it against the intended ATT&CK version and record whether the relationship is `supports`, `describes`, `observed-as`, `partial`, `unknown`, or `conflicts`.

Use an edge record like:

```text
framework: MITRE ATT&CK
framework_version: <explicit ATT&CK version>
stable_id: <validated technique/sub-technique ID>
relation: unknown
rationale: Cannot establish a mapping from catalog similarity alone; requires an evidence record showing the observed procedure.
source: <exact official ATT&CK technique URL or document section>
review_status: needs-review
reviewer: <name or system>
reviewed_at: <date>
engagement_scope_ref: <scope reference>
skill_version: <mapping-skill version>
observed_at: <timestamp>
finding_status: <status>
evidence_refs: <observation or artifact references>
limitations: Old technique revision may have been deprecated, renamed, split, merged, or re-parented; mapping does not assert efficacy, coverage, compliance, or control effectiveness.
accountable_owner: <owner>
```

Required remediation:

1. Identify the original ATT&CK version and the target version.
2. Check the old ID in the official ATT&CK catalog and follow any deprecation, version, merge, split, or replacement metadata.
3. Preserve the old version-qualified edge; create a separate target-version edge rather than overwriting it.
4. Tie the new relation and rationale to concrete evidence, not a keyword or broad equivalence.
5. Mark unsupported or unresolved mappings explicitly as `unknown` or `needs-review`.
6. Re-review the edge whenever the ATT&CK version or evidence source changes.

This mapping must not be presented as a compliance claim, measured efficacy result, complete ATT&CK coverage statement, or proof that a control was implemented.
